"""Tests for coverage backtest and gate enforcement matching AC5."""
from pathlib import Path
import pandas as pd
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine
from sqlalchemy.pool import StaticPool

from backend.app.config import settings
from backend.app.core.backtest import (
    BacktestLevelMetrics,
    BacktestReport,
    run_backtest_for_crop,
)
from backend.app.api.backtest import (
    assert_backtest_gate_open,
    _BACKTEST_CACHE,
)
from backend.app.core.forecaster import train_forecaster_for_crop
from backend.app.core.ingest import load_validated_csv
from backend.app.db import get_session, init_db
from backend.app.main import app

@pytest.fixture
def trained_db(tmp_path):
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

    return engine

def test_backtest_execution_and_format(trained_db):
    with Session(trained_db) as session:
        report = run_backtest_for_crop("onion", session=session)
        assert report.crop == "onion"
        assert report.calib_size > 0
        assert report.test_size > 0
        assert 0.0 <= report.metrics_80.empirical_coverage <= 1.0
        assert report.metrics_80.winkler_score > 0
        assert "low" in report.stratum_coverage
        assert "mid" in report.stratum_coverage
        assert "high" in report.stratum_coverage

        cli_output = report.format_cli_output()
        assert "SETU COVERAGE BACKTEST — crop: onion" in cli_output
        assert "Nominal 0.80 → Empirical coverage" in cli_output
        assert "GATE STATUS:" in cli_output

def test_backtest_gate_refusal_ac5():
    """AC5: Given a crop whose backtest empirical coverage is 0.66 at nominal 0.80,

    when suggestions are requested, then the API returns 409 BACKTEST_GATE_CLOSED.
    """
    # Create a failing mock report
    failing_report = BacktestReport(
        crop="onion",
        held_out_season="2024-KH",
        calib_size=64,
        test_size=64,
        gate_status="CLOSED",
        metrics_80=BacktestLevelMetrics(
            nominal=0.80,
            empirical_coverage=0.66,
            passed=False,
            q_low=-5000.0,
            q_high=5000.0,
            mean_width=10000.0,
            winkler_score=15000.0,
        ),
        metrics_90=BacktestLevelMetrics(
            nominal=0.90,
            empirical_coverage=0.72,
            passed=False,
            q_low=-8000.0,
            q_high=8000.0,
            mean_width=16000.0,
            winkler_score=22000.0,
        ),
        stratum_coverage={"low": 0.60, "mid": 0.68, "high": 0.70},
        stratum_passed=False,
    )

    _BACKTEST_CACHE["onion"] = failing_report

    # Test gate assertion raises HTTP 409
    with pytest.raises(HTTPException) as exc_info:
        assert_backtest_gate_open("onion", session=None)

    assert exc_info.value.status_code == 409
    err = exc_info.value.detail["error"]
    assert err["code"] == "BACKTEST_GATE_CLOSED"
    assert "Calibration for 'onion' failed coverage tolerance" in err["message"]
    assert err["details"]["nominal"] == 0.80
    assert err["details"]["empirical"] == 0.66
    assert err["details"]["tolerance"] == 0.05

def test_backtest_api_endpoints(trained_db):
    def get_test_session():
        with Session(trained_db) as s:
            yield s

    app.dependency_overrides[get_session] = get_test_session
    client = TestClient(app)

    # 1. Trigger backtest
    res = client.post("/backtest", json={"crop": "onion"})
    assert res.status_code == 200
    data = res.json()
    assert data["crop"] == "onion"
    assert "nominal_80" in data

    # 2. Get backtest
    res_get = client.get("/backtest/onion")
    assert res_get.status_code == 200
    assert res_get.json()["crop"] == "onion"

    # 3. Get health
    res_health = client.get("/health/model/onion")
    assert res_health.status_code == 200
    health = res_health.json()
    assert health["crop"] == "onion"
    assert "empirical_coverage_80" in health
    assert "gate_status" in health

    app.dependency_overrides.clear()
    _BACKTEST_CACHE.clear()
