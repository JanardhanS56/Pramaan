"""Verify canonical CSV templates in data/schema/ match design.md §3."""
from pathlib import Path
import pandas as pd

def test_canonical_csv_schemas():
    schema_dir = Path(__file__).resolve().parents[2] / "data" / "schema"
    expected_schemas = {
        "farmers.csv": ["farmer_id", "name", "phone", "joined_on", "is_active"],
        "plots.csv": ["plot_id", "farmer_id", "area_ha", "soil_type", "irrigation_type", "village"],
        "sowing.csv": ["plot_id", "season,crop", "sowing_date", "seed_variety", "area_sown_ha"], # wait, check header
        "harvest.csv": ["plot_id", "season", "crop", "harvest_date", "quantity_kg", "grade_a_pct", "grade_b_pct", "grade_c_pct"],
        "signals.csv": ["plot_id", "date", "ndvi", "rainfall_mm", "temp_c"],
        "contracts.csv": ["contract_id", "buyer_name", "crop", "grade", "quantity_t", "due_date", "penalty_per_t", "status"],
        "deliveries.csv": ["contract_id", "delivered_t", "grade_delivered", "delivered_on"],
    }
    # Fix sowing schema expectation
    expected_schemas["sowing.csv"] = ["plot_id", "season", "crop", "sowing_date", "seed_variety", "area_sown_ha"]

    for filename, expected_cols in expected_schemas.items():
        file_path = schema_dir / filename
        assert file_path.is_file(), f"Missing schema file: {filename}"
        df = pd.read_csv(file_path)
        assert list(df.columns) == expected_cols, f"Column mismatch in {filename}: {list(df.columns)} vs {expected_cols}"
        assert len(df) >= 1, f"Empty template in {filename}"
