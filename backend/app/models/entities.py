"""SQLModel data models matching design.md §2."""
from typing import Optional
from datetime import datetime, date
from sqlmodel import SQLModel, Field

class FPO(SQLModel, table=True):
    __tablename__ = "fpo"
    id: str = Field(primary_key=True)
    name: str
    state: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Farmer(SQLModel, table=True):
    __tablename__ = "farmer"
    id: str = Field(primary_key=True)
    fpo_id: str = Field(foreign_key="fpo.id")
    name: str
    phone: Optional[str] = None
    joined_on: Optional[date] = None
    is_active: bool = True

class Plot(SQLModel, table=True):
    __tablename__ = "plot"
    id: str = Field(primary_key=True)
    farmer_id: str = Field(foreign_key="farmer.id")
    area_ha: float
    soil_type: str
    irrigation_type: str
    village: str

class SowingRecord(SQLModel, table=True):
    __tablename__ = "sowing_record"
    id: Optional[int] = Field(default=None, primary_key=True)
    plot_id: str = Field(foreign_key="plot.id")
    season: str
    crop: str
    sowing_date: date
    seed_variety: str
    area_sown_ha: float

class HarvestRecord(SQLModel, table=True):
    __tablename__ = "harvest_record"
    id: Optional[int] = Field(default=None, primary_key=True)
    plot_id: str = Field(foreign_key="plot.id")
    season: str
    crop: str
    harvest_date: date
    quantity_kg: float
    grade_a_pct: float
    grade_b_pct: float
    grade_c_pct: float

class SignalDaily(SQLModel, table=True):
    __tablename__ = "signal_daily"
    id: Optional[int] = Field(default=None, primary_key=True)
    plot_id: Optional[str] = Field(default=None, foreign_key="plot.id")
    fpo_id: Optional[str] = Field(default=None, foreign_key="fpo.id")
    date: date
    ndvi: float
    rainfall_mm: float
    temp_c: Optional[float] = None

class Contract(SQLModel, table=True):
    __tablename__ = "contract"
    id: str = Field(primary_key=True)
    fpo_id: str = Field(foreign_key="fpo.id")
    buyer_name: str
    crop: str
    grade: str
    quantity_t: float
    due_date: date
    penalty_per_t: float
    status: str = "OPEN"  # OPEN, COMPLETED, BREACHED, CANCELLED

class Delivery(SQLModel, table=True):
    __tablename__ = "delivery"
    id: Optional[int] = Field(default=None, primary_key=True)
    contract_id: str = Field(foreign_key="contract.id")
    delivered_t: float
    grade_delivered: str
    delivered_on: date
    shortfall_t: float = 0.0

class ModelRun(SQLModel, table=True):
    __tablename__ = "model_run"
    id: str = Field(primary_key=True)
    crop: str
    version: str
    trained_at: datetime = Field(default_factory=datetime.utcnow)
    features_json: str
    metrics_json: str
    artifact_path: str

class CalibrationRun(SQLModel, table=True):
    __tablename__ = "calibration_run"
    id: str = Field(primary_key=True)
    model_run_id: str = Field(foreign_key="model_run.id")
    crop: str
    method: str
    alpha: float
    calib_size: int
    q_lower: float
    q_upper: float
    coverage_json: str

class Suggestion(SQLModel, table=True):
    __tablename__ = "suggestion"
    id: str = Field(primary_key=True)
    contract_id: str = Field(foreign_key="contract.id")
    calibration_run_id: str = Field(foreign_key="calibration_run.id")
    confidence: float
    lower_t: float
    upper_t: float
    point_t: float
    shortfall_risk: float
    status: str  # GREEN, AMBER, RED
    recommended_t: float
    drivers_json: str
    input_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DecisionLog(SQLModel, table=True):
    __tablename__ = "decision_log"
    id: Optional[int] = Field(default=None, primary_key=True)
    suggestion_id: str = Field(foreign_key="suggestion.id")
    actor: str
    action: str  # accept, override, verify
    committed_t: float
    reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AuditEvent(SQLModel, table=True):
    __tablename__ = "audit_event"
    id: Optional[int] = Field(default=None, primary_key=True)
    entity: str
    entity_id: str
    event: str
    payload_json: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
