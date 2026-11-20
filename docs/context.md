# context.md — Project Context (read this first)

## 1. What this project is

**Setu** is a Commitment Confidence Engine for Farmer Producer Organizations (FPOs).
It ingests farm and contract data, produces a **calibrated forecast range** (not a point
number) for expected deliverable quantity, and emits a **GREEN / AMBER / RED**
commitment recommendation for a specific buyer contract, with a stated confidence level
that is empirically verified against realized outcomes.

**This repository is the v1 build.** v1 is deliberately narrow. See `design.md` §11
and `expected_output.md` §7 for explicit non-goals.

## 2. The problem being solved

An FPO must commit to supplying a fixed quantity of a crop at a fixed grade to a
processor or institutional buyer. The FPO estimates volume roughly at sowing time,
and grade only becomes known at the collection point. Forecasts are wrong, contracts
break, penalties are paid, surplus is distress-sold, and buyers leave.

Buyers do not need certainty. Buyers need **calibrated uncertainty** — a range with a
stated confidence they can plan around. Almost no tool in the market provides this.
Most provide a single number.

## 3. The non-negotiable product principle

> **The engine suggests. It never promises.**

Hard rules that must survive every implementation decision:

1. **Never emit a bare point estimate as the primary output.** Every forecast shown to
   a user must carry an interval and a confidence level.
2. **Never emit a confidence level that has not been empirically validated** by the
   coverage backtest on held-out data.
3. **Never automate a contract commitment.** The engine produces a recommendation.
   A human at the FPO must verify and act. Any override of an AMBER/RED recommendation
   must record a reason.
4. **Never hide why.** Every suggestion surfaces the top drivers that moved the range.
5. **Never silently narrow an interval.** If data is thin, the interval must widen.
   Wide and honest is correct. Narrow and false is a defect.
6. **Every suggestion must be reproducible.** Store model version, calibration version,
   and input hash with every suggestion.

## 4. Personas

| Persona | Role in v1 | What they need |
|---|---|---|
| **FPO Manager** | Primary user | A weekly card per contract: can I commit, how much, how sure, why |
| **FPO Board member** | Decision authority | Override flow with visible risk, audit trail |
| **FPO field staff** | Data entry | Fast member/plot/sowing/harvest entry, CSV upload |
| **Buyer / processor** | Read-only (v2) | A credible range they can plan around |

## 5. Domain glossary

| Term | Meaning in this project |
|---|---|
| **FPO** | Farmer Producer Organization — a collective of smallholder farmers |
| **Member / Farmer** | An individual farmer registered with the FPO |
| **Plot** | A specific parcel of land owned/farmed by a member; the unit of prediction |
| **Sowing record** | Crop, plot, area, sowing date, seed variety recorded at planting |
| **Harvest record** | Actual harvested quantity and grade at collection — the ground truth |
| **Grade** | Quality band (A / B / C) used by the buyer; Grade A commands a premium |
| **Contract** | A commitment to deliver `Q` tonnes of grade `G` of crop `C` by date `D` |
| **Delivery** | Actual quantity delivered against a contract — used to compute shortfall |
| **Shortfall** | `max(0, contract_quantity − delivered_quantity)` |
| **NDVI** | Normalized Difference Vegetation Index — a satellite vegetation-health signal |
| **Point forecaster** | Any model `f(x)` producing a single expected-yield number |
| **Calibration set** | Held-out historical records used to measure how wrong the point model is |
| **Conformal prediction** | Model-agnostic method producing intervals with finite-sample coverage guarantees |
| **Coverage** | The fraction of realized outcomes that actually fall inside the emitted interval |
| **Nominal confidence** | The confidence level we *claim* (e.g. 0.80) |
| **Empirical coverage** | The confidence level we *achieve* on held-out data (the proof) |
| **Shortfall risk** | Estimated `P(delivered < contract_quantity)` from the calibrated residual distribution |
| **GREEN / AMBER / RED** | Rule-gate status for a contract against a calibrated interval |

## 6. Data reality in v1

**There is no real FPO dataset available.** v1 therefore ships with a
**synthetic data generator** that produces realistic, seeded, reproducible data:

- 1 FPO, 3 crops, 40–80 members, 1–3 plots per member
- 3 seasons of sowing and harvest records
- Per-plot seasonal NDVI and rainfall signal series
- 3–6 historical contracts with deliveries and shortfalls
- Realistic noise: drought years, member attrition, outside-selling, grade variance

The generator must be **deterministic given a seed** so backtests are reproducible.
The schema must be **production-shaped** so real CSVs can replace synthetic ones
with no code change.

## 7. Tech stack (fixed for v1)

| Layer | Choice |
|---|---|
| Backend | Python 3.11, FastAPI, Pydantic v2 |
| ORM / DB | SQLModel or SQLAlchemy 2.x; SQLite for dev, Postgres-compatible schema |
| ML | scikit-learn (`GradientBoostingRegressor` baseline), pandas, numpy |
| Conformal | `MAPIE` if available; otherwise a hand-rolled split-conformal module (~40 lines) — **must be unit tested either way** |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS + Recharts |
| Tests | pytest (backend), a `backtest` CLI entrypoint |
| Repo | Monorepo: `/backend`, `/frontend`, `/data`, `/scripts`, `/docs` |

## 8. Repo layout

```
setu/
├── context.md
├── design.md
├── expected_output.md
├── plan_and_phases.md
├── README.md
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entrypoint
│   │   ├── models/                 # SQLModel tables
│   │   ├── schemas/                # Pydantic request/response
│   │   ├── api/                    # route modules
│   │   ├── core/
│   │   │   ├── ingest.py           # CSV validation + loaders
│   │   │   ├── features.py         # feature builder
│   │   │   ├── forecaster.py       # point model train/predict
│   │   │   ├── conformal.py        # calibration + intervals
│   │   │   ├── backtest.py         # coverage validation
│   │   │   ├── decision.py         # rule gate + shortfall risk
│   │   │   ├── explain.py          # driver attribution
│   │   │   └── audit.py            # reproducibility logging
│   │   └── seed/                   # synthetic data generator
│   └── tests/
├── frontend/
│   └── app/                        # dashboard, card, registry, audit
├── data/
│   ├── synthetic/                  # generated CSVs
│   └── schema/                     # canonical CSV templates
└── scripts/
    ├── generate_data.py
    ├── train.py
    ├── backtest.py
    └── demo.sh
```

## 9. Definition of success for v1

A reviewer can, in under five minutes and with one command:

1. Generate synthetic data.
2. Train the model and run calibration.
3. See a **coverage backtest report** showing empirical coverage within ±5% of nominal.
4. Open the UI, view a **Commitment Readiness Card** for a live contract, and see a
   calibrated range, a GREEN/AMBER/RED status, the recommended commitment, and the drivers.
5. Override an AMBER recommendation with a reason and see it appear in the audit log.

## 10. How to use these documents

- **`context.md`** (this file) — always loaded first. Product truth and hard rules.
- **`design.md`** — the build specification. Architecture, schema, algorithms, APIs, UI.
- **`expected_output.md`** — the contract for "done". Acceptance criteria and sample outputs.
- **`plan_and_phases.md`** — the execution order. Build phases in sequence; do not skip
  the backtest phase to get to the UI faster.

If any instruction in `design.md` conflicts with a hard rule in §3 of this file,
**§3 wins.**