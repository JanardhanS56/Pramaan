# design.md — Technical Design Specification (v1)

Companion to `context.md`. The hard rules in `context.md` §3 override anything here.

---

## 1. System architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Next.js Frontend                                                │
│  Dashboard · Readiness Card · Registry · Actuals · Audit         │
└───────────────────────────┬──────────────────────────────────────┘
                            │ REST (JSON)
┌───────────────────────────▼──────────────────────────────────────┐
│  FastAPI Backend                                                 │
│                                                                  │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐  ┌─────────┐  │
│  │  ingest    │→ │  features   │→ │  forecaster  │→ │conformal│  │
│  └────────────┘  └─────────────┘  └──────────────┘  └────┬────┘  │
│                                                            │      │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐        │      │
│  │  explain   │← │  decision   │← │   backtest   │←───────┘      │
│  └────────────┘  └─────────────┘  └──────────────┘               │
│         │                │                │                      │
│         └────────────────┴────────────────┴──→ audit            │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │ SQLite / Postgres│
                   └─────────────────┘
```

**Pipeline order is fixed:** ingest → features → point forecast → conformal calibration →
backtest → decision → explain → audit. Nothing reaches the UI before the backtest has run.

---

## 2. Data model

Canonical entities. SQLite for dev; all types must be Postgres-compatible.

| Table | Key columns |
|---|---|
| `fpo` | `id`, `name`, `state`, `created_at` |
| `farmer` | `id`, `fpo_id`, `name`, `phone`, `joined_on`, `is_active` |
| `plot` | `id`, `farmer_id`, `area_ha`, `soil_type`, `irrigation_type`, `village` |
| `sowing_record` | `id`, `plot_id`, `season`, `crop`, `sowing_date`, `seed_variety`, `area_sown_ha` |
| `harvest_record` | `id`, `plot_id`, `season`, `crop`, `harvest_date`, `quantity_kg`, `grade_a_pct`, `grade_b_pct`, `grade_c_pct` |
| `signal_daily` | `id`, `plot_id` or `fpo_id`, `date`, `ndvi`, `rainfall_mm`, `temp_c` |
| `contract` | `id`, `fpo_id`, `buyer_name`, `crop`, `grade`, `quantity_t`, `due_date`, `penalty_per_t`, `status` |
| `delivery` | `id`, `contract_id`, `delivered_t`, `grade_delivered`, `delivered_on`, `shortfall_t` |
| `model_run` | `id`, `crop`, `version`, `trained_at`, `features_json`, `metrics_json`, `artifact_path` |
| `calibration_run` | `id`, `model_run_id`, `crop`, `method`, `alpha`, `calib_size`, `q_lower`, `q_upper`, `coverage_json` |
| `suggestion` | `id`, `contract_id`, `calibration_run_id`, `confidence`, `lower_t`, `upper_t`, `point_t`, `shortfall_risk`, `status`, `recommended_t`, `drivers_json`, `input_hash`, `created_at` |
| `decision_log` | `id`, `suggestion_id`, `actor`, `action` (`accept`/`override`/`verify`), `committed_t`, `reason`, `created_at` |
| `audit_event` | `id`, `entity`, `entity_id`, `event`, `payload_json`, `created_at` |

**Constraints:**
- `harvest_record` is the **only** source of truth for realized yield. Never derive ground truth from forecasts.
- `suggestion` rows are **immutable**. Corrections create a new suggestion.
- `input_hash` = SHA-256 of the sorted feature vector used to produce the suggestion.

---

## 3. Canonical CSV schemas (ingest contract)

Place templates in `data/schema/`. Validation is strict; reject with row-level errors.

**`farmers.csv`** — `farmer_id, name, phone, joined_on, is_active`
**`plots.csv`** — `plot_id, farmer_id, area_ha, soil_type, irrigation_type, village`
**`sowing.csv`** — `plot_id, season, crop, sowing_date, seed_variety, area_sown_ha`
**`harvest.csv`** — `plot_id, season, crop, harvest_date, quantity_kg, grade_a_pct, grade_b_pct, grade_c_pct`
**`signals.csv`** — `plot_id, date, ndvi, rainfall_mm, temp_c`
**`contracts.csv`** — `contract_id, buyer_name, crop, grade, quantity_t, due_date, penalty_per_t, status`
**`deliveries.csv`** — `contract_id, delivered_t, grade_delivered, delivered_on`

Validation rules: no negative quantities; `season` format `YYYY-KH` / `YYYY-RB`;
`grade_*_pct` sums to 100 ± 1; dates parseable; referential integrity on all IDs.

---

## 4. Feature builder (`core/features.py`)

Prediction unit: **(plot, season, crop)** → target = `quantity_kg`.

| Feature group | Features |
|---|---|
| Plot | `area_ha`, `soil_type` (one-hot), `irrigation_type` (one-hot) |
| Sowing | `sowing_week`, `seed_variety` (one-hot), `area_sown_ha` |
| Season signals | mean/min/max NDVI in season, NDVI anomaly vs plot's own 3-season mean, cumulative rainfall, rainfall anomaly, mean temp |
| History | farmer's previous-season yield per ha, FPO previous-season yield per ha for the crop |
| Context | `season`, `crop` (one-hot) |

Output: a tidy DataFrame persisted alongside `model_run` for reproducibility.
Feature list is frozen and versioned — changes bump the model version.

---

## 5. Point forecaster (`core/forecaster.py`)

- Model: `sklearn.ensemble.GradientBoostingRegressor` (baseline). Fallback: `Ridge`.
- Per-crop models (`crop` is a grouping key, not a feature).
- Train/calibration/backtest split: **by season**, never randomly.
  - Train: earliest 60% of seasons
  - Calibration: next 20%
  - Backtest: most recent 20% (held out, never touched during training)
- Minimum data guard: if a crop has `< 30` calibration rows, fall back to a
  **seasonal-mean baseline** and **widen the interval** — never emit a confident number
  from thin data.
- Persist artifact + metrics to `model_run`.

---

## 6. Conformal calibration (`core/conformal.py`) — the core module

**Method:** asymmetric split conformal prediction.

```
Given: point model f, calibration set {(x_i, y_i)}_{i=1..n}, nominal level 1-α

1. r_i = y_i - f(x_i)                       # signed residuals
2. alpha_tail = α / 2
3. k_low  = floor((n+1) * alpha_tail)
4. k_high = ceil((n+1) * (1 - alpha_tail))
5. q_low  = sorted(r)[k_low]                # lower residual quantile
6. q_high = sorted(r)[k_high]               # upper residual quantile
7. Interval for new x:  [ f(x) + q_low ,  f(x) + q_high ]
```

- Asymmetric quantiles are used because shortfalls have longer tails than surpluses.
- Emit **two confidence levels** per card: 80% (primary) and 90% (secondary). Always label which.
- `q_low`, `q_high`, `n`, `alpha` are persisted in `calibration_run`.
- **Guardrail:** if `q_high - q_low > 1.5 × point_estimate`, flag the interval as
  `low_information` and surface that on the card. Do not hide wide intervals.

**Shortfall risk** (used by the decision engine):

```
P(Y < Q) ≈ empirical CDF of (f(x) + r_i) evaluated at Q
```
i.e. build the *predictive distribution* `{f(x) + r_i}` from calibration residuals and
read off the probability mass below `Q`. Return a float in `[0, 1]`.

---

## 7. Backtest (`core/backtest.py`) — the proof we do not bluff

Run on the **held-out backtest season(s)** only.

Report, per crop and per nominal level (0.80, 0.90):

| Metric | Definition | Pass condition |
|---|---|---|
| **Empirical coverage** | share of held-out `y` inside the interval | within **±0.05** of nominal |
| **Mean interval width** | average `upper − lower` | reported, no pass/fail |
| **Winkler score** | interval score penalising width and misses | reported, tracked over versions |
| **Coverage by stratum** | coverage on low / mid / high actual-yield terciles | no stratum below `nominal − 0.15` |
| **Calibration size** | `n` used | reported on every card |

**Hard gate:** the API must refuse to serve suggestions for a crop whose backtest
coverage is outside ±0.05 until it is re-calibrated. Return HTTP `409` with the
backtest report. This gate is non-negotiable.

---

## 8. Decision engine (`core/decision.py`)

Inputs: `Q` (contract quantity), `[L, U]` (calibrated interval at chosen confidence),
`P_short` (shortfall risk).

| Rule | Status | `recommended_t` | Message |
|---|---|---|---|
| `L ≥ Q` | `GREEN` | `Q` | "Safe to commit — pessimistic case clears the contract." |
| `L < Q ≤ U` | `AMBER` | `floor(L)` | "Commit {L} t now. Committing {Q} t carries a {P_short:.0%} shortfall risk." |
| `U < Q` | `RED` | `0` | "Do not commit {Q} t. Even the optimistic case is {U} t." |

- If interval is `low_information`, downgrade any `GREEN` to `AMBER` and append a warning.
- Suggestion ranking (when multiple contracts compete for the same supply):
  order by `P_short × penalty_per_t` ascending (lowest downside first).
- **Never** write `recommended_t` into the `contract` table. It is advisory only.

---

## 9. Explanation layer (`core/explain.py`)

Goal: show the 2–3 signals that most moved the range, in plain language.

- Model-level: permutation importance on the calibration set → top-N features per crop.
- Case-level: for the target plot set, compute each feature's deviation from its
  season-mean and combine with the permutation importance to rank drivers.
- FPO-level flags (deterministic, cheap, high-signal):
  - "`k` of `n` member plots show NDVI below seasonal mean"
  - "`k` members sold outside the FPO last season"
  - "buyer grade tolerance tighter than historical grading accuracy"
- Output: ordered list of `{label, direction, magnitude_hint}` — **never** a false
  precision number like "this feature contributed exactly 4.2 tonnes."

---

## 10. API surface (FastAPI)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/ingest/csv` | Upload + validate a CSV; returns row-level errors |
| `POST` | `/seed/generate` | Generate synthetic dataset (seeded) |
| `POST` | `/train` | Train point model for a crop |
| `POST` | `/calibrate` | Run conformal calibration → `calibration_run` |
| `POST` | `/backtest` | Run coverage backtest → report JSON |
| `GET` | `/backtest/{crop}` | Latest backtest report |
| `POST` | `/suggestions/generate` | Produce readiness cards for open contracts |
| `GET` | `/suggestions` | List cards (filter by status, contract) |
| `GET` | `/suggestions/{id}` | Full card incl. drivers, versions, input hash |
| `POST` | `/suggestions/{id}/decision` | `{action, committed_t, reason, actor}` |
| `GET` | `/audit` | Paginated audit log |
| `GET` | `/health/model/{crop}` | Calibration size, last backtest, gate status |

**Error contract:** `{ "error": {"code": "...", "message": "...", "details": {...}} }`

---

## 11. Frontend specification

### Screens

**1. Dashboard `/`**
- Open contracts table: buyer, crop, grade, `Q`, due date, card status chip
- "Generate suggestions" button
- Model health strip: crops trained, backtest coverage, calibration size, gate status

**2. Commitment Readiness Card `/contracts/[id]`** — the core screen
- Header: contract meta, buyer requirement `Q`
- Status banner: 🟢 / 🟡 / 🔴 with the decision message
- Range visualiser (Recharts): a horizontal band from `L` to `U`, a marker at `Q`,
  a marker at point estimate — the visual must make "Q is inside/outside the range" obvious
- Confidence selector: 80% / 90%
- Shortfall risk gauge for committing `Q`
- **Recommended commitment** in large type
- Drivers list (2–3 items, plain language)
- Footer: model version, calibration version, calibration size, input hash (expandable)
- Actions: `[Verify stock & commit]` → records a `verify` decision; `[Override → board]`
  → modal requiring a **mandatory reason** and actor name

**3. Registry `/registry`**
- Members, plots, sowing records — simple tables + CSV upload
- Validation errors shown inline per row

**4. Actuals `/actuals`**
- Record harvest and delivery outcomes — this feeds the calibration ledger
- Highlight contracts where actuals are missing (the ledger is only as good as its actuals)

**5. Audit `/audit`**
- Every suggestion, decision, override, retrain, with timestamps and actors

### UI rules (must hold)
- A status chip **never** appears without its interval and confidence next to it.
- AMBER and RED cards always show shortfall risk.
- Override requires a non-empty reason — enforce in the API too, not just the UI.
- Wide/`low_information` intervals render with an explicit warning banner.

---

## 12. Reproducibility & audit (`core/audit.py`)

Every suggestion stores:
`model_run_id`, `calibration_run_id`, `confidence`, `feature_version`,
`input_hash`, `drivers_json`, `created_at`.

Every decision stores: `suggestion_id`, `actor`, `action`, `committed_t`, `reason`.

The `audit_event` table logs: ingest, train, calibrate, backtest, suggestion generated,
decision recorded, override. Append-only. No deletes.

---

## 13. Non-goals for v1 (do not build)

- Live satellite API integration (use synthetic `signals.csv`)
- Grade-yield ratio modelling (v1.1)
- Buyer-facing portal (v2)
- Multi-FPO pooling (v3)
- Payments, logistics, e-NAM/ONDC integration
- Auth/RBAC beyond a simple actor name field
- Mobile app
- Any model more exotic than gradient boosting

---

## 14. Testing requirements

- `test_conformal.py`: synthetic data with known noise → empirical coverage within ±0.05
  across 200 random seeds. This is the most important test in the repo.
- `test_decision.py`: table-driven test of all GREEN/AMBER/RED branches + edge cases
  (`Q == L`, `Q == U`, `L == U`, `low_information` downgrade).
- `test_ingest.py`: valid CSV passes; every validation rule has a failing fixture.
- `test_audit.py`: suggestion immutability; override without reason is rejected.
- `test_backtest.py`: gate returns `409` when coverage is out of tolerance.