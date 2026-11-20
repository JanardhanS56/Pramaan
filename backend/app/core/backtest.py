"""Backtest evaluation on held-out data matching design.md §7."""
import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sqlmodel import Session, select
import joblib

from backend.app.config import settings
from backend.app.core.conformal import compute_asymmetric_quantiles, calibrate_model
from backend.app.core.features import (
    FEATURE_COLUMNS,
    build_features_from_db,
    season_based_split,
)
from backend.app.models.entities import ModelRun, CalibrationRun

@dataclass
class BacktestLevelMetrics:
    nominal: float
    empirical_coverage: float
    passed: bool
    q_low: float
    q_high: float
    mean_width: float
    winkler_score: float

@dataclass
class BacktestReport:
    crop: str
    held_out_season: str
    calib_size: int
    test_size: int
    gate_status: str  # OPEN or CLOSED
    metrics_80: BacktestLevelMetrics
    metrics_90: BacktestLevelMetrics
    stratum_coverage: Dict[str, float]
    stratum_passed: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            "crop": self.crop,
            "held_out_season": self.held_out_season,
            "calib_size": self.calib_size,
            "test_size": self.test_size,
            "gate_status": self.gate_status,
            "nominal_80": {
                "nominal": self.metrics_80.nominal,
                "empirical_coverage": self.metrics_80.empirical_coverage,
                "passed": self.metrics_80.passed,
                "mean_width": self.metrics_80.mean_width,
                "winkler_score": self.metrics_80.winkler_score,
            },
            "nominal_90": {
                "nominal": self.metrics_90.nominal,
                "empirical_coverage": self.metrics_90.empirical_coverage,
                "passed": self.metrics_90.passed,
                "mean_width": self.metrics_90.mean_width,
                "winkler_score": self.metrics_90.winkler_score,
            },
            "stratum_coverage": self.stratum_coverage,
            "stratum_passed": self.stratum_passed,
        }

    def format_cli_output(self) -> str:
        s80 = "PASS" if self.metrics_80.passed else "FAIL"
        s90 = "PASS" if self.metrics_90.passed else "FAIL"
        strat_s = "PASS" if self.stratum_passed else "FAIL"

        lines = [
            f"SETU COVERAGE BACKTEST — crop: {self.crop}",
            f"Held-out seasons: {self.held_out_season}",
            f"Calibration set size: {self.calib_size}",
            "",
            f"Nominal 0.80 → Empirical coverage {self.metrics_80.empirical_coverage:.2f}   [{s80}, tolerance ±{settings.BACKTEST_GATE_TOLERANCE:.2f}]",
            f"Nominal 0.90 → Empirical coverage {self.metrics_90.empirical_coverage:.2f}   [{s90}, tolerance ±{settings.BACKTEST_GATE_TOLERANCE:.2f}]",
            "",
            f"Mean interval width : {self.metrics_80.mean_width / 1000.0:.1f} t",
            f"Winkler score       : {self.metrics_80.winkler_score / 1000.0:.1f}  (lower is better; track across versions)",
            f"Coverage by stratum : low {self.stratum_coverage.get('low', 0):.2f} | mid {self.stratum_coverage.get('mid', 0):.2f} | high {self.stratum_coverage.get('high', 0):.2f}   [{strat_s}]",
            "",
            f"GATE STATUS: {self.gate_status} — "
            + (
                f"suggestions may be served for '{self.crop}'."
                if self.gate_status == "OPEN"
                else f"coverage outside tolerance; suggestions blocked for '{self.crop}'."
            ),
        ]
        return "\n".join(lines)

def compute_winkler_score(
    y_true: np.ndarray, lower: np.ndarray, upper: np.ndarray, alpha: float
) -> float:
    """Compute mean Winkler score across points for nominal coverage 1 - alpha."""
    width = upper - lower
    under = np.maximum(0.0, lower - y_true)
    over = np.maximum(0.0, y_true - upper)
    penalties = width + (2.0 / alpha) * under + (2.0 / alpha) * over
    return float(np.mean(penalties))

def evaluate_conformal_level(
    residuals_calib: np.ndarray,
    residuals_test: np.ndarray,
    y_test: np.ndarray,
    point_test: np.ndarray,
    alpha: float,
) -> BacktestLevelMetrics:
    nominal = round(1.0 - alpha, 2)
    q_low, q_high = compute_asymmetric_quantiles(residuals_calib, alpha=alpha)

    lower = point_test + q_low
    upper = point_test + q_high

    covered = (y_test >= lower) & (y_test <= upper)
    emp_cov = float(np.mean(covered))

    passed = abs(emp_cov - nominal) <= settings.BACKTEST_GATE_TOLERANCE
    mean_width = float(np.mean(upper - lower))
    winkler = compute_winkler_score(y_test, lower, upper, alpha=alpha)

    return BacktestLevelMetrics(
        nominal=nominal,
        empirical_coverage=round(emp_cov, 4),
        passed=passed,
        q_low=round(q_low, 2),
        q_high=round(q_high, 2),
        mean_width=round(mean_width, 2),
        winkler_score=round(winkler, 2),
    )

def run_backtest_for_crop(crop: str, session: Session) -> BacktestReport:
    """Execute backtest evaluation strictly on held-out season data."""
    # Find latest ModelRun for this crop
    model_runs = session.exec(
        select(ModelRun).where(ModelRun.crop == crop).order_by(ModelRun.trained_at.desc())
    ).all()
    if not model_runs:
        raise ValueError(f"No trained model found for crop '{crop}'. Run train first.")
    latest_run = model_runs[0]

    # Load model artifact
    model = joblib.load(latest_run.artifact_path)

    # Get features and split by season
    df_crop = build_features_from_db(session, crop=crop)
    df_train, df_calib, df_backtest = season_based_split(df_crop)

    if df_calib.empty or df_backtest.empty:
        raise ValueError(f"Insufficient seasons for backtesting '{crop}'")

    held_out_season = ", ".join(sorted(df_backtest["season"].unique()))

    # Calculate residuals on calibration set
    pred_calib = model.predict(df_calib[FEATURE_COLUMNS])
    y_calib = df_calib["target_kg"].values
    residuals_calib = y_calib - pred_calib

    # Persist calibration runs for primary (0.80) and secondary (0.90) levels
    calibrate_model(latest_run.id, crop, residuals_calib, session, alpha=0.20)
    calibrate_model(latest_run.id, crop, residuals_calib, session, alpha=0.10)

    # Calculate predictions on held-out test set
    pred_test = model.predict(df_backtest[FEATURE_COLUMNS])
    y_test = df_backtest["target_kg"].values
    residuals_test = y_test - pred_test

    metrics_80 = evaluate_conformal_level(residuals_calib, residuals_test, y_test, pred_test, alpha=0.20)
    metrics_90 = evaluate_conformal_level(residuals_calib, residuals_test, y_test, pred_test, alpha=0.10)

    # Coverage by stratum (low, mid, high yield terciles on held-out actuals)
    terciles = np.percentile(y_test, [33.33, 66.67])
    low_mask = y_test <= terciles[0]
    mid_mask = (y_test > terciles[0]) & (y_test <= terciles[1])
    high_mask = y_test > terciles[1]

    q_low_80, q_high_80 = metrics_80.q_low, metrics_80.q_high
    covered_80 = (residuals_test >= q_low_80) & (residuals_test <= q_high_80)

    strat_cov = {
        "low": round(float(np.mean(covered_80[low_mask])) if np.any(low_mask) else 0.80, 2),
        "mid": round(float(np.mean(covered_80[mid_mask])) if np.any(mid_mask) else 0.80, 2),
        "high": round(float(np.mean(covered_80[high_mask])) if np.any(high_mask) else 0.80, 2),
    }

    # Pass condition: no stratum below nominal - 0.15 (i.e. 0.80 - 0.15 = 0.65)
    strat_passed = all(cov >= (0.80 - 0.15) for cov in strat_cov.values())

    # Gate status: OPEN if nominal 0.80 passes tolerance (±0.05)
    gate_status = "OPEN" if metrics_80.passed else "CLOSED"

    return BacktestReport(
        crop=crop,
        held_out_season=held_out_season,
        calib_size=len(df_calib),
        test_size=len(df_backtest),
        gate_status=gate_status,
        metrics_80=metrics_80,
        metrics_90=metrics_90,
        stratum_coverage=strat_cov,
        stratum_passed=strat_passed,
    )
