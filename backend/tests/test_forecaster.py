"""Tests for feature extraction and forecaster matching AC3."""
import json
from pathlib import Path
import pandas as pd
import pytest
from sqlmodel import Session, create_engine
from sqlalchemy.pool import StaticPool

from backend.app.config import settings
from backend.app.core.features import (
    FEATURE_COLUMNS,
    FEATURE_VERSION,
    build_features_from_db,
    season_based_split,
)
from backend.app.core.forecaster import (
    train_forecaster_for_crop,
    SeasonalMeanBaselineModel,
)
from backend.app.core.ingest import load_validated_csv
from backend.app.db import init_db
from backend.app.models.entities import ModelRun

@pytest.fixture
def populated_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    init_db(engine)

    # Ingest synthetic data into this in-memory DB
    synthetic_dir = Path(__file__).resolve().parents[2] / "data" / "synthetic"
    order = ["farmers", "plots", "sowing", "harvest", "signals", "contracts", "deliveries"]

    with Session(engine) as session:
        for file_type in order:
            df = pd.read_csv(synthetic_dir / f"{file_type}.csv")
            load_validated_csv(file_type, df, session)

    return engine

def test_features_and_split(populated_db):
    with Session(populated_db) as session:
        df_onion = build_features_from_db(session, crop="onion")
        assert not df_onion.empty
        assert "target_kg" in df_onion.columns
        for col in FEATURE_COLUMNS:
            assert col in df_onion.columns, f"Missing feature column {col}"

        df_train, df_calib, df_backtest = season_based_split(df_onion)
        assert len(df_train) > 0
        assert len(df_calib) > 0
        assert len(df_backtest) > 0

        # Verify no season leakage across splits
        train_seasons = set(df_train["season"].unique())
        calib_seasons = set(df_calib["season"].unique())
        backtest_seasons = set(df_backtest["season"].unique())
        assert train_seasons.isdisjoint(calib_seasons)
        assert calib_seasons.isdisjoint(backtest_seasons)

def test_forecaster_training_and_reproducibility_ac3(populated_db, tmp_path):
    with Session(populated_db) as session:
        model1, run1, is_thin1 = train_forecaster_for_crop(
            crop="onion", session=session, seed=42, artifacts_dir=tmp_path
        )
        assert Path(run1.artifact_path).is_file()

        # Re-run with same seed
        model2, run2, is_thin2 = train_forecaster_for_crop(
            crop="onion", session=session, seed=42, artifacts_dir=tmp_path
        )

        metrics1 = json.loads(run1.metrics_json)
        metrics2 = json.loads(run2.metrics_json)

        # Reproducibility check
        assert metrics1["mae"] == metrics2["mae"]
        assert metrics1["rmse"] == metrics2["rmse"]
        assert metrics1["r2"] == metrics2["r2"]

        # Features frozen check
        saved_features = json.loads(run1.features_json)
        assert saved_features == FEATURE_COLUMNS

def test_thin_data_guard_fallback_ac3(tmp_path):
    # Create empty DB with only 10 rows (less than MIN_CALIBRATION_SIZE=30)
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    init_db(engine)

    # Ingest synthetic data but artificially slice harvest to 10 rows
    synthetic_dir = Path(__file__).resolve().parents[2] / "data" / "synthetic"
    order = ["farmers", "plots", "sowing"]

    with Session(engine) as session:
        for file_type in order:
            df = pd.read_csv(synthetic_dir / f"{file_type}.csv")
            load_validated_csv(file_type, df, session)

        # Ingest only 10 harvest records
        df_harvest = pd.read_csv(synthetic_dir / "harvest.csv").head(10)
        load_validated_csv("harvest", df_harvest, session)

        # Train with thin data
        model, run, is_thin = train_forecaster_for_crop(
            crop="onion", session=session, seed=42, artifacts_dir=tmp_path
        )
        assert is_thin is True
        assert isinstance(model, SeasonalMeanBaselineModel)
        metrics = json.loads(run.metrics_json)
        assert metrics["is_thin_data"] is True
        assert metrics["model_type"] == "seasonal_mean_baseline"
