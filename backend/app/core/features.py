"""Feature builder for Setu forecaster matching design.md §4."""
from datetime import date
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import pandas as pd
from sqlmodel import Session, select

from backend.app.models.entities import (
    Plot,
    SowingRecord,
    HarvestRecord,
    SignalDaily,
    Farmer,
)

FEATURE_VERSION = "v1.0"

# Frozen feature column names for v1.0
FEATURE_COLUMNS = [
    "area_ha",
    "area_sown_ha",
    "sowing_week",
    "soil_black",
    "soil_loamy",
    "soil_red",
    "irr_drip",
    "irr_canal",
    "irr_rainfed",
    "ndvi_mean",
    "ndvi_min",
    "ndvi_max",
    "ndvi_anomaly",
    "rainfall_cum",
    "rainfall_anomaly",
    "temp_mean",
    "farmer_prev_yield_per_ha",
    "fpo_prev_yield_per_ha",
]

def build_features_from_db(
    session: Session, crop: Optional[str] = None
) -> pd.DataFrame:
    """Extract and compile the feature matrix from the database."""
    # Query harvest, sowing, plots, signals
    harvest_stmt = select(HarvestRecord)
    if crop:
        harvest_stmt = harvest_stmt.where(HarvestRecord.crop == crop)
    harvests = session.exec(harvest_stmt).all()

    if not harvests:
        return pd.DataFrame(columns=FEATURE_COLUMNS + ["target_kg", "crop", "season", "plot_id"])

    # Load lookup tables
    plots = {p.id: p for p in session.exec(select(Plot)).all()}
    sowings = session.exec(select(SowingRecord)).all()
    signals = session.exec(select(SignalDaily)).all()

    # Index sowings by (plot_id, season, crop)
    sowing_dict = {(s.plot_id, s.season, s.crop): s for s in sowings}

    # Convert signals to DataFrame for aggregations
    sig_records = [
        {
            "plot_id": s.plot_id,
            "date": s.date,
            "ndvi": s.ndvi,
            "rainfall_mm": s.rainfall_mm,
            "temp_c": s.temp_c if s.temp_c is not None else 28.0,
        }
        for s in signals
    ]
    df_sig = pd.DataFrame(sig_records) if sig_records else pd.DataFrame(columns=["plot_id", "date", "ndvi", "rainfall_mm", "temp_c"])

    # Compute plot-level 3-season mean NDVI and mean rainfall across all available signals
    plot_mean_ndvi = df_sig.groupby("plot_id")["ndvi"].mean().to_dict() if not df_sig.empty else {}
    plot_mean_rain = df_sig.groupby("plot_id")["rainfall_mm"].sum().to_dict() if not df_sig.empty else {}

    # Sort harvests by season for chronological historical yield lookup
    harvest_list = sorted(harvests, key=lambda h: (h.season, h.plot_id))

    rows = []
    # Historical yields trackers: farmer_id -> last_yield_per_ha, crop -> last_fpo_yield_per_ha
    farmer_prev_yield: Dict[str, float] = {}
    fpo_prev_yield: Dict[str, float] = {}

    for h in harvest_list:
        plot = plots.get(h.plot_id)
        if not plot:
            continue
        sow = sowing_dict.get((h.plot_id, h.season, h.crop))
        area_sown = sow.area_sown_ha if sow else plot.area_ha
        sow_week = sow.sowing_date.isocalendar()[1] if sow else 24

        # Plot signal window for the season
        # Date filter: between sowing_date and harvest_date
        sow_date = sow.sowing_date if sow else date(2023, 1, 1)
        harv_date = h.harvest_date

        if not df_sig.empty:
            p_sig = df_sig[
                (df_sig["plot_id"] == h.plot_id)
                & (df_sig["date"] >= sow_date)
                & (df_sig["date"] <= harv_date)
            ]
        else:
            p_sig = pd.DataFrame()

        if not p_sig.empty:
            ndvi_mean = float(p_sig["ndvi"].mean())
            ndvi_min = float(p_sig["ndvi"].min())
            ndvi_max = float(p_sig["ndvi"].max())
            rainfall_cum = float(p_sig["rainfall_mm"].sum())
            temp_mean = float(p_sig["temp_c"].mean())
        else:
            ndvi_mean, ndvi_min, ndvi_max, rainfall_cum, temp_mean = 0.5, 0.3, 0.7, 100.0, 28.0

        p_base_ndvi = plot_mean_ndvi.get(h.plot_id, 0.5)
        p_base_rain = plot_mean_rain.get(h.plot_id, 100.0) / max(1, len(set(h.season for h in harvest_list)))
        ndvi_anomaly = round(ndvi_mean - p_base_ndvi, 4)
        rain_anomaly = round(rainfall_cum - p_base_rain, 2)

        # Farmer and FPO historical yield lookup
        f_id = plot.farmer_id
        hist_f_yield = farmer_prev_yield.get(f_id, h.quantity_kg / max(area_sown, 0.1))
        hist_fpo_yield = fpo_prev_yield.get(h.crop, h.quantity_kg / max(area_sown, 0.1))

        # Current yield per ha update
        curr_yield_per_ha = h.quantity_kg / max(area_sown, 0.1)
        farmer_prev_yield[f_id] = curr_yield_per_ha
        fpo_prev_yield[h.crop] = curr_yield_per_ha

        row = {
            "plot_id": h.plot_id,
            "season": h.season,
            "crop": h.crop,
            "target_kg": float(h.quantity_kg),
            "area_ha": float(plot.area_ha),
            "area_sown_ha": float(area_sown),
            "sowing_week": int(sow_week),
            "soil_black": 1 if plot.soil_type == "black" else 0,
            "soil_loamy": 1 if plot.soil_type == "loamy" else 0,
            "soil_red": 1 if plot.soil_type == "red" else 0,
            "irr_drip": 1 if plot.irrigation_type == "drip" else 0,
            "irr_canal": 1 if plot.irrigation_type == "canal" else 0,
            "irr_rainfed": 1 if plot.irrigation_type == "rainfed" else 0,
            "ndvi_mean": round(ndvi_mean, 4),
            "ndvi_min": round(ndvi_min, 4),
            "ndvi_max": round(ndvi_max, 4),
            "ndvi_anomaly": ndvi_anomaly,
            "rainfall_cum": round(rainfall_cum, 2),
            "rainfall_anomaly": rain_anomaly,
            "temp_mean": round(temp_mean, 2),
            "farmer_prev_yield_per_ha": round(hist_f_yield, 2),
            "fpo_prev_yield_per_ha": round(hist_fpo_yield, 2),
        }
        rows.append(row)

    return pd.DataFrame(rows)

def season_based_split(
    df: pd.DataFrame,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Split dataset chronologically by season into train (60%), calib (20%), and backtest (20%)."""
    distinct_seasons = sorted(df["season"].unique())
    n_seasons = len(distinct_seasons)

    if n_seasons <= 1:
        # Single season fallback
        return df, df.iloc[:0], df.iloc[:0]
    elif n_seasons == 2:
        train_seasons = distinct_seasons[:1]
        calib_seasons = distinct_seasons[1:]
        backtest_seasons = distinct_seasons[1:]
    elif n_seasons == 3:
        # Exact Setu 3-season split: 2023-KH (train), 2023-RB (calib), 2024-KH (backtest)
        train_seasons = [distinct_seasons[0]]
        calib_seasons = [distinct_seasons[1]]
        backtest_seasons = [distinct_seasons[2]]
    else:
        # General 60/20/20 chronological partition
        n_train = max(1, int(round(n_seasons * 0.6)))
        n_calib = max(1, int(round(n_seasons * 0.2)))
        train_seasons = distinct_seasons[:n_train]
        calib_seasons = distinct_seasons[n_train : n_train + n_calib]
        backtest_seasons = distinct_seasons[n_train + n_calib :]

    df_train = df[df["season"].isin(train_seasons)].reset_index(drop=True)
    df_calib = df[df["season"].isin(calib_seasons)].reset_index(drop=True)
    df_backtest = df[df["season"].isin(backtest_seasons)].reset_index(drop=True)

    return df_train, df_calib, df_backtest
