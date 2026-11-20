# LOGBOOK — Setu v1.0 "Pramaan"

<!-- AGENT: Read only CURRENT STATE + last 3 HISTORY entries on chat start. -->

## CURRENT STATE
_Last updated: 2026-11-20T09:11:00Z · HEAD: 3970788_
- **Phase:** Phase 0 — Scaffold & synthetic data (complete)
- **Completed phases:** Phase 0
- **Next task:** Phase 1 — CSV validators with rules in design.md §3 (`backend/app/core/ingest.py`)
- **Tests:** 5 passing / 0 failing · core coverage: 100%
- **Backtest gate:** none (P3 onward)
- **Files hot right now:** backend/app/seed/generator.py, backend/app/models/entities.py, scripts/generate_data.py, data/synthetic/*.csv
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
