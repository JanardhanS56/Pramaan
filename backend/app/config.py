"""Setu configuration constants and tunables."""
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    NOMINAL_CONFIDENCE_LEVELS: List[float] = [0.80, 0.90]
    PRIMARY_CONFIDENCE_LEVEL: float = 0.80
    SECONDARY_CONFIDENCE_LEVEL: float = 0.90
    BACKTEST_GATE_TOLERANCE: float = 0.05
    MIN_CALIBRATION_SIZE: int = 30
    MIN_TRAIN_ROWS: int = 60
    LOW_INFORMATION_RATIO: float = 1.5
    DATABASE_URL: str = "sqlite:///./setu.db"

    class Config:
        env_prefix = "SETU_"

settings = Settings()
