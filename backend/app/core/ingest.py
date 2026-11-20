"""Strict CSV ingest validators and database loaders for Setu."""
from dataclasses import dataclass
from datetime import date, datetime
import re
from typing import Dict, List, Optional, Tuple, Any
import pandas as pd
from sqlmodel import Session, select

from backend.app.models.entities import (
    Farmer,
    Plot,
    SowingRecord,
    HarvestRecord,
    SignalDaily,
    Contract,
    Delivery,
)

SEASON_REGEX = re.compile(r"^\d{4}-(KH|RB)$")
VALID_STATUSES = {"OPEN", "COMPLETED", "BREACHED", "CANCELLED"}

@dataclass
class ValidationErrorItem:
    row: int
    field: str
    message: str

    def to_dict(self) -> Dict[str, Any]:
        return {"row": self.row, "field": self.field, "message": self.message}

class IngestValidationError(Exception):
    def __init__(self, file_type: str, errors: List[ValidationErrorItem]):
        self.file_type = file_type
        self.errors = errors
        super().__init__(f"Validation failed for {file_type} with {len(errors)} error(s)")

def _parse_date(val: Any) -> Optional[date]:
    if pd.isna(val) or val is None or str(val).strip() == "":
        return None
    try:
        return date.fromisoformat(str(val).strip())
    except (ValueError, TypeError):
        return None

def validate_farmers(df: pd.DataFrame, session: Session) -> List[ValidationErrorItem]:
    errors = []
    required_cols = ["farmer_id", "name", "phone", "joined_on", "is_active"]
    for col in required_cols:
        if col not in df.columns:
            errors.append(ValidationErrorItem(row=0, field=col, message=f"Missing column '{col}'"))
    if errors:
        return errors

    seen_ids = set()
    for idx, row in df.iterrows():
        row_num = idx + 2
        f_id = str(row["farmer_id"]).strip()
        if not f_id:
            errors.append(ValidationErrorItem(row=row_num, field="farmer_id", message="farmer_id cannot be empty"))
        elif f_id in seen_ids:
            errors.append(ValidationErrorItem(row=row_num, field="farmer_id", message=f"Duplicate farmer_id '{f_id}' in file"))
        seen_ids.add(f_id)

        if not str(row["name"]).strip():
            errors.append(ValidationErrorItem(row=row_num, field="name", message="name cannot be empty"))

        joined_on = _parse_date(row["joined_on"])
        if row["joined_on"] and not joined_on:
            errors.append(ValidationErrorItem(row=row_num, field="joined_on", message=f"Invalid date format '{row['joined_on']}', expected YYYY-MM-DD"))
    return errors

def validate_plots(df: pd.DataFrame, session: Session) -> List[ValidationErrorItem]:
    errors = []
    required_cols = ["plot_id", "farmer_id", "area_ha", "soil_type", "irrigation_type", "village"]
    for col in required_cols:
        if col not in df.columns:
            errors.append(ValidationErrorItem(row=0, field=col, message=f"Missing column '{col}'"))
    if errors:
        return errors

    existing_farmers = set(session.exec(select(Farmer.id)).all())
    seen_ids = set()
    for idx, row in df.iterrows():
        row_num = idx + 2
        p_id = str(row["plot_id"]).strip()
        if not p_id:
            errors.append(ValidationErrorItem(row=row_num, field="plot_id", message="plot_id cannot be empty"))
        elif p_id in seen_ids:
            errors.append(ValidationErrorItem(row=row_num, field="plot_id", message=f"Duplicate plot_id '{p_id}' in file"))
        seen_ids.add(p_id)

        f_id = str(row["farmer_id"]).strip()
        if f_id not in existing_farmers:
            errors.append(ValidationErrorItem(row=row_num, field="farmer_id", message=f"farmer_id '{f_id}' does not exist in database"))

        try:
            area = float(row["area_ha"])
            if area <= 0:
                errors.append(ValidationErrorItem(row=row_num, field="area_ha", message="area_ha must be greater than 0"))
        except (ValueError, TypeError):
            errors.append(ValidationErrorItem(row=row_num, field="area_ha", message="area_ha must be a numeric value"))
    return errors

def validate_sowing(df: pd.DataFrame, session: Session) -> List[ValidationErrorItem]:
    errors = []
    required_cols = ["plot_id", "season", "crop", "sowing_date", "seed_variety", "area_sown_ha"]
    for col in required_cols:
        if col not in df.columns:
            errors.append(ValidationErrorItem(row=0, field=col, message=f"Missing column '{col}'"))
    if errors:
        return errors

    existing_plots = set(session.exec(select(Plot.id)).all())
    for idx, row in df.iterrows():
        row_num = idx + 2
        p_id = str(row["plot_id"]).strip()
        if p_id not in existing_plots:
            errors.append(ValidationErrorItem(row=row_num, field="plot_id", message=f"plot_id '{p_id}' does not exist in database"))

        season = str(row["season"]).strip()
        if not SEASON_REGEX.match(season):
            errors.append(ValidationErrorItem(row=row_num, field="season", message=f"Invalid season format '{season}', expected YYYY-KH or YYYY-RB"))

        sow_date = _parse_date(row["sowing_date"])
        if not sow_date:
            errors.append(ValidationErrorItem(row=row_num, field="sowing_date", message=f"Invalid sowing_date '{row['sowing_date']}', expected YYYY-MM-DD"))

        try:
            area_sown = float(row["area_sown_ha"])
            if area_sown <= 0:
                errors.append(ValidationErrorItem(row=row_num, field="area_sown_ha", message="area_sown_ha must be greater than 0"))
        except (ValueError, TypeError):
            errors.append(ValidationErrorItem(row=row_num, field="area_sown_ha", message="area_sown_ha must be numeric"))
    return errors

def validate_harvest(df: pd.DataFrame, session: Session) -> List[ValidationErrorItem]:
    errors = []
    required_cols = ["plot_id", "season", "crop", "harvest_date", "quantity_kg", "grade_a_pct", "grade_b_pct", "grade_c_pct"]
    for col in required_cols:
        if col not in df.columns:
            errors.append(ValidationErrorItem(row=0, field=col, message=f"Missing column '{col}'"))
    if errors:
        return errors

    existing_plots = set(session.exec(select(Plot.id)).all())
    for idx, row in df.iterrows():
        row_num = idx + 2
        p_id = str(row["plot_id"]).strip()
        if p_id not in existing_plots:
            errors.append(ValidationErrorItem(row=row_num, field="plot_id", message=f"plot_id '{p_id}' does not exist in database"))

        season = str(row["season"]).strip()
        if not SEASON_REGEX.match(season):
            errors.append(ValidationErrorItem(row=row_num, field="season", message=f"Invalid season format '{season}', expected YYYY-KH or YYYY-RB"))

        harv_date = _parse_date(row["harvest_date"])
        if not harv_date:
            errors.append(ValidationErrorItem(row=row_num, field="harvest_date", message=f"Invalid harvest_date '{row['harvest_date']}', expected YYYY-MM-DD"))

        try:
            qty = float(row["quantity_kg"])
            if qty < 0:
                errors.append(ValidationErrorItem(row=row_num, field="quantity_kg", message="quantity_kg cannot be negative"))
        except (ValueError, TypeError):
            errors.append(ValidationErrorItem(row=row_num, field="quantity_kg", message="quantity_kg must be numeric"))

        try:
            ga = float(row["grade_a_pct"])
            gb = float(row["grade_b_pct"])
            gc = float(row["grade_c_pct"])
            total_pct = ga + gb + gc
            if not (99.0 <= total_pct <= 101.0):
                errors.append(ValidationErrorItem(row=row_num, field="grade_pct", message=f"Grade percentages must sum to 100 ± 1 (got {total_pct})"))
            for g_name, g_val in [("grade_a_pct", ga), ("grade_b_pct", gb), ("grade_c_pct", gc)]:
                if not (0.0 <= g_val <= 100.0):
                    errors.append(ValidationErrorItem(row=row_num, field=g_name, message=f"{g_name} must be between 0 and 100"))
        except (ValueError, TypeError):
            errors.append(ValidationErrorItem(row=row_num, field="grade_pct", message="Grade percentages must be numeric"))
    return errors

def validate_signals(df: pd.DataFrame, session: Session) -> List[ValidationErrorItem]:
    errors = []
    required_cols = ["plot_id", "date", "ndvi", "rainfall_mm", "temp_c"]
    for col in required_cols:
        if col not in df.columns:
            errors.append(ValidationErrorItem(row=0, field=col, message=f"Missing column '{col}'"))
    if errors:
        return errors

    existing_plots = set(session.exec(select(Plot.id)).all())
    for idx, row in df.iterrows():
        row_num = idx + 2
        p_id = str(row["plot_id"]).strip()
        if p_id and p_id not in existing_plots:
            errors.append(ValidationErrorItem(row=row_num, field="plot_id", message=f"plot_id '{p_id}' does not exist in database"))

        d = _parse_date(row["date"])
        if not d:
            errors.append(ValidationErrorItem(row=row_num, field="date", message=f"Invalid date format '{row['date']}', expected YYYY-MM-DD"))

        try:
            ndvi = float(row["ndvi"])
            if not (-1.0 <= ndvi <= 1.0):
                errors.append(ValidationErrorItem(row=row_num, field="ndvi", message="ndvi must be between -1.0 and 1.0"))
        except (ValueError, TypeError):
            errors.append(ValidationErrorItem(row=row_num, field="ndvi", message="ndvi must be numeric"))

        try:
            rain = float(row["rainfall_mm"])
            if rain < 0:
                errors.append(ValidationErrorItem(row=row_num, field="rainfall_mm", message="rainfall_mm cannot be negative"))
        except (ValueError, TypeError):
            errors.append(ValidationErrorItem(row=row_num, field="rainfall_mm", message="rainfall_mm must be numeric"))
    return errors

def validate_contracts(df: pd.DataFrame, session: Session) -> List[ValidationErrorItem]:
    errors = []
    required_cols = ["contract_id", "buyer_name", "crop", "grade", "quantity_t", "due_date", "penalty_per_t", "status"]
    for col in required_cols:
        if col not in df.columns:
            errors.append(ValidationErrorItem(row=0, field=col, message=f"Missing column '{col}'"))
    if errors:
        return errors

    seen_ids = set()
    for idx, row in df.iterrows():
        row_num = idx + 2
        c_id = str(row["contract_id"]).strip()
        if not c_id:
            errors.append(ValidationErrorItem(row=row_num, field="contract_id", message="contract_id cannot be empty"))
        elif c_id in seen_ids:
            errors.append(ValidationErrorItem(row=row_num, field="contract_id", message=f"Duplicate contract_id '{c_id}' in file"))
        seen_ids.add(c_id)

        try:
            qty = float(row["quantity_t"])
            if qty <= 0:
                errors.append(ValidationErrorItem(row=row_num, field="quantity_t", message="quantity_t must be greater than 0"))
        except (ValueError, TypeError):
            errors.append(ValidationErrorItem(row=row_num, field="quantity_t", message="quantity_t must be numeric"))

        d = _parse_date(row["due_date"])
        if not d:
            errors.append(ValidationErrorItem(row=row_num, field="due_date", message=f"Invalid due_date '{row['due_date']}', expected YYYY-MM-DD"))

        try:
            pen = float(row["penalty_per_t"])
            if pen < 0:
                errors.append(ValidationErrorItem(row=row_num, field="penalty_per_t", message="penalty_per_t cannot be negative"))
        except (ValueError, TypeError):
            errors.append(ValidationErrorItem(row=row_num, field="penalty_per_t", message="penalty_per_t must be numeric"))

        status = str(row["status"]).strip().upper()
        if status not in VALID_STATUSES:
            errors.append(ValidationErrorItem(row=row_num, field="status", message=f"Invalid status '{status}', must be one of {sorted(VALID_STATUSES)}"))
    return errors

def validate_deliveries(df: pd.DataFrame, session: Session) -> List[ValidationErrorItem]:
    errors = []
    required_cols = ["contract_id", "delivered_t", "grade_delivered", "delivered_on"]
    for col in required_cols:
        if col not in df.columns:
            errors.append(ValidationErrorItem(row=0, field=col, message=f"Missing column '{col}'"))
    if errors:
        return errors

    existing_contracts = set(session.exec(select(Contract.id)).all())
    for idx, row in df.iterrows():
        row_num = idx + 2
        c_id = str(row["contract_id"]).strip()
        if c_id not in existing_contracts:
            errors.append(ValidationErrorItem(row=row_num, field="contract_id", message=f"contract_id '{c_id}' does not exist in database"))

        try:
            del_t = float(row["delivered_t"])
            if del_t < 0:
                errors.append(ValidationErrorItem(row=row_num, field="delivered_t", message="delivered_t cannot be negative"))
        except (ValueError, TypeError):
            errors.append(ValidationErrorItem(row=row_num, field="delivered_t", message="delivered_t must be numeric"))

        d = _parse_date(row["delivered_on"])
        if not d:
            errors.append(ValidationErrorItem(row=row_num, field="delivered_on", message=f"Invalid delivered_on '{row['delivered_on']}', expected YYYY-MM-DD"))
    return errors

VALIDATORS = {
    "farmers": validate_farmers,
    "plots": validate_plots,
    "sowing": validate_sowing,
    "harvest": validate_harvest,
    "signals": validate_signals,
    "contracts": validate_contracts,
    "deliveries": validate_deliveries,
}

def load_validated_csv(file_type: str, df: pd.DataFrame, session: Session, fpo_id: str = "FPO-001") -> int:
    """Validate and upsert CSV rows into database. Raises IngestValidationError on any error."""
    if file_type not in VALIDATORS:
        raise ValueError(f"Unknown file_type: {file_type}")

    validator = VALIDATORS[file_type]
    errors = validator(df, session)
    if errors:
        raise IngestValidationError(file_type=file_type, errors=errors)

    # Perform atomic load
    count = 0
    if file_type == "farmers":
        for _, r in df.iterrows():
            f_id = str(r["farmer_id"]).strip()
            item = session.get(Farmer, f_id)
            if not item:
                item = Farmer(id=f_id, fpo_id=fpo_id, name=str(r["name"]).strip())
            item.phone = str(r["phone"]).strip() if pd.notna(r["phone"]) else None
            item.joined_on = _parse_date(r["joined_on"])
            item.is_active = bool(r["is_active"])
            session.add(item)
            count += 1

    elif file_type == "plots":
        for _, r in df.iterrows():
            p_id = str(r["plot_id"]).strip()
            item = session.get(Plot, p_id)
            if not item:
                item = Plot(
                    id=p_id,
                    farmer_id=str(r["farmer_id"]).strip(),
                    area_ha=float(r["area_ha"]),
                    soil_type=str(r["soil_type"]).strip(),
                    irrigation_type=str(r["irrigation_type"]).strip(),
                    village=str(r["village"]).strip(),
                )
            else:
                item.area_ha = float(r["area_ha"])
                item.soil_type = str(r["soil_type"]).strip()
                item.irrigation_type = str(r["irrigation_type"]).strip()
                item.village = str(r["village"]).strip()
            session.add(item)
            count += 1

    elif file_type == "sowing":
        for _, r in df.iterrows():
            item = SowingRecord(
                plot_id=str(r["plot_id"]).strip(),
                season=str(r["season"]).strip(),
                crop=str(r["crop"]).strip(),
                sowing_date=_parse_date(r["sowing_date"]),
                seed_variety=str(r["seed_variety"]).strip(),
                area_sown_ha=float(r["area_sown_ha"]),
            )
            session.add(item)
            count += 1

    elif file_type == "harvest":
        for _, r in df.iterrows():
            item = HarvestRecord(
                plot_id=str(r["plot_id"]).strip(),
                season=str(r["season"]).strip(),
                crop=str(r["crop"]).strip(),
                harvest_date=_parse_date(r["harvest_date"]),
                quantity_kg=float(r["quantity_kg"]),
                grade_a_pct=float(r["grade_a_pct"]),
                grade_b_pct=float(r["grade_b_pct"]),
                grade_c_pct=float(r["grade_c_pct"]),
            )
            session.add(item)
            count += 1

    elif file_type == "signals":
        for _, r in df.iterrows():
            p_id = str(r["plot_id"]).strip() if pd.notna(r["plot_id"]) else None
            temp = float(r["temp_c"]) if pd.notna(r.get("temp_c")) else None
            item = SignalDaily(
                plot_id=p_id,
                fpo_id=fpo_id if not p_id else None,
                date=_parse_date(r["date"]),
                ndvi=float(r["ndvi"]),
                rainfall_mm=float(r["rainfall_mm"]),
                temp_c=temp,
            )
            session.add(item)
            count += 1

    elif file_type == "contracts":
        for _, r in df.iterrows():
            c_id = str(r["contract_id"]).strip()
            item = session.get(Contract, c_id)
            if not item:
                item = Contract(
                    id=c_id,
                    fpo_id=fpo_id,
                    buyer_name=str(r["buyer_name"]).strip(),
                    crop=str(r["crop"]).strip(),
                    grade=str(r["grade"]).strip(),
                    quantity_t=float(r["quantity_t"]),
                    due_date=_parse_date(r["due_date"]),
                    penalty_per_t=float(r["penalty_per_t"]),
                    status=str(r["status"]).strip().upper(),
                )
            else:
                item.quantity_t = float(r["quantity_t"])
                item.due_date = _parse_date(r["due_date"])
                item.penalty_per_t = float(r["penalty_per_t"])
                item.status = str(r["status"]).strip().upper()
            session.add(item)
            count += 1

    elif file_type == "deliveries":
        for _, r in df.iterrows():
            c_id = str(r["contract_id"]).strip()
            del_t = float(r["delivered_t"])
            c = session.get(Contract, c_id)
            shortfall = max(0.0, c.quantity_t - del_t) if c else 0.0
            item = Delivery(
                contract_id=c_id,
                delivered_t=del_t,
                grade_delivered=str(r["grade_delivered"]).strip(),
                delivered_on=_parse_date(r["delivered_on"]),
                shortfall_t=round(shortfall, 2),
            )
            session.add(item)
            count += 1

    session.commit()
    return count
