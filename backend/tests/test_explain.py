"""Tests for driver explanation layer and AC7 anti-hallucination rules."""
import re
from pathlib import Path
import pandas as pd
import pytest
from sqlmodel import Session, create_engine
from sqlalchemy.pool import StaticPool

from backend.app.core.explain import (
    DriverItem,
    generate_drivers_for_contract,
    compute_feature_importances,
)
from backend.app.core.forecaster import train_forecaster_for_crop
from backend.app.core.ingest import load_validated_csv
from backend.app.db import init_db

@pytest.fixture
def populated_session(tmp_path):
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    init_db(engine)

    synthetic_dir = Path(__file__).resolve().parents[2] / "data" / "synthetic"
    order = ["farmers", "plots", "sowing", "harvest", "signals", "contracts", "deliveries"]

    with Session(engine) as session:
        for file_type in order:
            df = pd.read_csv(synthetic_dir / f"{file_type}.csv")
            load_validated_csv(file_type, df, session)

        train_forecaster_for_crop("onion", session=session, artifacts_dir=tmp_path)
        yield session

def test_explain_drivers_ac7(populated_session):
    """AC7: Every card returns 2-3 drivers with label and direction,

    and no driver expresses a fabricated precise contribution in tonnes.
    """
    drivers = generate_drivers_for_contract("CTR-2025-07", session=populated_session)

    # 1. Quantity check: 2 to 3 drivers
    assert 2 <= len(drivers) <= 3, f"Expected 2-3 drivers, got {len(drivers)}"

    # Regex detecting fabricated tonne contribution claims like "contributed 4.2 t" or "4.2 tonnes added"
    forbidden_pattern = re.compile(r"(\b\d+(\.\d+)?\s*(t|tonnes|tons)\b.*(contribut|reduc|increas|yield|shortfall))|(contribut.*?\b\d+(\.\d+)?\s*(t|tonnes|tons)\b)", re.IGNORECASE)

    for d in drivers:
        # 2. Structure check
        assert isinstance(d.label, str) and len(d.label) > 10
        assert d.direction in {"positive", "negative", "neutral"}

        # 3. Anti-hallucination check
        assert not forbidden_pattern.search(d.label), f"Driver contains fabricated tonne contribution: '{d.label}'"

def test_permutation_importance_calculation():
    from sklearn.ensemble import GradientBoostingRegressor
    import numpy as np

    X = pd.DataFrame({"a": np.arange(20), "b": np.arange(20) * 2})
    y = np.arange(20) * 3
    model = GradientBoostingRegressor(random_state=42).fit(X, y)

    importances = compute_feature_importances(model, X, y)
    assert "a" in importances
    assert "b" in importances
    assert isinstance(importances["b"], float)
