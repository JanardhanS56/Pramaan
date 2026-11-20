"""Tests for CSV validation and ingest matching AC2."""
import io
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine, select
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.db import get_session, init_db
from backend.app.models.entities import FPO, Farmer, Plot, HarvestRecord

@pytest.fixture
def client_and_session():
    # Use StaticPool so all threads/sessions share the same in-memory SQLite instance
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    init_db(engine)

    def get_test_session():
        with Session(engine) as s:
            yield s

    app.dependency_overrides[get_session] = get_test_session
    client = TestClient(app)

    # Seed an initial FPO
    with Session(engine) as s:
        fpo = FPO(id="FPO-001", name="Sahyadri FPO", state="Maharashtra")
        s.add(fpo)
        s.commit()

    yield client, engine
    app.dependency_overrides.clear()

def test_ingest_farmers_plots_valid(client_and_session):
    client, engine = client_and_session

    farmers_csv = "farmer_id,name,phone,joined_on,is_active\nFAR-101,Aman Rao,9811111111,2023-01-10,true\n"
    res = client.post(
        "/ingest/csv",
        data={"file_type": "farmers"},
        files={"file": ("farmers.csv", io.BytesIO(farmers_csv.encode("utf-8")), "text/csv")},
    )
    assert res.status_code == 200
    assert res.json()["rows_loaded"] == 1

    plots_csv = "plot_id,farmer_id,area_ha,soil_type,irrigation_type,village\nPLT-101,FAR-101,2.0,black,drip,Nashik\n"
    res_plots = client.post(
        "/ingest/csv",
        data={"file_type": "plots"},
        files={"file": ("plots.csv", io.BytesIO(plots_csv.encode("utf-8")), "text/csv")},
    )
    assert res_plots.status_code == 200
    assert res_plots.json()["rows_loaded"] == 1

def test_ingest_negative_quantity_ac2(client_and_session):
    client, engine = client_and_session

    # Seed farmer & plot first
    with Session(engine) as s:
        s.add(Farmer(id="FAR-001", fpo_id="FPO-001", name="Ramesh"))
        s.add(Plot(id="PLT-001", farmer_id="FAR-001", area_ha=1.0, soil_type="black", irrigation_type="drip", village="Nashik"))
        s.commit()

    # Harvest with negative quantity on row 2
    harvest_csv = (
        "plot_id,season,crop,harvest_date,quantity_kg,grade_a_pct,grade_b_pct,grade_c_pct\n"
        "PLT-001,2024-KH,onion,2024-10-20,-500.0,60.0,30.0,10.0\n"
    )
    res = client.post(
        "/ingest/csv",
        data={"file_type": "harvest"},
        files={"file": ("harvest.csv", io.BytesIO(harvest_csv.encode("utf-8")), "text/csv")},
    )
    assert res.status_code == 422
    err = res.json()["detail"]["error"]
    assert err["code"] == "CSV_VALIDATION_ERROR"
    assert any(e["row"] == 2 and e["field"] == "quantity_kg" for e in err["details"]["errors"])

    # Ensure no partial load
    with Session(engine) as s:
        records = s.exec(select(HarvestRecord)).all()
        assert len(records) == 0

def test_ingest_bad_date_ac2(client_and_session):
    client, engine = client_and_session

    # Farmers CSV with bad date format on row 2
    farmers_bad_date = (
        "farmer_id,name,phone,joined_on,is_active\n"
        "FAR-201,Kiran More,9822222222,20-11-2023,true\n"
    )
    res = client.post(
        "/ingest/csv",
        data={"file_type": "farmers"},
        files={"file": ("farmers.csv", io.BytesIO(farmers_bad_date.encode("utf-8")), "text/csv")},
    )
    assert res.status_code == 422
    err = res.json()["detail"]["error"]
    assert any(e["row"] == 2 and e["field"] == "joined_on" for e in err["details"]["errors"])

def test_ingest_unknown_plot_id_ac2(client_and_session):
    client, engine = client_and_session

    # Sowing CSV referencing non-existent plot_id on row 2
    sowing_bad_plot = (
        "plot_id,season,crop,sowing_date,seed_variety,area_sown_ha\n"
        "PLT-999,2024-KH,onion,2024-06-15,Bhima Kiran,1.5\n"
    )
    res = client.post(
        "/ingest/csv",
        data={"file_type": "sowing"},
        files={"file": ("sowing.csv", io.BytesIO(sowing_bad_plot.encode("utf-8")), "text/csv")},
    )
    assert res.status_code == 422
    err = res.json()["detail"]["error"]
    assert any(e["row"] == 2 and e["field"] == "plot_id" for e in err["details"]["errors"])

def test_ingest_grade_sum_mismatch_ac2(client_and_session):
    client, engine = client_and_session

    # Seed plot
    with Session(engine) as s:
        s.add(Farmer(id="FAR-001", fpo_id="FPO-001", name="Ramesh"))
        s.add(Plot(id="PLT-001", farmer_id="FAR-001", area_ha=1.0, soil_type="black", irrigation_type="drip", village="Nashik"))
        s.commit()

    # Harvest with grades summing to 70% instead of 100% on row 2
    harvest_bad_grades = (
        "plot_id,season,crop,harvest_date,quantity_kg,grade_a_pct,grade_b_pct,grade_c_pct\n"
        "PLT-001,2024-KH,onion,2024-10-20,12000.0,40.0,20.0,10.0\n"
    )
    res = client.post(
        "/ingest/csv",
        data={"file_type": "harvest"},
        files={"file": ("harvest.csv", io.BytesIO(harvest_bad_grades.encode("utf-8")), "text/csv")},
    )
    assert res.status_code == 422
    err = res.json()["detail"]["error"]
    assert any(e["row"] == 2 and e["field"] == "grade_pct" for e in err["details"]["errors"])

def test_ingest_invalid_season_format(client_and_session):
    client, engine = client_and_session

    with Session(engine) as s:
        s.add(Farmer(id="FAR-001", fpo_id="FPO-001", name="Ramesh"))
        s.add(Plot(id="PLT-001", farmer_id="FAR-001", area_ha=1.0, soil_type="black", irrigation_type="drip", village="Nashik"))
        s.commit()

    sowing_bad_season = (
        "plot_id,season,crop,sowing_date,seed_variety,area_sown_ha\n"
        "PLT-001,Summer2024,onion,2024-06-15,Bhima Kiran,1.5\n"
    )
    res = client.post(
        "/ingest/csv",
        data={"file_type": "sowing"},
        files={"file": ("sowing.csv", io.BytesIO(sowing_bad_season.encode("utf-8")), "text/csv")},
    )
    assert res.status_code == 422
    err = res.json()["detail"]["error"]
    assert any(e["row"] == 2 and e["field"] == "season" for e in err["details"]["errors"])

def test_ingest_all_synthetic_csvs_counts_match_ac2(client_and_session):
    client, engine = client_and_session
    from pathlib import Path

    synthetic_dir = Path(__file__).resolve().parents[2] / "data" / "synthetic"
    order = ["farmers", "plots", "sowing", "harvest", "signals", "contracts", "deliveries"]

    for file_type in order:
        csv_file = synthetic_dir / f"{file_type}.csv"
        assert csv_file.is_file()
        df = pd.read_csv(csv_file)
        expected_count = len(df)

        with open(csv_file, "rb") as f:
            res = client.post(
                "/ingest/csv",
                data={"file_type": file_type},
                files={"file": (f"{file_type}.csv", f, "text/csv")},
            )
        assert res.status_code == 200, f"Failed on {file_type}: {res.text}"
        data = res.json()
        assert data["status"] == "success"
        assert data["rows_loaded"] == expected_count, f"Count mismatch on {file_type}"
