"""Test database initialization and entity schemas."""
import pytest
from datetime import date, datetime
from sqlmodel import SQLModel, create_engine, Session, select
from backend.app.models import (
    FPO, Farmer, Plot, SowingRecord, HarvestRecord,
    Contract, Suggestion, DecisionLog, AuditEvent
)
from backend.app.db import init_db

@pytest.fixture
def test_engine():
    engine = create_engine("sqlite:///:memory:", echo=False)
    init_db(engine)
    return engine

def test_create_and_query_entities(test_engine):
    with Session(test_engine) as session:
        # Create FPO
        fpo = FPO(id="FPO-001", name="Sahyadri Farmers", state="Maharashtra")
        session.add(fpo)
        session.commit()

        # Create Farmer & Plot
        farmer = Farmer(id="FAR-001", fpo_id="FPO-001", name="Ramesh Patil")
        session.add(farmer)
        session.commit()

        plot = Plot(id="PLT-001", farmer_id="FAR-001", area_ha=1.5, soil_type="black", irrigation_type="drip", village="Nashik")
        session.add(plot)
        session.commit()

        # Query back
        res = session.exec(select(Plot).where(Plot.id == "PLT-001")).first()
        assert res is not None
        assert res.farmer_id == "FAR-001"
        assert res.area_ha == 1.5
