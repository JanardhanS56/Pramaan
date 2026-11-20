# expected_output.md — Deliverables & Acceptance Criteria (v1)

This file is the contract for "done". An implementation that passes §3 is a valid v1,
regardless of how much extra was built. An implementation that fails §3 is not v1.

---

## 1. Deliverables checklist

| # | Deliverable | Location |
|---|---|---|
| D1 | Working monorepo, one-command setup | `README.md`, `scripts/demo.sh` |
| D2 | Deterministic synthetic data generator | `backend/app/seed/`, `scripts/generate_data.py` |
| D3 | Canonical CSV templates + strict validator | `data/schema/`, `backend/app/core/ingest.py` |
| D4 | Point forecaster with per-crop training | `backend/app/core/forecaster.py` |
| D5 | Asymmetric split-conformal calibration module | `backend/app/core/conformal.py` |
| D6 | Coverage backtest CLI + JSON report | `backend/app/core/backtest.py`, `scripts/backtest.py` |
| D7 | Rule-gated decision engine (GREEN/AMBER/RED) | `backend/app/core/decision.py` |
| D8 | Driver explanation layer | `backend/app/core/explain.py` |
| D9 | Audit + reproducibility logging | `backend/app/core/audit.py` |
| D10 | Full REST API | `backend/app/api/` |
| D11 | Frontend: Dashboard, Readiness Card, Registry, Actuals, Audit | `frontend/app/` |
| D12 | Test suite incl. the conformal coverage test | `backend/tests/` |
| D13 | 5-minute demo script | `scripts/demo.sh` |

---

## 2. Canonical sample outputs

### 2.1 Commitment Readiness Card — API JSON

```json
{
  "suggestion_id": "SUG-2025-11-014",
  "contract_id": "CTR-2025-07",
  "fpo_id": "FPO-001",
  "crop": "onion",
  "grade": "A",
  "buyer_requires_t": 100,
  "confidence": 0.80,
  "interval_t": { "lower": 72.4, "upper": 88.1 },
  "point_estimate_t": 80.2,
  "shortfall_risk": 0.91,
  "status": "AMBER",
  "recommended_commitment_t": 72.4,
  "low_information": false,
  "drivers": [
    { "label": "3 of 12 member plots show NDVI below seasonal mean", "direction": "negative" },
    { "label": "2 members sold outside the FPO last season", "direction": "negative" },
    { "label": "Buyer Grade A tolerance tighter than historical grading accuracy", "direction": "negative" }
  ],
  "model_version": "onion-gbr-v3",
  "calibration_version": "onion-conf-80-v3",
  "calibration_size": 64,
  "backtest_coverage": 0.81,
  "input_hash": "9f2c7a1e...",
  "created_at": "2025-11-20T09:12:00+05:30"
}
```

### 2.2 Coverage backtest report — CLI output

```
$ python scripts/backtest.py --crop onion

SETU COVERAGE BACKTEST — crop: onion
Held-out seasons: 2024-RB
Calibration set size: 64

Nominal 0.80 → Empirical coverage 0.81   [PASS, tolerance ±0.05]
Nominal 0.90 → Empirical coverage 0.88   [PASS, tolerance ±0.05]

Mean interval width : 15.7 t
Winkler score       : 21.4  (lower is better; track across versions)
Coverage by stratum : low 0.79 | mid 0.83 | high 0.80   [PASS]

GATE STATUS: OPEN — suggestions may be served for 'onion'.
```

### 2.3 Gate refusal when coverage fails

```
HTTP/1.1 409 Conflict
{
  "error": {
    "code": "BACKTEST_GATE_CLOSED",
    "message": "Calibration for 'onion' failed coverage tolerance. Re-calibrate before serving suggestions.",
    "details": { "nominal": 0.80, "empirical": 0.66, "tolerance": 0.05 }
  }
}
```

### 2.4 Override without reason — rejected

```
POST /suggestions/SUG-2025-11-014/decision
{ "action": "override", "committed_t": 100, "actor": "board_member_2" }

HTTP/1.1 422 Unprocessable Entity
{ "error": { "code": "REASON_REQUIRED",
             "message": "Overriding an AMBER/RED recommendation requires a reason." } }
```

### 2.5 UI copy — the Readiness Card must read like this

```
CONTRACT CTR-2025-07 · ONION · GRADE A · DUE 15 DEC
Buyer requires: 100 t

🟡 AMBER — Commit 72 t now. Committing 100 t carries a 91% shortfall risk.

Calibrated range (80% confidence)   72.4 t ─────── 88.1 t
Point estimate                      80.2 t
Shortfall risk at 100 t             91%

RECOMMENDED COMMITMENT              72 t

Why:
 • 3 of 12 member plots show NDVI below seasonal mean
 • 2 members sold outside the FPO last season
 • Buyer Grade A tolerance is tighter than your historical grading accuracy

Model onion-gbr-v3 · Calibration onion-conf-80-v3 · n=64 · backtest coverage 0.81
[ Verify stock & commit 72 t ]   [ Override → board ]
```

---

## 3. Acceptance criteria (must all pass)

### AC1 — Data generation
- **Given** a fixed seed, **when** `generate_data.py --seed 42` runs twice,
  **then** both outputs are byte-identical.
- **Then** the dataset contains ≥ 40 farmers, ≥ 60 plots, 3 seasons, 3 crops,
  ≥ 5 historical contracts with at least one recorded shortfall.

### AC2 — Ingest
- **Given** a CSV violating any validation rule (negative quantity, bad date,
  unknown `plot_id`, grade percentages not summing to 100 ± 1),
  **then** the API returns `422` with the failing row numbers and field names.
- **Given** a valid CSV, **then** all rows load and counts match.

### AC3 — Point forecaster
- **Given** training data for a crop with ≥ 60 rows, **then** `/train` produces a
  `model_run` with persisted artifact and metrics.
- **Given** a crop with < 30 calibration rows, **then** the system uses the
  seasonal-mean baseline and flags the resulting interval as `low_information`.

### AC4 — Conformal calibration
- **Given** synthetic data with known Gaussian noise, **when** the conformal module
  is run over 200 seeds, **then** empirical coverage at nominal 0.80 is within
  `[0.75, 0.85]` in ≥ 95% of runs. **(The most important test in the repo.)**
- **Then** lower and upper residual quantiles are asymmetric for skewed noise.

### AC5 — Backtest gate
- **Given** a crop whose backtest empirical coverage is 0.66 at nominal 0.80,
  **when** suggestions are requested, **then** the API returns `409 BACKTEST_GATE_CLOSED`.

### AC6 — Decision engine
- **Given** `L=72.4, U=88.1, Q=60` → **then** `status=GREEN`, `recommended_t=60`.
- **Given** `L=72.4, U=88.1, Q=100` → **then** `status=AMBER`, `recommended_t=72.4`,
  and `shortfall_risk > 0.8`.
- **Given** `L=40, U=55, Q=100` → **then** `status=RED`, `recommended_t=0`.
- **Given** a `low_information` interval with `L ≥ Q` → **then** status is downgraded
  to `AMBER` with a warning.

### AC7 — Explanation
- **Then** every card returns 2–3 drivers, each with a `label` and `direction`.
- **Then** no driver expresses a fabricated precise contribution in tonnes.

### AC8 — Human gate & audit
- **Given** an `override` decision with an empty `reason`, **then** the API returns `422`.
- **Given** any decision, **then** it appears in `/audit` with actor, action, timestamp.
- **Given** any suggestion, **then** `model_version`, `calibration_version`, and
  `input_hash` are present and the suggestion row is immutable (a re-run creates a new ID).

### AC9 — End-to-end demo
- **Given** a clean checkout, **when** `bash scripts/demo.sh` runs,
  **then** in under 5 minutes it: generates data → trains → calibrates → backtests
  (printing the coverage PASS lines) → starts the API and UI → and the Readiness Card
  for the seeded AMBER contract is reachable and renders correctly.

### AC10 — Docs
- **Then** `README.md` contains setup, the demo command, the architecture diagram,
  and a one-paragraph explanation of conformal prediction for a non-ML reader.

---

## 4. Quality bar

- Backend test coverage ≥ 70% on `backend/app/core/`.
- No hardcoded crop names, quantities, or buyer names in application logic.
- All tunables (nominal levels, gate tolerance, minimum calibration size) in one
  `config.py`, not scattered.
- Every API response that contains a quantity also contains its interval and confidence.

---

## 5. Demo script (target narrative, 5 minutes)

1. `bash scripts/demo.sh` — one command brings everything up.
2. Show the **Dashboard**: 3 open contracts, status chips.
3. Click the **onion contract** → the Readiness Card.
4. Point at the band chart: "Q sits outside the 80% band — that's why it's AMBER."
5. Switch confidence 80% → 90%: the band **widens**. "Honest systems widen when asked to be surer."
6. Click **Override → board**: try to submit with an empty reason → blocked. Add a reason → logged.
7. Open **Audit**: the override is there, with model version and input hash.
8. Run `python scripts/backtest.py --crop onion` live: show the coverage PASS lines.
9. Close: "We don't predict the harvest. We tell the FPO what it's allowed to promise —
   and we can prove it."

---

## 6. What "done" does NOT require

- Real satellite data
- Grade modelling
- Authentication
- Deployment/hosting
- Pretty branding
- More than one FPO tenant

---

## 7. Explicit non-goals (do not scope-creep)

Anything listed in `design.md` §13. If an agent is tempted to add a feature outside
the deliverables in §1, it should stop and note it in `NOTES.md` instead.