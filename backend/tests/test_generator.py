"""Acceptance test for AC1: Deterministic synthetic data generator."""
from pathlib import Path
import hashlib
import pandas as pd
from backend.app.seed.generator import generate_dataset, save_dataset_to_csv

def test_generator_deterministic_ac1(tmp_path):
    dir1 = tmp_path / "run1"
    dir2 = tmp_path / "run2"

    data1 = generate_dataset(seed=42)
    save_dataset_to_csv(data1, dir1)

    data2 = generate_dataset(seed=42)
    save_dataset_to_csv(data2, dir2)

    # 1. Byte-identical verification across files
    for name in data1.keys():
        f1 = dir1 / f"{name}.csv"
        f2 = dir2 / f"{name}.csv"
        assert f1.is_file() and f2.is_file()
        h1 = hashlib.sha256(f1.read_bytes()).hexdigest()
        h2 = hashlib.sha256(f2.read_bytes()).hexdigest()
        assert h1 == h2, f"File {name}.csv not byte-identical across runs!"

    # 2. AC1 counts and distributions
    # Dataset contains >= 40 farmers, >= 60 plots, 3 seasons, 3 crops, >= 5 historical contracts with at least one shortfall
    assert len(data1["farmers"]) >= 40, f"Farmers count: {len(data1['farmers'])}"
    assert len(data1["plots"]) >= 60, f"Plots count: {len(data1['plots'])}"

    seasons = set(data1["sowing"]["season"].unique())
    assert len(seasons) == 3, f"Expected 3 seasons, got {seasons}"

    crops = set(data1["sowing"]["crop"].unique())
    assert len(crops) == 3, f"Expected 3 crops, got {crops}"
    assert crops == {"onion", "tomato", "paddy"}

    contracts = data1["contracts"]
    assert len(contracts) >= 5, f"Expected >= 5 contracts, got {len(contracts)}"

    deliveries = data1["deliveries"]
    shortfalls = deliveries[deliveries["shortfall_t"] > 0]
    assert len(shortfalls) >= 1, "Expected at least one recorded contract shortfall"

    # 3. Verify at least one AMBER-able contract exists
    # Contract CTR-2024-02: requires 100t onion
    amber_contract = contracts[contracts["contract_id"] == "CTR-2024-02"]
    assert not amber_contract.empty
    assert amber_contract.iloc[0]["crop"] == "onion"
    assert amber_contract.iloc[0]["quantity_t"] == 100.0
