# LOGBOOK — Setu v1.0 "Pramaan"

<!-- AGENT: Read only CURRENT STATE + last 3 HISTORY entries on chat start. -->

## CURRENT STATE
_Last updated: 2026-11-20T10:28:00Z · HEAD: 589567e_
- **Phase:** Phase 1 — Ingest (complete)
- **Completed phases:** Phase 0, Phase 1
- **Next task:** Phase 2 — Feature builder (`backend/app/core/features.py`) and point forecaster
- **Tests:** 12 passing / 0 failing · core coverage: 100%
- **Backtest gate:** none (P3 onward)
- **Files hot right now:** backend/app/core/ingest.py, backend/app/api/ingest.py, backend/tests/test_ingest.py
- **Known issues / blockers:** none
- **Open questions for the user:** none

---

## HISTORY (append-only, newest at bottom)

### 2026-11-20T09:11:00Z · Phase 0 · Scaffold & synthetic data complete
- **Did:**
  - Initialized monorepo layout matching context.md §8 and git repository with remote origin.
  - Implemented centralized configuration tunables in `backend/app/config.py`.
  - Defined SQLModel entities matching design.md §2 and database startup initialization in `backend/app/db.py`.
  - Added canonical CSV templates in `data/schema/`.
  - Implemented deterministic synthetic data generator with 1 FPO, 3 crops, 50 farmers, 75 plots, 3 seasons (including drought and bumper), correlated signals, and 6 contracts (including AMBER contract CTR-2024-02).
  - Implemented `scripts/generate_data.py` CLI and generated synthetic CSVs in `data/synthetic/`.
  - Passed AC1 acceptance test (byte-identical generation across seeds, counts, contract shortfall).
- **Files:** `backend/app/config.py`, `backend/app/db.py`, `backend/app/models/entities.py`, `backend/app/seed/generator.py`, `scripts/generate_data.py`, `data/schema/*.csv`, `data/synthetic/*.csv`, `backend/tests/*`
- **Commits:** `a8fc14b`, `3d58129`, `ca591ad`, `739d712`, `853d46a`, `3970788`
- **Decisions:** Used pure-Python SQLAlchemy 2.0 wheel to prevent Windows Application Control DLL load issues; standardized on timezone-aware datetimes; configured deterministic seed generation with seeded shortfall.
- **Deferred:** none
- **Next:** Phase 1 — Ingest (strict CSV validation + loaders)

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
