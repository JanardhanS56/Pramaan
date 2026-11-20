# plan_and_phases.md — Execution Plan (v1)

Build in the order below. **Do not skip Phase 3 to reach the UI faster** — the backtest
is the product. The UI is the shop window; the coverage proof is the goods.

---

## Phase overview

| Phase | Name | Goal | Gate to next phase |
|---|---|---|---|
| 0 | Scaffold & data | Repo, schema, synthetic generator | `generate_data.py` is deterministic (AC1) |
| 1 | Ingest | Strict CSV validation + loaders | AC2 passes |
| 2 | Baseline forecaster | Per-crop point model + train pipeline | AC3 passes |
| 3 | **Conformal + backtest** | The moat. Calibrated intervals + coverage proof | AC4 **and** AC5 pass |
| 4 | Decision & explain | Rule gate, shortfall risk, drivers | AC6 and AC7 pass |
| 5 | API & audit | Full REST surface + reproducibility + human gate | AC8 passes |
| 6 | Frontend | Dashboard, Readiness Card, Registry, Actuals, Audit | Card renders correctly |
| 7 | Hardening & demo | Tests, config, docs, `demo.sh` | AC9 and AC10 pass |

---

## Phase 0 — Scaffold & synthetic data

**Goal:** a repo that runs, with realistic data in it.

Tasks
- [ ] Create monorepo structure exactly as in `context.md` §8
- [ ] `backend/app/config.py`: nominal levels `[0.80, 0.90]`, gate tolerance `0.05`,
      min calibration size `30`, min train rows `60`
- [ ] SQLModel table definitions for all tables in `design.md` §2
- [ ] Migration/create-all on startup (SQLite)
- [ ] `data/schema/*.csv` templates matching `design.md` §3
- [ ] `backend/app/seed/generator.py`:
  - [ ] 1 FPO, 3 crops (onion, tomato, paddy), 40–80 farmers, 1–3 plots each
  - [ ] 3 seasons of sowing + harvest with per-plot yield drawn from a
        crop-and-plot-specific distribution, with **one drought season** and
        **one bumper season**
  - [ ] NDVI series correlated with realized yield + noise; rainfall series
  - [ ] 5–6 contracts, some with recorded shortfalls
  - [ ] `--seed` flag, fully deterministic
- [ ] `scripts/generate_data.py` writes all CSVs to `data/synthetic/`

**Definition of Done**
- Two runs with `--seed 42` produce identical files (hash-compare in a test)
- Counts satisfy AC1
- At least one contract in the data is genuinely AMBER-able (so the demo has a story)

---

## Phase 1 — Ingest

**Goal:** real-world CSVs can replace synthetic ones with zero code change.

Tasks
- [ ] `core/ingest.py`: per-file validators with the rules in `design.md` §3
- [ ] Row-level error collection; never partially load a file
- [ ] `POST /ingest/csv` endpoint with multipart upload
- [ ] Loaders that upsert into the SQLModel tables
- [ ] `test_ingest.py`: one passing fixture + one failing fixture **per rule**

**DoD:** AC2 passes. Errors name the row and the field.

---

## Phase 2 — Baseline forecaster

**Goal:** a reproducible point model per crop, with a season-based split.

Tasks
- [ ] `core/features.py`: build the feature matrix in `design.md` §4; freeze and
      version the feature list (`feature_version`)
- [ ] Season-based split utility (60/20/20), never random
- [ ] `core/forecaster.py`: `GradientBoostingRegressor`, per-crop; `Ridge` fallback
- [ ] Thin-data guard: `< 30` calibration rows → seasonal-mean baseline + `low_information`
- [ ] Persist `model_run` (artifact path, metrics, feature_version)
- [ ] `scripts/train.py --crop <name>`
- [ ] `test_forecaster.py`: trained model predicts; thin-data path triggers

**DoD:** AC3 passes. Re-running training with the same seed reproduces the same metrics.

---

## Phase 3 — Conformal calibration & backtest  ★ critical path

**Goal:** the module that makes every other module honest.

Tasks
- [ ] `core/conformal.py`
  - [ ] `calibrate(residuals, alpha)` → `(q_low, q_high)` using the asymmetric
        quantile procedure in `design.md` §6
  - [ ] `predict_interval(point, q_low, q_high)` → `(L, U)`
  - [ ] `shortfall_risk(point, residuals, Q)` → float via predictive-distribution CDF
  - [ ] `low_information` flag when `U - L > 1.5 × point`
  - [ ] Persist `calibration_run`
  - [ ] Unit tests: known Gaussian noise → coverage ≈ nominal; skewed noise →
        asymmetric bounds; tiny `n` → wide bounds
- [ ] `core/backtest.py`
  - [ ] Held-out-season evaluation only
  - [ ] Metrics: empirical coverage, mean width, Winkler score, coverage by yield
        tercile, calibration size
  - [ ] PASS/FAIL against `gate_tolerance` (±0.05)
  - [ ] JSON report + CLI pretty-printer
- [ ] `scripts/backtest.py --crop <name>`
- [ ] `GET /backtest/{crop}`, `GET /health/model/{crop}`
- [ ] Gate enforcement: suggestion generation returns `409` for a closed gate

**DoD:** AC4 and AC5 pass.
**Anti-goal:** do not "improve" coverage by widening intervals arbitrarily.
Coverage *and* width are both reported; honesty comes from reporting both.

---

## Phase 4 — Decision engine & explanations

**Goal:** turn intervals into advice a board can act on.

Tasks
- [ ] `core/decision.py`: the table in `design.md` §8, exact branch behaviour
- [ ] Edge cases: `Q == L`, `Q == U`, `L == U`, `Q == 0`, `low_information` downgrade
- [ ] Multi-contract ranking by `P_short × penalty_per_t`
- [ ] `core/explain.py`:
  - [ ] Permutation importance per crop (cached on `model_run`)
  - [ ] FPO-level deterministic flags (NDVI-below-mean count, outside-selling count,
        grade-tolerance flag)
  - [ ] Rank top 2–3 drivers; plain-language `label` + `direction`
- [ ] `test_decision.py`: table-driven, every branch + every edge case
- [ ] `test_explain.py`: 2–3 drivers returned; no numeric contribution claims

**DoD:** AC6 and AC7 pass.

---

## Phase 5 — API & audit

**Goal:** the full surface, with the human gate enforced server-side.

Tasks
- [ ] All endpoints in `design.md` §10 with Pydantic v2 schemas
- [ ] `POST /suggestions/generate` → creates immutable `suggestion` rows
- [ ] `POST /suggestions/{id}/decision`:
  - [ ] `accept` / `verify` allowed freely
  - [ ] `override` requires non-empty `reason` **and** `actor` → else `422`
- [ ] `core/audit.py`: append-only `audit_event` on ingest/train/calibrate/backtest/
      suggestion/decision
- [ ] `input_hash` = SHA-256 of the sorted feature vector
- [ ] `GET /audit` paginated
- [ ] `test_audit.py`: immutability, reason enforcement, audit completeness

**DoD:** AC8 passes.

---

## Phase 6 — Frontend

**Goal:** a manager can decide in under 30 seconds per contract.

Tasks
- [ ] Next.js 14 + TS + Tailwind + Recharts scaffold; API client with typed responses
- [ ] **Dashboard**: contracts table with status chips; "Generate suggestions";
      model-health strip (coverage, calib size, gate status per crop)
- [ ] **Readiness Card**: status banner, band chart (`L`–`U` band, `Q` marker, point marker),
      80/90 confidence toggle, shortfall gauge, recommended commitment in large type,
      drivers list, version footer, action buttons
- [ ] **Override modal**: mandatory reason; shows the risk being accepted
- [ ] **Registry**: members / plots / sowing tables + CSV upload with inline row errors
- [ ] **Actuals**: harvest + delivery entry; flag contracts missing actuals
- [ ] **Audit**: paginated log with filters
- [ ] UI rules from `design.md` §11 enforced (no status without interval; AMBER/RED show
      shortfall risk; wide intervals show a warning banner)

**DoD:** the Readiness Card renders the AC6 sample correctly; override reason enforced in UI.

---

## Phase 7 — Hardening & demo

**Goal:** one command, five minutes, no hand-waving.

Tasks
- [ ] `README.md`: setup, demo command, architecture diagram, plain-English conformal
      prediction explainer
- [ ] `scripts/demo.sh`: generate → train → calibrate → backtest → serve API + UI →
      print the URL and the seeded contract ID
- [ ] Full test suite green; coverage ≥ 70% on `core/`
- [ ] Move every magic number into `config.py`
- [ ] `NOTES.md`: anything deferred, anything discovered

**DoD:** AC9 and AC10 pass. A fresh clone works.

---

## Task dependency graph

```
P0 ──► P1 ──► P2 ──► P3 ──► P4 ──► P5 ──► P6 ──► P7
                      │
                      └── P3 is the critical path. If time is short,
                          ship P0–P5 + a minimal card, and defer P6 polish.
                          Never ship without P3.
```

---

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Conformal coverage test flaky across seeds | Medium | Test asserts on aggregate pass-rate over 200 seeds, not a single run |
| Synthetic data too clean → unrealistically narrow intervals | High | Inject drought season, member attrition, outside-selling, grade variance |
| Agent builds a beautiful UI over an unvalidated model | Medium | Phase 3 gate is enforced in the API, not just in the plan |
| Drift between CSV schema and DB schema | Low | Single source of truth: Pydantic models generate both |
| Scope creep into grade modelling / satellite APIs | High | `design.md` §13 + `expected_output.md` §7; park ideas in `NOTES.md` |
| Explanation layer accidentally implies false precision | Medium | Test forbids numeric tonne-contribution strings in driver labels |

---

## Effort guide (indicative, for a single agent working with Antigravity)

| Phase | Relative effort |
|---|---|
| P0 Scaffold & data | Medium |
| P1 Ingest | Small |
| P2 Forecaster | Small–Medium |
| **P3 Conformal + backtest** | **Medium–Large** (the thinking is here) |
| P4 Decision & explain | Medium |
| P5 API & audit | Medium |
| P6 Frontend | Large |
| P7 Hardening & demo | Small–Medium |

If only half the time is available: **P0 → P5 + a single static Readiness Card page.**
That is a complete, defensible v1.