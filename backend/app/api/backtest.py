"""API routes for backtest reports and model health checks."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.app.config import settings
from backend.app.core.backtest import run_backtest_for_crop, BacktestReport
from backend.app.db import get_session
from backend.app.models.entities import ModelRun, CalibrationRun

router = APIRouter(tags=["backtest"])

# In-memory cached latest backtests
_BACKTEST_CACHE = {}

def get_crop_backtest_report(crop: str, session: Session) -> BacktestReport:
    crop_lower = crop.lower()
    if crop_lower not in _BACKTEST_CACHE:
        report = run_backtest_for_crop(crop_lower, session)
        _BACKTEST_CACHE[crop_lower] = report
    return _BACKTEST_CACHE[crop_lower]

def assert_backtest_gate_open(crop: str, session: Session) -> BacktestReport:
    """Enforces non-negotiable backtest gate (AC5). Raises HTTP 409 if closed."""
    report = get_crop_backtest_report(crop, session)
    if report.gate_status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "BACKTEST_GATE_CLOSED",
                    "message": f"Calibration for '{crop}' failed coverage tolerance. Re-calibrate before serving suggestions.",
                    "details": {
                        "nominal": report.metrics_80.nominal,
                        "empirical": report.metrics_80.empirical_coverage,
                        "tolerance": settings.BACKTEST_GATE_TOLERANCE,
                    },
                }
            },
        )
    return report

class BacktestRequest(BaseModel):
    crop: str

@router.post("/backtest")
def trigger_backtest(req: BacktestRequest, session: Session = Depends(get_session)):
    report = run_backtest_for_crop(req.crop.lower(), session)
    _BACKTEST_CACHE[req.crop.lower()] = report
    return report.to_dict()

@router.get("/backtest/{crop}")
def get_backtest_report(crop: str, session: Session = Depends(get_session)):
    try:
        report = get_crop_backtest_report(crop, session)
        return report.to_dict()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "BACKTEST_NOT_FOUND", "message": str(e)}},
        )

@router.get("/health/model/{crop}")
def get_model_health(crop: str, session: Session = Depends(get_session)):
    crop_lower = crop.lower()
    try:
        report = get_crop_backtest_report(crop_lower, session)
        model_runs = session.exec(
            select(ModelRun).where(ModelRun.crop == crop_lower).order_by(ModelRun.trained_at.desc())
        ).all()
        model_version = model_runs[0].version if model_runs else "unknown"

        return {
            "crop": crop_lower,
            "model_version": model_version,
            "calibration_size": report.calib_size,
            "empirical_coverage_80": report.metrics_80.empirical_coverage,
            "empirical_coverage_90": report.metrics_90.empirical_coverage,
            "gate_status": report.gate_status,
            "stratum_passed": report.stratum_passed,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "HEALTH_CHECK_FAILED", "message": str(e)}},
        )
