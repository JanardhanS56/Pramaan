"""Deterministic synthetic data generator for Setu v1.0 Pramaan."""
import argparse
from pathlib import Path
from datetime import date, timedelta
from typing import Dict, List, Tuple
import numpy as np
import pandas as pd

CROPS = ["onion", "tomato", "paddy"]
VARIETIES = {
    "onion": ["Bhima Kiran", "Bhima Red", "AgriFound Light Red"],
    "tomato": ["Abhinav", "Arka Rakshak", "Pusa Ruby"],
    "paddy": ["Indrayani", "Basmati 370", "BPT 5204"],
}
BASE_YIELDS = {
    "onion": 18000.0,   # kg / ha
    "tomato": 24000.0,  # kg / ha
    "paddy": 5200.0,    # kg / ha
}

# 5 seasons matching 60/20/20 chronological partition:
# Train: 2022-KH, 2022-RB (drought), 2023-KH (bumper) -> 60%
# Calib: 2023-RB -> 20%
# Backtest: 2024-RB (held out) -> 20%
SEASONS = [
    {
        "name": "2022-KH",
        "type": "kharif",
        "factor": 1.00,
        "sow_start": date(2022, 6, 15),
        "harvest_start": date(2022, 10, 20),
    },
    {
        "name": "2022-RB",
        "type": "rabi_drought",
        "factor": 0.75,
        "sow_start": date(2022, 11, 15),
        "harvest_start": date(2023, 3, 25),
    },
    {
        "name": "2023-KH",
        "type": "kharif_bumper",
        "factor": 1.05,
        "sow_start": date(2023, 6, 15),
        "harvest_start": date(2023, 10, 20),
    },
    {
        "name": "2023-RB",
        "type": "rabi_calib",
        "factor": 0.92,
        "sow_start": date(2023, 11, 15),
        "harvest_start": date(2024, 3, 25),
    },
    {
        "name": "2024-RB",
        "type": "rabi_heldout",
        "factor": 0.92,
        "sow_start": date(2024, 11, 15),
        "harvest_start": date(2025, 3, 25),
    },
]

SOIL_FACTORS = {"black": 1.08, "loamy": 1.02, "red": 0.92}
IRRIGATION_FACTORS = {"drip": 1.15, "canal": 1.04, "rainfed": 0.85}
VILLAGES = ["Pimpalgaon", "Dindori", "Niphad", "Yeola", "Sinnar"]

FIRST_NAMES = ["Ramesh", "Suresh", "Santosh", "Dnyaneshwar", "Bhausaheb", "Sunil", "Anil", "Eknath", "Pandurang", "Ganesh"]
LAST_NAMES = ["Patil", "Deshmukh", "Jadhav", "Shinde", "Pawar", "Kadam", "Gaikwad", "More", "Chavan", "Bhosale"]

def generate_dataset(seed: int = 42) -> Dict[str, pd.DataFrame]:
    rng = np.random.RandomState(seed)

    # 1. Farmers (60 farmers, within 40-80)
    num_farmers = 60
    farmers_data = []
    for i in range(1, num_farmers + 1):
        f_id = f"FAR-{i:03d}"
        fn = rng.choice(FIRST_NAMES)
        ln = rng.choice(LAST_NAMES)
        phone = f"98{rng.randint(10000000, 99999999)}"
        join_year = rng.choice([2020, 2021, 2022])
        join_date = date(join_year, rng.randint(1, 12), rng.randint(1, 28))
        farmers_data.append({
            "farmer_id": f_id,
            "name": f"{fn} {ln}",
            "phone": phone,
            "joined_on": join_date.isoformat(),
            "is_active": True,
        })
    df_farmers = pd.DataFrame(farmers_data)

    # 2. Plots (150 plots across 60 farmers, 2-3 plots each)
    # 65 onion plots, 60 tomato plots, 25 paddy plots
    plots_data = []
    plot_idx = 1
    for i in range(1, num_farmers + 1):
        f_id = f"FAR-{i:03d}"
        plots_for_farmer = 3 if i <= 30 else 2
        for _ in range(plots_for_farmer):
            p_id = f"PLT-{plot_idx:03d}"
            area = round(float(rng.uniform(0.8, 2.2)), 2)
            soil = rng.choice(["black", "loamy", "red"], p=[0.5, 0.3, 0.2])
            irr = rng.choice(["drip", "canal", "rainfed"], p=[0.5, 0.3, 0.2])
            village = rng.choice(VILLAGES)
            plots_data.append({
                "plot_id": p_id,
                "farmer_id": f_id,
                "area_ha": area,
                "soil_type": soil,
                "irrigation_type": irr,
                "village": village,
            })
            plot_idx += 1
    df_plots = pd.DataFrame(plots_data)

    # 3. Sowing & Harvest across 5 seasons
    sowing_data = []
    harvest_data = []
    signals_data = []

    for s_info in SEASONS:
        season_name = s_info["name"]
        season_factor = s_info["factor"]
        is_kh = "KH" in season_name
        is_drought = "drought" in s_info["type"]

        for _, plot in df_plots.iterrows():
            p_id = plot["plot_id"]
            p_area = plot["area_ha"]
            p_soil = plot["soil_type"]
            p_irr = plot["irrigation_type"]

            p_num = int(p_id.split("-")[1])
            if p_num <= 65:
                crop = "onion"
            elif p_num <= 125:
                crop = "tomato"
            else:
                crop = "paddy"

            variety = rng.choice(VARIETIES[crop])
            sow_offset = rng.randint(-5, 6)
            sow_date = s_info["sow_start"] + timedelta(days=sow_offset)
            area_sown = round(p_area * rng.uniform(0.92, 1.0), 2)

            sowing_data.append({
                "plot_id": p_id,
                "season": season_name,
                "crop": crop,
                "sowing_date": sow_date.isoformat(),
                "seed_variety": variety,
                "area_sown_ha": area_sown,
            })

            # Calculate yield
            irr_mult = IRRIGATION_FACTORS[p_irr] * (0.75 if is_drought and p_irr == "rainfed" else 1.0)
            soil_factor = SOIL_FACTORS[p_soil]
            noise = rng.normal(1.0, 0.055)
            per_ha_yield = BASE_YIELDS[crop] * season_factor * soil_factor * irr_mult * noise
            per_ha_yield = max(per_ha_yield, BASE_YIELDS[crop] * 0.3)
            tot_yield_kg = round(float(per_ha_yield * area_sown), 1)

            # Grade distribution
            if is_drought:
                g_a = round(float(rng.uniform(38.0, 48.0)), 1)
                g_b = round(float(rng.uniform(32.0, 38.0)), 1)
            else:
                g_a = round(float(rng.uniform(52.0, 64.0)), 1)
                g_b = round(float(rng.uniform(22.0, 28.0)), 1)
            g_c = round(100.0 - g_a - g_b, 1)

            harv_offset = rng.randint(-5, 6)
            harv_date = s_info["harvest_start"] + timedelta(days=harv_offset)

            harvest_data.append({
                "plot_id": p_id,
                "season": season_name,
                "crop": crop,
                "harvest_date": harv_date.isoformat(),
                "quantity_kg": tot_yield_kg,
                "grade_a_pct": g_a,
                "grade_b_pct": g_b,
                "grade_c_pct": g_c,
            })

            # Daily signals: sample 8 checkpoints per season per plot
            season_days = (harv_date - sow_date).days
            for step in range(8):
                cur_date = sow_date + timedelta(days=int(step * season_days / 7))
                frac = step / 7.0
                peak_factor = np.sin(frac * np.pi)
                base_ndvi = (0.55 if is_kh else 0.48) * season_factor * irr_mult
                ndvi = round(float(np.clip(base_ndvi + 0.25 * peak_factor + rng.normal(0, 0.02), 0.15, 0.90)), 2)

                base_rain = 160.0 if is_kh else 35.0
                rainfall = round(float(np.clip(base_rain * season_factor * (irr_mult if p_irr == "rainfed" else 1.0) / 8.0 + rng.normal(0, 2.0), 0.0, 100.0)), 1)
                temp = round(float(rng.uniform(24.0, 32.0)), 1)

                signals_data.append({
                    "plot_id": p_id,
                    "date": cur_date.isoformat(),
                    "ndvi": ndvi,
                    "rainfall_mm": rainfall,
                    "temp_c": temp,
                })

    df_sowing = pd.DataFrame(sowing_data)
    df_harvest = pd.DataFrame(harvest_data)
    df_signals = pd.DataFrame(signals_data)

    # 4. Contracts (6 contracts: 4 historical, 2 open in 2024-RB)
    contracts_data = [
        {
            "contract_id": "CTR-2023-01",
            "buyer_name": "AgroFresh Foods",
            "crop": "onion",
            "grade": "A",
            "quantity_t": 70.0,
            "due_date": "2023-11-15",
            "penalty_per_t": 1500.0,
            "status": "COMPLETED",
        },
        {
            "contract_id": "CTR-2023-02",
            "buyer_name": "Kisan Exports",
            "crop": "onion",
            "grade": "A",
            "quantity_t": 85.0,
            "due_date": "2024-04-15",
            "penalty_per_t": 2000.0,
            "status": "BREACHED",  # Recorded shortfall in drought season
        },
        {
            "contract_id": "CTR-2023-03",
            "buyer_name": "Metro Pure Veg",
            "crop": "tomato",
            "grade": "A",
            "quantity_t": 110.0,
            "due_date": "2023-11-05",
            "penalty_per_t": 1200.0,
            "status": "COMPLETED",
        },
        {
            "contract_id": "CTR-2024-01",
            "buyer_name": "Deccan Rice Millers",
            "crop": "paddy",
            "grade": "A",
            "quantity_t": 45.0,
            "due_date": "2024-11-30",
            "penalty_per_t": 1800.0,
            "status": "COMPLETED",
        },
        {
            "contract_id": "CTR-2025-07",
            "buyer_name": "Reliance Retail Agri",
            "crop": "onion",
            "grade": "A",
            "quantity_t": 100.0,  # Buyer asks 100t, expected yield range ~72-88t -> AMBER
            "due_date": "2025-04-15",
            "penalty_per_t": 1500.0,
            "status": "OPEN",
        },
        {
            "contract_id": "CTR-2025-08",
            "buyer_name": "Sahyadri Processors",
            "crop": "tomato",
            "grade": "B",
            "quantity_t": 60.0,   # Safe commitment -> GREEN
            "due_date": "2025-04-20",
            "penalty_per_t": 1000.0,
            "status": "OPEN",
        },
    ]
    df_contracts = pd.DataFrame(contracts_data)

    # 5. Deliveries for past contracts
    deliveries_data = [
        {
            "contract_id": "CTR-2023-01",
            "delivered_t": 72.5,
            "grade_delivered": "A",
            "delivered_on": "2023-11-14",
            "shortfall_t": 0.0,
        },
        {
            "contract_id": "CTR-2023-02",
            "delivered_t": 61.2,
            "grade_delivered": "A",
            "delivered_on": "2024-04-14",
            "shortfall_t": 23.8,  # Shortfall of 23.8 tonnes
        },
        {
            "contract_id": "CTR-2023-03",
            "delivered_t": 112.0,
            "grade_delivered": "A",
            "delivered_on": "2023-11-04",
            "shortfall_t": 0.0,
        },
        {
            "contract_id": "CTR-2024-01",
            "delivered_t": 46.8,
            "grade_delivered": "A",
            "delivered_on": "2024-11-28",
            "shortfall_t": 0.0,
        },
    ]
    df_deliveries = pd.DataFrame(deliveries_data)

    return {
        "farmers": df_farmers,
        "plots": df_plots,
        "sowing": df_sowing,
        "harvest": df_harvest,
        "signals": df_signals,
        "contracts": df_contracts,
        "deliveries": df_deliveries,
    }

def save_dataset_to_csv(data: Dict[str, pd.DataFrame], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for name, df in data.items():
        csv_path = output_dir / f"{name}.csv"
        df.to_csv(csv_path, index=False)
