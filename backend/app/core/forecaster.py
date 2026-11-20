"""Point forecaster training, thin-data guard, and persistence matching design.md §5."""
import json
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, Union
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sqlmodel import Session

from backend.app.config import settings
from backend.app.core.features import (
    FEATURE_COLUMNS,
    FEATURE_VERSION,
    build_features_from_db,
    season_based_split,
)
from backend.app.models.entities import ModelRun

class SeasonalMeanBaselineModel:
    """Fallback point model for thin data regimes."""
    def __init__(self, mean_yield_per_ha: float):
        self.mean_yield_per_ha = mean_yield_per_ha
        self.is_baseline = True

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        area_col = "area_sown_ha" if "area_sown_ha" in X.columns else "area_ha"
        areas = X[area_col].values if area_col in X.columns else np.ones(len(X))
        return areas * self.mean_yield_per_ha

def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred)) if len(y_true) > 1 else 0.0
    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "r2": round(r2, 4),
    }

def train_forecaster_for_crop(
    crop: str,
    session: Session,
    seed: int = 42,
    artifacts_dir: Optional[Path] = None,
) -> Tuple[Any, ModelRun, bool]:
    """Train a point forecaster for a single crop, applying thin data guards."""
    if artifacts_dir is None:
        artifacts_dir = Path("artifacts")
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    df_crop = build_features_from_db(session, crop=crop)
    if df_crop.empty:
        raise ValueError(f"No records found for crop '{crop}'")

    df_train, df_calib, df_backtest = season_based_split(df_crop)

    is_thin_data = (
        len(df_train) < settings.MIN_TRAIN_ROWS
        or len(df_calib) < settings.MIN_CALIBRATION_SIZE
    )

    X_train = df_train[FEATURE_COLUMNS]
    y_train = df_train["target_kg"].values

    if is_thin_data or len(y_train) < 5:
        # Fallback to seasonal-mean baseline
        yield_per_ha = (
            df_train["target_kg"] / df_train["area_sown_ha"].clip(lower=0.1)
        ).mean()
        if pd.isna(yield_per_ha) or yield_per_ha <= 0:
            yield_per_ha = 15000.0  # conservative baseline default
        model = SeasonalMeanBaselineModel(mean_yield_per_ha=float(yield_per_ha))
        model_type = "seasonal_mean_baseline"
    else:
        try:
            model = GradientBoostingRegressor(
                n_estimators=100,
                max_depth=3,
                learning_rate=0.08,
                random_state=seed,
            )
            model.fit(X_train, y_train)
            model_type = "gbr"
        except Exception:
            model = Ridge(alpha=1.0)
            model.fit(X_train, y_train)
            model_type = "ridge"

    # Evaluate on calibration or train set
    eval_df = df_calib if not df_calib.empty else df_train
    y_eval = eval_df["target_kg"].values
    y_pred = model.predict(eval_df[FEATURE_COLUMNS])
    metrics = compute_metrics(y_eval, y_pred)
    metrics["model_type"] = model_type
    metrics["train_rows"] = len(df_train)
    metrics["calib_rows"] = len(df_calib)
    metrics["is_thin_data"] = is_thin_data

    # Persist artifact
    version = f"{crop}-{model_type}-v1"
    artifact_path = artifacts_dir / f"{crop}_model_{version}.joblib"
    joblib.dump(model, artifact_path)

    # Persist model_run record
    run_id = f"RUN-{crop.upper()}-{version}"
    model_run = session.get(ModelRun, run_id)
    if not model_run:
        model_run = ModelRun(
            id=run_id,
            crop=crop,
            version=version,
            features_json=json.dumps(FEATURE_COLUMNS),
            metrics_json=json.dumps(metrics),
            artifact_path=str(artifact_path),
        )
    else:
        model_run.features_json = json.dumps(FEATURE_COLUMNS)
        model_run.metrics_json = json.dumps(metrics)
        model_run.artifact_path = str(artifact_path)

    session.add(model_run)
    session.commit()
    session.refresh(model_run)

    return model, model_run, is_thin_data
