"""Tests for API suggestions, decision human gate, and immutable audit trail (AC8)."""
import json
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from backend.app.config import settings
from backend.app.core.audit import compute_input_hash, log_audit_event
from backend.app.db import get_session
from backend.app.main import app
from backend.app.models.entities import (
    AuditEvent,
    CalibrationRun,
    Contract,
    DecisionLog,
    FPO,
    ModelRun,
    Suggestion,
)

@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        # Seed FPO, Contract, ModelRun, CalibrationRun
        fpo = FPO(id="FPO-001", name="Sahyadri Farmer Producer Co", state="Maharashtra")
        session.add(fpo)

        c1 = Contract(
            id="CTR-2025-07",
            fpo_id="FPO-001",
            buyer_name="Reliance Retail Agri",
            crop="onion",
            grade="A",
            quantity_t=100.0,  # 100 t
            due_date=datetime(2025, 4, 15, tzinfo=timezone.utc).date(),
            penalty_per_t=1500.0,
            status="OPEN",
        )
        c2 = Contract(
            id="CTR-2025-08",
            fpo_id="FPO-001",
            buyer_name="Sahyadri Processors",
            crop="tomato",
            grade="B",
            quantity_t=60.0,   # 60 t
            due_date=datetime(2025, 4, 20, tzinfo=timezone.utc).date(),
            penalty_per_t=1000.0,
            status="OPEN",
        )
        session.add(c1)
        session.add(c2)

        mr = ModelRun(
            id="RUN-ONION-onion-gbr-v3",
            crop="onion",
            version="onion-gbr-v3",
            features_json=json.dumps(["area_sown_ha", "sowing_week"]),
            metrics_json=json.dumps({"rmse": 120.0, "mae": 90.0}),
            artifact_path="artifacts/onion_model.joblib",
        )
        session.add(mr)

        calib = CalibrationRun(
            id="CALIB-ONION-80-v3",
            model_run_id=mr.id,
            crop="onion",
            method="asymmetric_split_conformal",
            alpha=0.20,
            calib_size=64,
            q_lower=-7.8,
            q_upper=7.9,
            coverage_json=json.dumps({"nominal": 0.80, "empirical_coverage": 0.81}),
        )
        session.add(calib)

        # Pre-seed one AMBER suggestion and one GREEN suggestion
        s_amber = Suggestion(
            id="SUG-2025-11-014",
            contract_id="CTR-2025-07",
            calibration_run_id=calib.id,
            confidence=0.80,
            lower_t=72.4,
            upper_t=88.1,
            point_t=80.2,
            shortfall_risk=0.91,
            status="AMBER",
            recommended_t=72.4,
            drivers_json=json.dumps([
                {"label": "3 of 12 member plots show NDVI below seasonal mean", "direction": "negative"},
                {"label": "2 members sold outside the FPO last season", "direction": "negative"},
            ]),
            input_hash="9f2c7a1e00000000000000000000000000000000000000000000000000000000",
            created_at=datetime(2025, 11, 20, 9, 12, 0, tzinfo=timezone.utc),
        )
        s_green = Suggestion(
            id="SUG-2025-11-015",
            contract_id="CTR-2025-08",
            calibration_run_id=calib.id,
            confidence=0.80,
            lower_t=68.0,
            upper_t=82.0,
            point_t=75.0,
            shortfall_risk=0.05,
            status="GREEN",
            recommended_t=60.0,
            drivers_json=json.dumps([
                {"label": "Historical delivery performance aligns with contract requirements", "direction": "positive"}
            ]),
            input_hash="8e1b6a2d00000000000000000000000000000000000000000000000000000000",
            created_at=datetime(2025, 11, 20, 9, 15, 0, tzinfo=timezone.utc),
        )
        session.add(s_amber)
        session.add(s_green)
        session.commit()
        yield session

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()

def test_input_hash_deterministic():
    """Verify input_hash calculation is deterministic regardless of key insertion order."""
    data1 = {"crop": "onion", "quantity": 100.0, "alpha": 0.20}
    data2 = {"alpha": 0.20, "crop": "onion", "quantity": 100.0}
    assert compute_input_hash(data1) == compute_input_hash(data2)

def test_ac8_override_without_reason_rejected(client: TestClient):
    """AC8: Given an override decision with empty reason, then API returns 422 REASON_REQUIRED."""
    # Attempt override on AMBER card with empty reason
    payload = {
        "action": "override",
        "committed_t": 100.0,
        "reason": "",
        "actor": "board_member_2",
    }
    response = client.post("/suggestions/SUG-2025-11-014/decision", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["detail"]["error"]["code"] == "REASON_REQUIRED"
    assert "Overriding an AMBER/RED recommendation requires a reason" in data["detail"]["error"]["message"]

    # Attempt override with whitespace-only reason
    payload["reason"] = "   "
    response = client.post("/suggestions/SUG-2025-11-014/decision", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"]["error"]["code"] == "REASON_REQUIRED"

def test_ac8_override_without_actor_rejected(client: TestClient):
    """Enforce server-side requirement for actor on decisions."""
    payload = {
        "action": "override",
        "committed_t": 100.0,
        "reason": "Board reviewed local buffer stock",
        "actor": "",
    }
    response = client.post("/suggestions/SUG-2025-11-014/decision", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"]["error"]["code"] == "ACTOR_REQUIRED"

def test_ac8_valid_override_recorded_in_audit_log(client: TestClient):
    """AC8: Given a valid override, then it appears in /audit with actor, action, timestamp."""
    payload = {
        "action": "override",
        "committed_t": 100.0,
        "reason": "Board reviewed member reserve stock and authorized 100t commitment",
        "actor": "board_chairperson",
    }
    response = client.post("/suggestions/SUG-2025-11-014/decision", json=payload)
    assert response.status_code == 200
    dec_data = response.json()
    assert dec_data["action"] == "override"
    assert dec_data["committed_t"] == 100.0
    assert dec_data["actor"] == "board_chairperson"
    assert dec_data["reason"] == payload["reason"]

    # Query audit log
    audit_resp = client.get("/audit?entity=decision")
    assert audit_resp.status_code == 200
    events = audit_resp.json()
    assert len(events) >= 1
    ev = events[0]
    assert ev["entity"] == "decision"
    assert ev["event"] == "decision_recorded"
    assert ev["payload"]["actor"] == "board_chairperson"
    assert ev["payload"]["action"] == "override"
    assert ev["payload"]["committed_t"] == 100.0
    assert ev["payload"]["reason"] == payload["reason"]
    assert "created_at" in ev

def test_ac8_verify_action_allowed_without_reason(client: TestClient):
    """Verify action (recommending L) does not require override reason."""
    payload = {
        "action": "verify",
        "committed_t": 72.4,
        "actor": "procurement_officer",
    }
    response = client.post("/suggestions/SUG-2025-11-014/decision", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["action"] == "verify"
    assert data["committed_t"] == 72.4

def test_ac8_suggestion_card_fields_and_immutability(client: TestClient):
    """AC8: Suggestion carries model_version, calibration_version, input_hash, and is immutable."""
    resp = client.get("/suggestions/SUG-2025-11-014")
    assert resp.status_code == 200
    card = resp.json()

    assert card["id"] == "SUG-2025-11-014"
    assert card["contract_id"] == "CTR-2025-07"
    assert card["status"] == "AMBER"
    assert card["recommended_commitment_t"] == 72.4
    assert card["point_estimate_t"] == 80.2
    assert card["interval_t"]["lower"] == 72.4
    assert card["interval_t"]["upper"] == 88.1
    assert card["shortfall_risk"] == 0.91
    assert len(card["drivers"]) == 2
    assert card["model_version"] == "RUN-ONION-onion-gbr-v3"
    assert card["calibration_version"] == "CALIB-ONION-80-v3"
    assert card["calibration_size"] == 64
    assert card["input_hash"] != ""
    assert "created_at" in card

def test_suggestions_filtering(client: TestClient):
    """Test filtering suggestions by status and contract_id."""
    r_amber = client.get("/suggestions?status=AMBER")
    assert r_amber.status_code == 200
    assert len(r_amber.json()) == 1
    assert r_amber.json()[0]["id"] == "SUG-2025-11-014"

    r_green = client.get("/suggestions?status=GREEN")
    assert r_green.status_code == 200
    assert len(r_green.json()) == 1
    assert r_green.json()[0]["id"] == "SUG-2025-11-015"

    r_ctr = client.get("/suggestions?contract_id=CTR-2025-07")
    assert r_ctr.status_code == 200
    assert len(r_ctr.json()) == 1

def test_suggestion_not_found(client: TestClient):
    """Verify 404 for missing suggestion."""
    resp = client.get("/suggestions/SUG-NONEXISTENT")
    assert resp.status_code == 404
    assert resp.json()["detail"]["error"]["code"] == "SUGGESTION_NOT_FOUND"

def test_invalid_decision_action(client: TestClient):
    """Verify 422 for invalid action."""
    resp = client.post(
        "/suggestions/SUG-2025-11-014/decision",
        json={"action": "reject", "committed_t": 0.0, "actor": "admin"},
    )
    assert resp.status_code == 422
    assert resp.json()["detail"]["error"]["code"] == "INVALID_ACTION"

def test_generate_suggestions_enforces_gate(client: TestClient, monkeypatch):
    """AC5 / AC8: POST /suggestions/generate enforces backtest gate."""
    from backend.app.api import backtest as bt_api
    from backend.app.core.backtest import BacktestLevelMetrics, BacktestReport

    # Mock a failing backtest report for onion (coverage 0.66 outside tolerance)
    failing_report = BacktestReport(
        crop="onion",
        held_out_season="2024-RB",
        calib_size=50,
        test_size=50,
        gate_status="CLOSED",
        metrics_80=BacktestLevelMetrics(
            nominal=0.80, empirical_coverage=0.66, passed=False, q_low=-5.0, q_high=5.0, mean_width=10.0, winkler_score=25.0
        ),
        metrics_90=BacktestLevelMetrics(
            nominal=0.90, empirical_coverage=0.75, passed=False, q_low=-8.0, q_high=8.0, mean_width=16.0, winkler_score=35.0
        ),
        stratum_coverage={"low": 0.60, "mid": 0.70, "high": 0.68},
        stratum_passed=False,
    )
    bt_api._BACKTEST_CACHE["onion"] = failing_report

    # Call generate suggestions for onion -> Must fail with 409
    resp = client.post("/suggestions/generate?crop=onion")
    assert resp.status_code == 409
    err = resp.json()["detail"]["error"]
    assert err["code"] == "BACKTEST_GATE_CLOSED"
    assert "re-calibrate before serving suggestions" in err["message"].lower()

def test_generate_suggestions_open_gate_and_immutability(client: TestClient, monkeypatch):
    """AC8: With open gate, suggestions are generated with new IDs, leaving old rows immutable."""
    from backend.app.api import backtest as bt_api
    from backend.app.core.backtest import BacktestLevelMetrics, BacktestReport

    passing_report = BacktestReport(
        crop="onion",
        held_out_season="2024-RB",
        calib_size=64,
        test_size=50,
        gate_status="OPEN",
        metrics_80=BacktestLevelMetrics(
            nominal=0.80, empirical_coverage=0.81, passed=True, q_low=-7.8, q_high=7.9, mean_width=15.7, winkler_score=21.4
        ),
        metrics_90=BacktestLevelMetrics(
            nominal=0.90, empirical_coverage=0.88, passed=True, q_low=-10.0, q_high=11.0, mean_width=21.0, winkler_score=28.0
        ),
        stratum_coverage={"low": 0.79, "mid": 0.83, "high": 0.80},
        stratum_passed=True,
    )
    bt_api._BACKTEST_CACHE["onion"] = passing_report

    # Generate suggestions
    resp1 = client.post("/suggestions/generate?crop=onion")
    assert resp1.status_code == 200
    suggs1 = resp1.json()
    assert len(suggs1) >= 1
    id1 = suggs1[0]["id"]
    assert id1.startswith("SUG-")
    assert suggs1[0]["status"] == "AMBER"
    assert suggs1[0]["input_hash"] != ""

    # Re-running generation creates another immutable row with a distinct ID
    resp2 = client.post("/suggestions/generate?crop=onion")
    assert resp2.status_code == 200
    suggs2 = resp2.json()
    assert len(suggs2) >= 1
    id2 = suggs2[0]["id"]
    assert id2 != id1  # New immutable ID generated

    # Verify both records exist in DB
    r_all = client.get("/suggestions?contract_id=CTR-2025-07")
    all_ids = [s["id"] for s in r_all.json()]
    assert id1 in all_ids
    assert id2 in all_ids

def test_pipeline_seed_generate(client: TestClient):
    """Test POST /seed/generate endpoint."""
    resp = client.post("/seed/generate?seed=42")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
    assert resp.json()["seed"] == 42

