"""Setu configuration constants and tunables."""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SETU_")

    NOMINAL_CONFIDENCE_LEVELS: List[float] = [0.80, 0.90]
    PRIMARY_CONFIDENCE_LEVEL: float = 0.80
    SECONDARY_CONFIDENCE_LEVEL: float = 0.90
    BACKTEST_GATE_TOLERANCE: float = 0.05
    MIN_CALIBRATION_SIZE: int = 30
    MIN_TRAIN_ROWS: int = 60
    LOW_INFORMATION_RATIO: float = 1.5
    AMBER_MIN_LOWER_RATIO: float = 0.70
    AMBER_MIN_UPPER_RATIO: float = 0.75
    DATABASE_URL: str = "sqlite:///./setu.db"

settings = Settings()
