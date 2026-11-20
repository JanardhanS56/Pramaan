"""Pydantic v2 schemas for suggestions, decisions, audit, and pipeline."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class DriverResponse(BaseModel):
    label: str
    direction: str  # negative, positive, neutral
    magnitude_hint: Optional[str] = None

class IntervalT(BaseModel):
    lower: float
    upper: float

class SuggestionResponse(BaseModel):
    id: str
    suggestion_id: str
    contract_id: str
    fpo_id: Optional[str] = "FPO-001"
    buyer: Optional[str] = None
    buyer_name: Optional[str] = None
    buyer_requires_t: float
    crop: str
    grade: Optional[str] = None
    due_date: Optional[str] = None
    contract_quantity_t: float
    confidence: float
    lower_t: float
    upper_t: float
    interval_t: IntervalT
    point_t: float
    point_estimate_t: float
    shortfall_risk: float
    status: str  # GREEN, AMBER, RED
    recommended_t: float
    recommended_commitment_t: float
    message: str
    low_information: bool = False
    drivers: List[DriverResponse] = []
    model_version: str
    calibration_version: str
    calibration_size: int
    calib_size: int
    backtest_coverage: Optional[float] = None
    input_hash: str
    created_at: datetime

class DecisionRequest(BaseModel):
    action: str = Field(description="'accept', 'verify', or 'override'")
    committed_t: float
    reason: Optional[str] = None
    actor: str

class DecisionResponse(BaseModel):
    id: int
    suggestion_id: str
    action: str
    committed_t: float
    reason: Optional[str] = None
    actor: str
    created_at: datetime

class AuditEventResponse(BaseModel):
    id: int
    entity: str
    entity_id: str
    event: str
    payload: Dict[str, Any]
    created_at: datetime

class TrainRequest(BaseModel):
    crop: str
    seed: Optional[int] = 42

class CalibrateRequest(BaseModel):
    crop: str
    nominal_confidence: Optional[float] = 0.80

class GenerateSuggestionsRequest(BaseModel):
    confidence: Optional[float] = 0.80
    crop: Optional[str] = None
