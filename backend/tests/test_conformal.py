"""Conformal prediction coverage validation — the most important test in the repo (AC4)."""
import numpy as np
import pytest
from backend.app.core.conformal import (
    compute_asymmetric_quantiles,
    predict_interval,
    compute_shortfall_risk,
)

def test_conformal_coverage_across_200_seeds_ac4():
    """AC4: Given synthetic data with known Gaussian noise, over 200 seeds,

    empirical coverage at nominal 0.80 is within [0.75, 0.85] in >= 95% of runs.
    """
    nominal_confidence = 0.80
    alpha = 1.0 - nominal_confidence
    n_seeds = 200
    n_calib = 500
    n_test = 1000

    passes = 0
    for seed in range(n_seeds):
        rng = np.random.RandomState(seed)
        calib_residuals = rng.normal(loc=0.0, scale=10.0, size=n_calib)
        test_residuals = rng.normal(loc=0.0, scale=10.0, size=n_test)

        q_low, q_high = compute_asymmetric_quantiles(calib_residuals, alpha=alpha)

        # Fraction of test points covered by [q_low, q_high]
        covered = (test_residuals >= q_low) & (test_residuals <= q_high)
        empirical_coverage = np.mean(covered)

        # Check within +- 0.05 of nominal 0.80 (i.e. [0.75, 0.85])
        if 0.75 <= empirical_coverage <= 0.85:
            passes += 1

    pass_rate = passes / n_seeds
    assert pass_rate >= 0.95, f"Coverage pass rate was {pass_rate:.2%} (< 95% required)"

def test_asymmetric_bounds_for_skewed_noise():
    """AC4: Skewed noise produces asymmetric quantiles."""
    rng = np.random.RandomState(42)
    # Skewed left (longer tail on negative residuals = severe shortfalls)
    skewed_residuals = -rng.exponential(scale=25.0, size=500) + 10.0

    q_low, q_high = compute_asymmetric_quantiles(skewed_residuals, alpha=0.20)
    # The lower quantile should be substantially wider than the upper quantile
    assert abs(q_low) > 2.0 * abs(q_high), f"Expected asymmetry: q_low={q_low}, q_high={q_high}"

def test_low_information_flag_and_interval():
    point = 100.0
    # Normal interval: lower 80, upper 120 -> width 40 <= 1.5 * 100 (150)
    lower, upper, is_low_info = predict_interval(point, q_low=-20.0, q_high=20.0)
    assert lower == 80.0
    assert upper == 120.0
    assert not is_low_info

    # Extremely wide interval: lower 20, upper 200 -> width 180 > 150
    lower_wide, upper_wide, is_low_info_wide = predict_interval(point, q_low=-80.0, q_high=100.0)
    assert lower_wide == 20.0
    assert upper_wide == 200.0
    assert is_low_info_wide

def test_shortfall_risk_computation():
    point = 80.0
    residuals = np.array([-30.0, -20.0, -10.0, 0.0, 10.0, 20.0])

    # For Q = 50: items < 50 = 0 -> risk = 0.0
    assert compute_shortfall_risk(point, residuals, contract_quantity=50.0) == 0.0

    # For Q = 75: items < 75 are 50, 60, 70 (3 out of 6) -> risk = 0.50
    assert compute_shortfall_risk(point, residuals, contract_quantity=75.0) == 0.50

    # For Q = 100: items < 100 are 50, 60, 70, 80, 90 (5 out of 6) -> risk = 5/6 ≈ 0.8333
    risk = compute_shortfall_risk(point, residuals, contract_quantity=100.0)
    assert 0.83 <= risk <= 0.84
