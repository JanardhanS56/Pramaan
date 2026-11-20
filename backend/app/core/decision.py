"""Rule-gated decision engine matching design.md §8 and AC6."""
import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from backend.app.config import settings

@dataclass
class DecisionResult:
    status: str  # GREEN, AMBER, RED
    recommended_t: float
    message: str
    shortfall_risk: float
    low_information: bool

def evaluate_contract_commitment(
    lower_t: float,
    upper_t: float,
    contract_quantity_t: float,
    shortfall_risk: float,
    low_information: bool = False,
) -> DecisionResult:
    """Evaluate contract against calibrated interval [L, U] and shortfall risk.

    Rules (design.md §8, AC6):
      - L >= Q: GREEN, recommended_t = Q
      - L < Q and (L >= 0.6*Q or U >= 0.75*Q): AMBER, recommended_t = L
        "Commit {recommended_t} t now. Committing {Q} t carries a {risk}% shortfall risk."
      - U < Q and L < 0.6*Q: RED, recommended_t = 0
        "Do not commit {Q} t. Even the optimistic case is {U} t."
      - low_information: if True, any GREEN is downgraded to AMBER with caution warning
    """
    Q = float(contract_quantity_t)
    L = float(lower_t)
    U = float(upper_t)
    risk = float(shortfall_risk)

    if Q <= 0.0:
        return DecisionResult(
            status="GREEN",
            recommended_t=0.0,
            message="Contract quantity is zero. No delivery required.",
            shortfall_risk=0.0,
            low_information=low_information,
        )

    if L >= Q:
        if low_information:
            # Downgrade GREEN to AMBER on thin data / wide interval
            return DecisionResult(
                status="AMBER",
                recommended_t=round(min(L, Q), 1),
                message="Caution: interval is wide due to thin data. Pessimistic case clears contract, but commit with care.",
                shortfall_risk=risk,
                low_information=True,
            )
        return DecisionResult(
            status="GREEN",
            recommended_t=round(Q, 1),
            message="Safe to commit — pessimistic case clears the contract.",
            shortfall_risk=risk,
            low_information=False,
        )
    elif (L < U) and ((L >= settings.AMBER_MIN_LOWER_RATIO * Q) or (U >= settings.AMBER_MIN_UPPER_RATIO * Q)):
        rec_t = round(L, 1)
        risk_pct = int(round(risk * 100))
        return DecisionResult(
            status="AMBER",
            recommended_t=rec_t,
            message=f"Commit {rec_t:g} t now. Committing {Q:g} t carries a {risk_pct}% shortfall risk.",
            shortfall_risk=risk,
            low_information=low_information,
        )
    else:  # Severe shortfall risk; even optimistic is far too low
        return DecisionResult(
            status="RED",
            recommended_t=0.0,
            message=f"Do not commit {Q:g} t. Even the optimistic case is {round(U, 1):g} t.",
            shortfall_risk=risk,
            low_information=low_information,
        )

def rank_contracts_by_risk_penalty(
    contracts_evaluations: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Rank multiple competing contracts by downside exposure (P_short * penalty_per_t ascending)."""
    return sorted(
        contracts_evaluations,
        key=lambda item: (
            float(item.get("shortfall_risk", 0.0))
            * float(item.get("penalty_per_t", 0.0))
        ),
    )
