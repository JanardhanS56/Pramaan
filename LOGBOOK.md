# LOGBOOK — Setu v1.0 "Pramaan"

<!-- AGENT: Read only CURRENT STATE + last 3 HISTORY entries on chat start. -->

## CURRENT STATE
_Last updated: 2026-11-20T10:56:00Z · HEAD: 5e8f981_
- **Phase:** Phase 3 — Conformal calibration & backtest (complete)
- **Completed phases:** Phase 0, Phase 1, Phase 2, Phase 3
- **Next task:** Phase 4 — Decision engine & explanations (`backend/app/core/decision.py`, `backend/app/core/explain.py`)
- **Tests:** 22 passing / 0 failing · core coverage: 100%
- **Backtest gate:** onion: OPEN (empirical coverage 0.85 @ 0.80 nominal [PASS])
- **Files hot right now:** backend/app/core/conformal.py, backend/app/core/backtest.py, scripts/backtest.py, backend/app/api/backtest.py
- **Known issues / blockers:** none
- **Open questions for the user:** none

---

## HISTORY (append-only, newest at bottom)

### 2026-11-20T10:28:00Z · Phase 1 · Ingest complete
- **Did:**
  - Built strict per-file validators in `backend/app/core/ingest.py` enforcing date formats, positive quantities, referential integrity, season pattern `YYYY-KH|RB`, and grade percentages summing to 100 ± 1.
  - Implemented row-level error reporting returning failing row numbers and field names.
  - Implemented atomic database loaders preventing partial loads on failure.
  - Built `POST /ingest/csv` multipart upload endpoint in `backend/app/api/ingest.py` returning 422 with structured validation error details.
  - Configured FastAPI lifespan handler in `backend/app/main.py`.
  - Verified AC2 with unit and API tests in `backend/tests/test_ingest.py` covering all failing rule fixtures and full synthetic dataset ingest with exact count matching.
- **Files:** `backend/app/core/ingest.py`, `backend/app/api/ingest.py`, `backend/app/main.py`, `backend/app/seed/generator.py`, `backend/tests/test_ingest.py`
- **Commits:** `2a61e5d`, `0d8f49a`, `589567e`
- **Decisions:** Enforced strict non-negative grade percentages in synthetic data generator; utilized SQLite StaticPool in tests for shared in-memory DB across request threads.
- **Deferred:** none
- **Next:** Phase 2 — Baseline forecaster (features + point models)

### 2026-11-20T10:35:00Z · Phase 2 · Baseline forecaster complete
- **Did:**
  - Implemented feature extraction pipeline in `backend/app/core/features.py` with frozen `FEATURE_COLUMNS` (`v1.0`).
  - Added chronological season-based train/calib/backtest split avoiding random leakage.
  - Implemented per-crop forecaster in `backend/app/core/forecaster.py` with `GradientBoostingRegressor` and thin-data guard (fallback to `SeasonalMeanBaselineModel` when train rows < 60 or calib rows < 30).
  - Implemented artifact persistence via joblib and `model_run` logging in SQLite.
  - Implemented `scripts/train.py` CLI supporting `--crop` and `--seed`.
  - Verified AC3 in `backend/tests/test_forecaster.py` (fixed seed reproduces identical metrics, thin-data guard triggers seasonal-mean baseline and flags is_thin_data).
- **Files:** `backend/app/core/features.py`, `backend/app/core/forecaster.py`, `scripts/train.py`, `backend/tests/test_forecaster.py`, `backend/app/seed/generator.py`
- **Commits:** `7ab45c9`, `4b382d2`, `5adb497`, `2c09240`
- **Decisions:** Stratified synthetic plots so primary crop (onion) has >= 60 training rows and >= 30 calibration rows, while paddy triggers thin-data guards for thorough testing of both pathways.
- **Deferred:** none
- **Next:** Phase 3 — Conformal calibration & backtest (the critical path)

### 2026-11-20T10:56:00Z · Phase 3 · Conformal calibration & backtest complete
- **Did:**
  - Implemented asymmetric split-conformal calibration in `backend/app/core/conformal.py` using finite-sample quantile bounds matching design.md §6.
  - Built shortfall risk calculation via empirical CDF over predictive residual distribution.
  - Implemented `low_information` guard when interval width exceeds 1.5x point forecast.
  - Verified AC4 in `backend/tests/test_conformal.py`: coverage within [0.75, 0.85] in >= 95% of 200 random seeds (achieved 97.5%), asymmetric bounds under skewed noise.
  - Built held-out season backtest in `backend/app/core/backtest.py` with empirical coverage, Winkler score, interval width, and stratum tercile coverage.
  - Built `scripts/backtest.py` CLI pretty-printer matching canonical format in design.md §7.
  - Implemented backtest API endpoints and strict gate refusal returning HTTP 409 `BACKTEST_GATE_CLOSED` on coverage violation (AC5).
  - Verified AC5 and full API surface in `backend/tests/test_backtest.py`.
- **Files:** `backend/app/core/conformal.py`, `backend/app/core/backtest.py`, `scripts/backtest.py`, `backend/app/api/backtest.py`, `backend/app/main.py`, `backend/tests/test_conformal.py`, `backend/tests/test_backtest.py`
- **Commits:** `9b073ad`, `a93b509`, `95f4be7`, `d621018`, `195d1a0`, `5e8f981`
- **Decisions:** Aligned 5 seasons to 60/20/20 split so held-out backtest season is 2024-RB with calibration on 2023-RB, matching expected_output.md §2.2 canonical test layout.
- **Deferred:** none
- **Next:** Phase 4 — Decision engine & explanations (rule gate, shortfall risk, plain-language drivers)
