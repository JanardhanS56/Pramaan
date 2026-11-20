"""Model training, calibration, and seed generation API endpoints."""
import json
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
import numpy as np
import joblib

from backend.app.core.audit import log_audit_event
from backend.app.core.conformal import calibrate_model
from backend.app.core.features import (
    FEATURE_COLUMNS,
    build_features_from_db,
    season_based_split,
)
from backend.app.core.forecaster import train_forecaster_for_crop
from backend.app.db import get_session
from backend.app.models.entities import ModelRun, CalibrationRun
from backend.app.schemas.suggestions import CalibrateRequest, TrainRequest
from backend.app.seed.generator import generate_dataset, save_dataset_to_csv

router = APIRouter(tags=["pipeline"])

@router.post("/train")
def train_model(
    req: TrainRequest,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Train yield forecaster for a specified crop."""
    try:
        model, model_run, is_thin = train_forecaster_for_crop(
            crop=req.crop, session=session, seed=req.seed or 42
        )
        metrics = json.loads(model_run.metrics_json) if model_run.metrics_json else {}

        log_audit_event(
            session=session,
            entity="model_run",
            entity_id=model_run.id,
            event="model_trained",
            payload={
                "crop": req.crop,
                "version": model_run.version,
                "is_thin_data": is_thin,
                "metrics": metrics,
            },
        )

        return {
            "status": "ok",
            "model_run_id": model_run.id,
            "crop": model_run.crop,
            "version": model_run.version,
            "is_thin_data": is_thin,
            "metrics": metrics,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "TRAIN_FAILED", "message": str(e)}},
        )

@router.post("/calibrate")
def run_calibration(
    req: CalibrateRequest,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Run split-conformal calibration for a crop at nominal confidence."""
    crop = req.crop
    alpha = round(1.0 - (req.nominal_confidence or 0.80), 2)

    model_runs = session.exec(
        select(ModelRun).where(ModelRun.crop == crop).order_by(ModelRun.trained_at.desc())
    ).all()
    if not model_runs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "MODEL_NOT_FOUND", "message": f"No model found for crop '{crop}'. Train first."}},
        )
    latest_run = model_runs[0]
    model = joblib.load(latest_run.artifact_path)

    df_crop = build_features_from_db(session, crop=crop)
    df_train, df_calib, df_backtest = season_based_split(df_crop)
    if df_calib.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INSUFFICIENT_DATA", "message": f"No calibration data available for '{crop}'"}},
        )

    preds_calib = model.predict(df_calib[FEATURE_COLUMNS])
    y_calib = df_calib["target_kg"].values
    residuals_calib = y_calib - preds_calib

    calib_run = calibrate_model(
        model_run_id=latest_run.id,
        crop=crop,
        residuals=residuals_calib,
        session=session,
        alpha=alpha,
    )

    log_audit_event(
        session=session,
        entity="calibration_run",
        entity_id=calib_run.id,
        event="conformal_calibrated",
        payload={
            "crop": crop,
            "alpha": alpha,
            "calib_size": calib_run.calib_size,
            "q_lower": calib_run.q_lower,
            "q_upper": calib_run.q_upper,
        },
    )

    return {
        "status": "ok",
        "calibration_id": calib_run.id,
        "crop": calib_run.crop,
        "alpha": calib_run.alpha,
        "nominal_confidence": round(1.0 - calib_run.alpha, 2),
        "calib_size": calib_run.calib_size,
        "q_lower": calib_run.q_lower,
        "q_upper": calib_run.q_upper,
    }

@router.post("/seed/generate")
def generate_synthetic_seed(
    seed: int = 42,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Generate deterministic synthetic datasets."""
    from pathlib import Path
    data_dir = Path("data/synthetic")
    dataset = generate_dataset(seed=seed)
    save_dataset_to_csv(dataset, data_dir)

    log_audit_event(
        session=session,
        entity="seed",
        entity_id=str(seed),
        event="seed_generated",
        payload={"seed": seed, "tables": list(dataset.keys())},
    )

    return {"status": "ok", "seed": seed, "tables_generated": len(dataset)}
