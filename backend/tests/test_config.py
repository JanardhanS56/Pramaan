from backend.app.config import settings

def test_config_tunables():
    assert settings.NOMINAL_CONFIDENCE_LEVELS == [0.80, 0.90]
    assert settings.PRIMARY_CONFIDENCE_LEVEL == 0.80
    assert settings.BACKTEST_GATE_TOLERANCE == 0.05
    assert settings.MIN_CALIBRATION_SIZE == 30
    assert settings.MIN_TRAIN_ROWS == 60
    assert settings.LOW_INFORMATION_RATIO == 1.5
