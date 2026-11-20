"""Tests for decision engine and rule-gated recommendation (AC6)."""
import pytest
from backend.app.core.decision import (
    evaluate_contract_commitment,
    rank_contracts_by_risk_penalty,
)

def test_decision_engine_ac6_scenarios():
    """Verify all exact AC6 scenarios from expected_output.md."""
    # Scenario 1: L=72.4, U=88.1, Q=60 -> GREEN, recommended_t=60
    d1 = evaluate_contract_commitment(lower_t=72.4, upper_t=88.1, contract_quantity_t=60.0, shortfall_risk=0.05)
    assert d1.status == "GREEN"
    assert d1.recommended_t == 60.0
    assert "Safe to commit" in d1.message

    # Scenario 2: L=72.4, U=88.1, Q=100 -> AMBER, recommended_t=72.4, shortfall_risk > 0.8
    d2 = evaluate_contract_commitment(lower_t=72.4, upper_t=88.1, contract_quantity_t=100.0, shortfall_risk=0.91)
    assert d2.status == "AMBER"
    assert d2.recommended_t == 72.4
    assert d2.shortfall_risk > 0.8
    assert "Commit 72.4 t now" in d2.message
    assert "91% shortfall risk" in d2.message

    # Scenario 3: L=40, U=55, Q=100 -> RED, recommended_t=0
    d3 = evaluate_contract_commitment(lower_t=40.0, upper_t=55.0, contract_quantity_t=100.0, shortfall_risk=0.99)
    assert d3.status == "RED"
    assert d3.recommended_t == 0.0
    assert "Do not commit 100 t" in d3.message

    # Scenario 4: low_information interval with L >= Q -> downgraded to AMBER with warning
    d4 = evaluate_contract_commitment(lower_t=70.0, upper_t=180.0, contract_quantity_t=60.0, shortfall_risk=0.10, low_information=True)
    assert d4.status == "AMBER"
    assert d4.low_information is True
    assert "Caution: interval is wide due to thin data" in d4.message

@pytest.mark.parametrize(
    "lower,upper,qty,risk,expected_status,expected_rec",
    [
        # Q == L -> GREEN
        (50.0, 80.0, 50.0, 0.10, "GREEN", 50.0),
        # Q == U -> AMBER
        (50.0, 80.0, 80.0, 0.85, "AMBER", 50.0),
        # L == U and Q < L -> GREEN
        (50.0, 50.0, 40.0, 0.0, "GREEN", 40.0),
        # L == U and Q > U -> RED
        (50.0, 50.0, 60.0, 1.0, "RED", 0.0),
        # Q == 0 -> GREEN
        (50.0, 80.0, 0.0, 0.0, "GREEN", 0.0),
    ],
)
def test_decision_engine_edge_cases(lower, upper, qty, risk, expected_status, expected_rec):
    res = evaluate_contract_commitment(lower_t=lower, upper_t=upper, contract_quantity_t=qty, shortfall_risk=risk)
    assert res.status == expected_status
    assert res.recommended_t == expected_rec

def test_contract_ranking_by_downside_penalty():
    contracts = [
        {"contract_id": "CTR-A", "shortfall_risk": 0.90, "penalty_per_t": 2000.0},  # 1800
        {"contract_id": "CTR-B", "shortfall_risk": 0.20, "penalty_per_t": 1500.0},  # 300
        {"contract_id": "CTR-C", "shortfall_risk": 0.50, "penalty_per_t": 1000.0},  # 500
    ]
    ranked = rank_contracts_by_risk_penalty(contracts)
    ranked_ids = [c["contract_id"] for c in ranked]
    # Lowest downside first: CTR-B (300) < CTR-C (500) < CTR-A (1800)
    assert ranked_ids == ["CTR-B", "CTR-C", "CTR-A"]
