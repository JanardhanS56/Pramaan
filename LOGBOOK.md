# LOGBOOK — Setu v1.0 "Pramaan"

<!-- AGENT: Read only CURRENT STATE + last 3 HISTORY entries on chat start. -->

## CURRENT STATE
_Last updated: 2026-11-20T14:42:00Z · HEAD: b53d510_
- **Phase:** Phase 6 Refactor complete · Frontend daylight institutional styling
- **Completed phases:** Phase 0, Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6, Phase 7
- **Next task:** None — UI refactored to authoritative daylight institutional ledger; v1.0 Pramaan ready.
- **Tests:** 43 passing / 0 failing · core coverage: 100% · UI: Next.js build 7/7 pages green
- **Backtest gate:** onion: OPEN (empirical coverage 0.85 @ 0.80 nominal [PASS]), tomato: OPEN (empirical coverage 0.82 @ 0.80 nominal [PASS])
- **Files hot right now:** frontend/components/Navbar.tsx, frontend/tailwind.config.js, frontend/app/globals.css
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

### 2026-11-20T12:52:00Z · Phase 4 · Decision engine & explanations complete
- **Did:**
  - Implemented rule-gated decision engine in `backend/app/core/decision.py` evaluating `[L, U]` against contract quantity `Q` and shortfall risk `P_short` (`GREEN`, `AMBER`, `RED`).
  - Implemented `low_information` downgrade converting `GREEN` to `AMBER` with warning when intervals are wide due to thin data.
  - Implemented multi-contract ranking by downside exposure (`P_short * penalty_per_t` ascending).
  - Built explanation layer in `backend/app/core/explain.py` with cached permutation feature importance and deterministic FPO-level flags (NDVI below seasonal mean, outside selling, grade tolerance).
  - Verified AC6 (all scenarios and edge cases) in `backend/tests/test_decision.py`.
  - Verified AC7 (2-3 drivers with `label` and `direction`, anti-hallucination guard against false tonne precision) in `backend/tests/test_explain.py`.
- **Files:** `backend/app/config.py`, `backend/app/core/decision.py`, `backend/app/core/explain.py`, `backend/tests/test_decision.py`, `backend/tests/test_explain.py`
- **Commits:** `7cf2b44`, `a72ade4`, `9f587fc`
- **Decisions:** Centralized `AMBER_MIN_LOWER_RATIO` (0.70) and `AMBER_MIN_UPPER_RATIO` (0.75) in `config.py`; required `L < U` for non-degenerate range AMBER classification so degenerate point predictions fall back to RED on shortfall.
- **Deferred:** none
- **Next:** Phase 5 — API & audit (FastAPI endpoints, suggestion generation, human gate reason enforcement, SHA-256 input hash, append-only audit trail)

### 2026-11-20T13:07:00Z · Phase 5 · API & audit complete
- **Did:**
  - Defined Pydantic v2 schemas in `backend/app/schemas/suggestions.py` covering suggestions, decisions, audit, and pipeline requests/responses matching design.md §10 and expected_output.md §2.1.
  - Implemented append-only audit trail and deterministic SHA-256 `input_hash` generation in `backend/app/core/audit.py`.
  - Built `POST /suggestions/generate`, `GET /suggestions`, and `GET /suggestions/{id}` endpoints enforcing backtest gate and preserving suggestion row immutability on re-runs.
  - Implemented server-side human gate in `POST /suggestions/{id}/decision` returning HTTP 422 `REASON_REQUIRED` when overriding AMBER/RED suggestions without a reason, and `ACTOR_REQUIRED` when actor is missing.
  - Built paginated audit log endpoint `GET /audit` with entity and entity_id filters.
  - Built pipeline execution endpoints `POST /train`, `POST /calibrate`, and `POST /seed/generate`.
  - Verified AC8 in `backend/tests/test_audit.py` with 12 comprehensive unit and integration tests.
- **Files:** `backend/app/schemas/suggestions.py`, `backend/app/schemas/__init__.py`, `backend/app/core/audit.py`, `backend/app/api/suggestions.py`, `backend/app/api/audit.py`, `backend/app/api/pipeline.py`, `backend/app/main.py`, `backend/tests/test_audit.py`
- **Commits:** `c790c47`, `4c1af5e`, `8b2db34`, `6f80661`
- **Decisions:** Enforced human gate strictly server-side rather than delegating validation to the frontend; re-runs generate distinct suggestion IDs to guarantee complete audit reproducibility.
- **Deferred:** none
- **Next:** Phase 6 — Frontend (Next.js 14 App Router, Commitment Readiness Card, Dashboard, Registry, Actuals, Audit)

### 2026-11-20T13:18:00Z · Phase 6 · Frontend complete
- **Did:**
  - Scaffolded Next.js 14 App Router application with Tailwind CSS and typed API client in `frontend/`.
  - Built Commitment Readiness Card screen (`/contracts/[id]`) rendering calibrated horizontal band `[L, U]`, point estimate marker, and target requirement marker `Q`.
  - Implemented 80%/90% confidence toggle, shortfall risk gauge, prominent recommended commitment, plain-language empirical drivers, and metadata footer with input hash copying.
  - Implemented board override modal with mandatory reason and actor enforcement.
  - Built Dashboard (`/`) with open contracts table and model health strip.
  - Built Registry (`/registry`), Actuals & Ledger (`/actuals`), and Audit Trail (`/audit`) screens.
  - Validated production build (`npm run build`) compiling all 7 routes with 0 errors.
- **Files:** `frontend/package.json`, `frontend/lib/api.ts`, `frontend/components/RangeVisualizer.tsx`, `frontend/components/OverrideModal.tsx`, `frontend/components/ModelHealthStrip.tsx`, `frontend/app/page.tsx`, `frontend/app/contracts/[id]/page.tsx`, `frontend/app/registry/page.tsx`, `frontend/app/actuals/page.tsx`, `frontend/app/audit/page.tsx`
- **Commits:** `879dfa8`, `61dfeb8`, `e097b37`
- **Decisions:** Visualized interval band with explicit bounds and dynamic outside-range markers to make shortfall risk intuitive; connected override workflow directly to server-side decision logging.
- **Deferred:** none
- **Next:** Phase 7 — Hardening & demo (`scripts/demo.sh`, `README.md`, `NOTES.md`, 5-minute clean run verification)

### 2026-11-20T13:24:00Z · Phase 7 · Hardening & demo complete — v1.0 Shipped
- **Did:**
  - Authored `scripts/demo.sh` and `scripts/demo.ps1` for deterministic end-to-end execution (data generation -> training -> calibration -> backtest gates -> pre-generating suggestion cards -> services launch) in under 5 minutes (AC9).
  - Wrote comprehensive `README.md` containing mission, quickstart, demo walkthrough, system architecture diagram, and plain-English explanation of conformal prediction for non-ML readers (AC10).
  - Authored `NOTES.md` documenting key discoveries (conformal exchangeability, chronological splits, thin-data safeguards, liability firewall) and listing explicit deferred items for v2.
  - Verified 100% pass across all 43 backend tests and Next.js production build compiling all 7 routes.
  - Confirmed all definition-of-done criteria satisfied in full.
- **Files:** `scripts/demo.sh`, `scripts/demo.ps1`, `README.md`, `NOTES.md`
- **Commits:** `f51dd8b`, `5bdb801`
- **Decisions:** Created native PowerShell runner alongside bash script to allow zero-friction cross-platform execution on Windows without WSL or Git Bash prerequisites.
- **Deferred:** Documented in `NOTES.md`
- **Next:** v1.0 Pramaan is complete and ready for demonstration!

### 2026-11-20T14:42:00Z · Phase 6 · Frontend daylight institutional styling refactor
- **Did:**
  - Replaced generic dark-mode styling with an authoritative daylight-readable agricultural-fintech ledger inspired by Linear and Stripe light mode for Sahyadri FPO.
  - Enforced strict 60/30/10 color system: 60% warm off-white canvas (#F9FAF8) and pure white card/table surfaces (#FFFFFF); 30% solid Farmer Green (#1F4E35), hover (#163A27), and soft sage tint (#EAF2ED); 10% charcoal text (#1C201E), slate secondary (#5A635E), hairline dividers (#DCE1DD), and muted badges (#F0F2F0); muted semantic alerts for error (#B42318 on #FEF3F2) and warning (#B54708 on #FFFAEB).
  - Replaced top horizontal navbar with fixed left vertical sidebar (width ~240px) in solid Farmer Green (#1F4E35) with flat typographic brand lockup ("Setu", "Pramaan v1.0"), crisp white links, sage-tinted active states, and "Sahyadri FPO" anchored at the bottom.
  - Tightened border radii across the entire app to 6px (`rounded-md`) for cards and 4px (`rounded`) for buttons, inputs, and badges; removed all neon drop-shadow glows and gradients.
  - Configured typography with Inter for UI/headings (semi-bold 600, tight tracking) and IBM Plex Mono (with tabular figures) strictly for Contract IDs, tonnages, timestamps, and calibrated `[L, U]` intervals.
  - Maintained 100% functionality and state across all API endpoints, models, and forms.
- **Files:** `frontend/tailwind.config.js`, `frontend/app/globals.css`, `frontend/app/layout.tsx`, `frontend/components/Navbar.tsx`, `frontend/components/ModelHealthStrip.tsx`, `frontend/components/RangeVisualizer.tsx`, `frontend/components/OverrideModal.tsx`, `frontend/app/page.tsx`, `frontend/app/contracts/[id]/page.tsx`, `frontend/app/registry/page.tsx`, `frontend/app/actuals/page.tsx`, `frontend/app/audit/page.tsx`
- **Commits:** `b53d510`
- **Decisions:** Kept zero-dependency styling with native Tailwind utility classes mapped to strict hex design tokens; preserved all API interfaces and routing contracts identically.
- **Deferred:** none
- **Next:** Frontend verification complete.
