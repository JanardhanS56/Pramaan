# Setu v1.0 "Pramaan" — Commitment Confidence Engine for FPOs

> **"We don't predict the harvest. We tell the FPO how much it is allowed to promise — with a confidence level that is empirically proven, not asserted."**

---

## What is Setu Pramaan?

When a commercial buyer (e.g., Reliance Retail, BigBasket, Sahyadri Processors) demands an upfront contract for **100 tonnes of Grade-A Onions**, Farmer Producer Organizations (FPOs) face an asymmetrical liability:
- **Overpromise:** Fall short at harvest, pay steep contractual penalties (₹1,500/t+), and destroy buyer trust.
- **Underpromise:** Turn away commercial business, leaving member farmers stranded with distress mandi sales.

Traditional yield models give a single point estimate (e.g., *"you will produce 80.2 tonnes"*), hiding forecast error.

**Setu Pramaan replaces single point estimates with empirically calibrated intervals `[L, U]` backed by finite-sample distribution-free guarantees.** If the engine recommends committing 72 tonnes, it proves via historical backtesting on held-out seasons that its 80% confidence intervals truly covered 80% of reality.

---

## Conformal Prediction Explained for Non-ML Readers

> Imagine predicting tomorrow's temperature. A meteorologist who says *"it will be exactly 28°C"* is almost certainly going to be wrong. A useful forecast says *"with 80% certainty, it will be between 25°C and 31°C."* But how do you know the 80% isn't made up?
>
> **Conformal prediction** looks at the model's past errors on real past seasons. It calculates the exact error margin needed so that 80% of historical harvests landed safely inside the bracket. Because it makes no assumptions about normal bell curves or standard distributions, it provides a mathematically rigorous guarantee: **as long as future growing conditions resemble past ones, at least 80% of actual harvests will land inside our bracket.** When asked to be 90% sure, an honest system widens its bracket; when data is thin, it widens further. Wide and honest is safe; narrow and false leads to defaults.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Next.js 14 Frontend                                             │
│  Dashboard · Readiness Card · Registry · Actuals · Audit         │
└───────────────────────────┬──────────────────────────────────────┘
                            │ REST (JSON)
┌───────────────────────────▼──────────────────────────────────────┐
│  FastAPI Backend                                                 │
│                                                                  │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐  ┌─────────┐  │
│  │  ingest    │→ │  features   │→ │  forecaster  │→ │conformal│  │
│  └────────────┘  └─────────────┘  └──────────────┘  └────┬────┘  │
│                                                            │     │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐        │     │
│  │  explain   │← │  decision   │← │   backtest   │←───────┘     │
│  └────────────┘  └─────────────┘  └──────────────┘              │
│         │                │                │                     │
│         └────────────────┴────────────────┴──→ audit           │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │ SQLite / Postgres│
                   └─────────────────┘
```

**Fixed Pipeline Order:** Ingest → Features → Forecaster → Conformal Calibration → Backtest Gate → Decision Engine → Explainability → Immutable Audit.

---

## Quickstart & 5-Minute Demo

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. End-to-End One-Command Demo (AC9)
```bash
# On Linux / macOS / Git Bash:
bash scripts/demo.sh

# On Windows PowerShell:
.\scripts\demo.ps1
```

In under 5 minutes, this script will:
1. Generate deterministic synthetic data (seed 42).
2. Ingest records with strict schema validation.
3. Train Gradient Boosting Regressors and seasonal-mean baseline models.
4. Execute the held-out season (2024-RB) coverage backtest (printing PASS lines).
5. Pre-generate Commitment Readiness Cards.
6. Launch FastAPI backend (`http://127.0.0.1:8000`) and Next.js UI (`http://localhost:3000`).

---

## 5-Minute Demo Walkthrough

1. Open **`http://localhost:3000`** in your browser.
2. Review the **Model Health Strip** at the top: observe that the backtest gate is **OPEN** for onion (empirical coverage `0.85 @ 0.80 nominal [PASS]`).
3. Click on contract **`CTR-2025-07`** (Onion, 100 t requested by Reliance Retail).
4. Review the **Readiness Card**:
   - Status: **🟡 AMBER**
   - Calibrated 80% range: **`72.4 t ─────── 88.1 t`**
   - Point estimate: **`80.2 t`**
   - Shortfall risk at 100 t: **`91%`**
   - Recommended commitment: **`72 t`**
5. Note the horizontal band chart: buyer requirement $Q = 100\text{ t}$ sits visibly outside the 80% confidence band.
6. Toggle confidence to **90%**: observe that the band honestly widens.
7. Click **`Override → board`**:
   - Attempt to submit without a reason: notice that the client and API block it (`HTTP 422 REASON_REQUIRED`).
   - Enter a reason (*"Verified 25t reserve buffer in local cold storage"*), enter actor (*"board_chairperson"*), and submit.
8. Navigate to **`Audit Trail`** (`/audit`): observe the override recorded with actor, timestamp, and SHA-256 state hash.

---

## Non-Negotiable Product Rules

1. **Never emit a bare point estimate as a primary output.** Every forecast carries an interval `[L, U]` and confidence level.
2. **Never emit a confidence level not validated by a backtest.** If empirical coverage fails tolerance ($\pm 0.05$), the gate closes and suggestions return `HTTP 409 BACKTEST_GATE_CLOSED`.
3. **Never automate a contract commitment.** The engine recommends; a human verifies. Overriding an AMBER/RED suggestion requires a mandatory reason enforced server-side.
4. **Never hide why.** Every card surfaces 2–3 plain-language empirical drivers without fabricated tonne claims.
5. **Never silently narrow an interval.** Thin data produces wider intervals and triggers a `low_information` caution flag.
6. **Every suggestion is reproducible.** Each row records `model_version`, `calibration_version`, and a SHA-256 `input_hash`.

---

## Running Verification Tests

```bash
# Run backend test suite (43 unit & API integration tests)
python -m pytest backend/tests/ -v

# Run the 200-seed conformal coverage test (AC4)
python -m pytest backend/tests/test_conformal.py -k "test_conformal_coverage" -v

# Verify Next.js frontend production build
cd frontend && npm run build
```

---

## License
MIT License. Built for Farmer Producer Organizations.
