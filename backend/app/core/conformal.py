"""Asymmetric split-conformal calibration module matching design.md §6."""
import json
import math
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sqlmodel import Session

from backend.app.config import settings
from backend.app.models.entities import CalibrationRun

def compute_asymmetric_quantiles(
    residuals: np.ndarray, alpha: float
) -> Tuple[float, float]:
    """Compute asymmetric residual quantiles for nominal coverage 1 - alpha.

    Algorithm (design.md §6):
      r_i = y_i - f(x_i)
      alpha_tail = alpha / 2
      k_low  = floor((n + 1) * alpha_tail)
      k_high = ceil((n + 1) * (1 - alpha_tail))
      q_low  = sorted(r)[k_low]
      q_high = sorted(r)[k_high]
    """
    n = len(residuals)
    if n == 0:
        raise ValueError("Residuals array cannot be empty")

    sorted_r = np.sort(residuals)
    alpha_tail = alpha / 2.0

    # 1-indexed formula mapped to 0-indexed array with boundary protection
    k_low_1based = int(math.floor((n + 1) * alpha_tail))
    k_high_1based = int(math.ceil((n + 1) * (1 - alpha_tail)))

    # Convert to 0-indexed
    idx_low = max(0, min(k_low_1based - 1, n - 1))
    idx_high = max(0, min(k_high_1based - 1, n - 1))

    q_low = float(sorted_r[idx_low])
    q_high = float(sorted_r[idx_high])

    return q_low, q_high

def predict_interval(
    point_pred: float, q_low: float, q_high: float
) -> Tuple[float, float, bool]:
    """Calculate calibrated lower and upper intervals and check low_information flag."""
    lower = max(0.0, point_pred + q_low)
    upper = max(lower, point_pred + q_high)

    is_low_info = (upper - lower) > (settings.LOW_INFORMATION_RATIO * max(point_pred, 1.0))
    return round(lower, 2), round(upper, 2), is_low_info

def compute_shortfall_risk(
    point_pred: float, residuals: np.ndarray, contract_quantity: float
) -> float:
    """Compute P(Y < Q) using empirical predictive distribution CDF: {f(x) + r_i}."""
    if len(residuals) == 0:
        return 0.5
    predictive_distribution = point_pred + residuals
    risk = float(np.mean(predictive_distribution < contract_quantity))
    return round(float(np.clip(risk, 0.0, 1.0)), 4)

def calibrate_model(
    model_run_id: str,
    crop: str,
    residuals: np.ndarray,
    session: Session,
    alpha: float = 0.20,
) -> CalibrationRun:
    """Run conformal calibration on residuals and persist CalibrationRun."""
    q_low, q_high = compute_asymmetric_quantiles(residuals, alpha=alpha)
    calib_size = len(residuals)
    confidence = round(1.0 - alpha, 2)
    conf_pct = int(round(confidence * 100))

    calib_id = f"CALIB-{crop.upper()}-{conf_pct}-{model_run_id[-6:]}"
    calib_run = session.get(CalibrationRun, calib_id)
    if not calib_run:
        calib_run = CalibrationRun(
            id=calib_id,
            model_run_id=model_run_id,
            crop=crop,
            method="asymmetric_split_conformal",
            alpha=alpha,
            calib_size=calib_size,
            q_lower=round(q_low, 2),
            q_upper=round(q_high, 2),
            coverage_json=json.dumps({"nominal": confidence, "q_low": q_low, "q_high": q_high}),
        )
    else:
        calib_run.alpha = alpha
        calib_run.calib_size = calib_size
        calib_run.q_lower = round(q_low, 2)
        calib_run.q_upper = round(q_high, 2)
        calib_run.coverage_json = json.dumps({"nominal": confidence, "q_low": q_low, "q_high": q_high})

    session.add(calib_run)
    session.commit()
    session.refresh(calib_run)
    return calib_run
