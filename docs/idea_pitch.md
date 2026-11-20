# Setu
### The Commitment Confidence Engine for Farmer Producer Organizations

> **"Never overpromise. Never undercommit."**

---

## The 30-second hook

An FPO signs a contract for 100 tonnes of Grade A onions.
It delivers 63 tonnes.
The processor pays a penalty clause, buys the shortfall at 2× from the mandi, and quietly never calls again.

The farmers did not fail. The monsoon did not fail.
**The FPO was simply never told how confident it was allowed to be.**

That is the entire problem. And today, nobody sells the answer.

---

## 1. The problem, in plain words

Processors and institutional buyers need **predictable volume and predictable quality**. FPOs want to supply them — that is how member farmers get better prices.

But an FPO cannot honestly say *"we will deliver 100 tonnes"* because:

- It does not know how much its members will actually harvest.
- It does not know what **grade** that harvest will be until it reaches the collection point.
- Its current method is a **rough estimate made at sowing time** — essentially a guess with a number attached.

So commitments are made on hope. When hope fails:

| Who | What it costs them |
|---|---|
| **FPO** | Broken contracts, penalty payments, distress sale of surplus at throwaway prices |
| **Member farmers** | Lower realizations, lost trust in the FPO, they start selling outside |
| **Buyer / processor** | Emergency procurement at a premium, production disruption, they go elsewhere |
| **The sector** | Everyone stays in the informal, low-trust spot market |

The PS asks one sharp question under *"Following the money"*:
**What does a buyer spend today covering for supply that never arrived?**
That number — the emergency premium, the penalty, the lost contract — is the market we are addressing.

---

## 2. Why the current tools don't solve it

There are already many good pieces in the market. They are **fragments**, and none of them close the loop.

| Fragment | What it does | What it misses |
|---|---|---|
| FPO ERP platforms (GramworkX, Finnid, Transity) | Dashboards, member records, harvest schedules | Forecasts are **point numbers**, not honest ranges |
| Satellite yield models (AgroOps, Arya Shakti, SatSure) | Predicts yield weeks before harvest | Gives a number **without a calibrated confidence** the buyer will accept |
| Grading / computer vision (Agrograde and similar) | Grades produce at collection | Works **after** the commitment is already made |
| Market linkage (Kisansetu, Agrizy, ONDC, e-NAM) | Connects FPOs to buyers | Matches **existing** stock, doesn't de-risk **future** commitments |
| Government forecasts (FASAL / MNCFC) | National and regional crop forecasts | Too coarse for **one FPO's contract with one buyer** |

**The missing piece is not another predictor.**
It is the **trust layer** that sits between all of these and answers the only question the FPO board actually has:

> *"How much can I safely promise this buyer, and how sure am I?"*

---

## 3. The core insight: calibrated uncertainty beats confident guessing

Buyers do not need certainty. They need **honesty they can plan around**.

A buyer will happily accept:
> *"We are 80% confident we can deliver between 72 and 88 tonnes of Grade A."*

A buyer will **never forgive**:
> *"We will deliver 100 tonnes."* → delivers 63.

**A wide, honest range is a product. A narrow, false number is a bluff.**

So the design principle of Setu is:

> **The engine suggests. It never promises. Every number it emits carries a stated confidence, and that confidence is empirically verified against what actually happened.**

The final contract decision stays with the **FPO board** — the PS explicitly draws this boundary, and we treat it as a design law, not a disclaimer.

---

## 4. What we build — the four layers

Setu is not a replacement for the tools an FPO already uses. It is the **connector and the decision layer** on top of them.

```
┌──────────────────────────────────────────────────────────────┐
│  LAYER 4 — SUGGESTION SURFACE                                │
│  Commitment Readiness Card · drivers shown · board override  │
├──────────────────────────────────────────────────────────────┤
│  LAYER 3 — CONSTRAINED DECISION ENGINE                       │
│  Rule gate (GREEN / AMBER / RED) · shortfall-risk ranking    │
├──────────────────────────────────────────────────────────────┤
│  LAYER 2 — CALIBRATED UNCERTAINTY ENGINE  ★ the moat         │
│  Conformal prediction · empirical coverage backtest          │
├──────────────────────────────────────────────────────────────┤
│  LAYER 1 — INTEROPERABILITY FABRIC                           │
│  Ingest from existing tools + FPO ground truth (CSV / API)   │
└──────────────────────────────────────────────────────────────┘
```

### Layer 1 — Interoperability fabric (the connector)

Fragments exist because every tool speaks a different data dialect. We build a **thin, API-first ingestion layer** that pulls from what already exists and never forces an FPO to abandon a tool.

- **Upstream signals:** satellite NDVI, rainfall, temperature, soil moisture, market prices — via existing API providers rather than building our own remote-sensing stack.
- **FPO ground truth:** farmer registry → plot → sowing record → harvest record → dispatch → settlement. This operational chain is the *only* source of **actual harvested quantity**, which is what calibrates everything else.
- **Buyer history:** past contracts, actual deliveries, shortfall incidents, grade rejection rates.
- **Low-friction entry:** if the FPO is still on spreadsheets, a **CSV upload path** with schema validation is a first-class citizen, not a fallback.

### Layer 2 — Calibrated uncertainty engine (the moat)

This is the piece almost nobody in the market does properly. Most tools emit *"expected yield: 104 tonnes."* We emit *"72–88 tonnes at 80% confidence"* — **and we can prove the 80% is real.**

**Technique: split conformal prediction.** It is model-agnostic, requires no retraining of upstream models, and provides **finite-sample coverage guarantees**.

How it works, in five lines:

1. Train (or accept) any point forecaster `f(x)` on a training split.
2. On a held-out **calibration set** of `n` past seasons, compute residuals `s_i = |y_i − f(x_i)|`.
3. Take `q` = the ⌈(n+1)(1−α)⌉/n empirical quantile of those residuals.
4. Prediction interval for a new plot/season = `[f(x) − q, f(x) + q]`.
5. That interval has **≥ (1−α) coverage** — if we say 80%, roughly 80% of outcomes fall inside it.

We use **asymmetric residual quantiles** (separate lower and upper bounds) because agricultural shortfalls are not symmetric — drought tails are longer than bumper-crop tails.

**The honest behaviour is the feature:** if the upstream model is bad or the season is unusual, the interval **widens**. A wide range is a valid, useful output. A narrow lie is not.

**The verification loop:** every completed contract — actual delivered quantity, actual grade at collection — flows back into the calibration set. Over two to three seasons, this **realized-outcome ledger becomes the most valuable asset in the system**, because it is the empirical proof that the engine's confidence statements can be trusted.

### Layer 3 — Constrained decision engine (advisor, never oracle)

Contract commitments carry **financial penalties**, so pure ML recommendations are inappropriate. The engine is rule-gated.

Given a calibrated interval `[L, U]` at confidence `c`, and a buyer contract requiring `Q` tonnes:

| Condition | Status | What the board is told |
|---|---|---|
| `L ≥ Q` | 🟢 **GREEN** | Safe to commit — even the pessimistic case clears the contract |
| `L < Q ≤ U` | 🟡 **AMBER** | Commit only `L` tonnes, or commit `Q` with a stated shortfall risk |
| `U < Q` | 🔴 **RED** | Do not commit this quantity — even the optimistic case fails |

**Shortfall risk** is read directly off the calibrated residual distribution:
`P(Y < Q)` estimated from the empirical CDF of calibration residuals. No hand-waving.

**Ranking objective:** suggestions are ordered by **shortfall probability × penalty cost**, not expected profit alone. The PS's core cost is broken contracts, not missed upside — so the engine prefers a narrower, safer commitment over a larger one with hidden tail risk.

**The human gate:** no suggestion becomes a contract-facing commitment without an **explicit FPO staff verification of actual available stock** and, for any AMBER/RED override, an **explicit board decision with a recorded reason**. This is not UX friction. It is the **liability firewall** that guarantees the engine can never be the proximate cause of an overpromise.

### Layer 4 — The suggestion surface (what the board actually sees)

The interface makes uncertainty **visible and legible**, never buried in a dashboard.

The core artifact is the **Commitment Readiness Card** — one card per contract:

```
┌────────────────────────────────────────────────────────────┐
│  CONTRACT CTR-2025-07 · ONION · GRADE A · DUE 15 DEC       │
│  Buyer requires: 100 t                                      │
│                                                            │
│  🟡 AMBER                                                  │
│                                                            │
│  Calibrated range (80% confidence):  72.4 t  ──  88.1 t    │
│  Point estimate:                      80.2 t               │
│  Shortfall risk if you commit 100 t:  91%                  │
│                                                            │
│  RECOMMENDED COMMITMENT: 72 t                              │
│                                                            │
│  Why the range is where it is:                             │
│   • 3 of 12 member plots show NDVI below seasonal mean     │
│   • 2 members sold outside the FPO last season             │
│   • Buyer's Grade A tolerance is tighter than your         │
│     historical grading accuracy                            │
│                                                            │
│  [ Verify stock & commit 72 t ]   [ Override → board ]     │
└────────────────────────────────────────────────────────────┘
```

Every suggestion card carries: the range, the confidence level, the **two or three drivers that most moved the range**, the recommended commitment, and the audit trail.

And every suggestion is **logged with its model version, calibration version, and input hash** — so any past recommendation can be reproduced and audited after the season ends.

---

## 5. The smallest buildable version (v1)

We do not need to build the full platform to prove the idea.

**v1 scope:**

1. Ingest **one season** of FPO harvest records (CSV), one upstream yield forecast signal, and the FPO's historical contract shortfall data.
2. Train a simple per-crop point model + **split-conformal calibration**.
3. Run a **coverage backtest** on a held-out season and report the empirical coverage number.
4. Emit a weekly **Commitment Readiness Card** with a calibrated range, confidence, and GREEN/AMBER/RED status.
5. Route AMBER/RED to the board with drivers shown and an explicit override + reason log.

**Buildable in weeks. Directly answers the PS's demand for calibrated uncertainty rather than a single number.**

The full platform is the same architecture scaled across crops, buyers, and seasons.

---

## 6. Why this is defensible

| Asset | Why it compounds |
|---|---|
| **The realized-outcome ledger** | Every season of actual deliveries makes the calibration tighter and the intervals more useful. A new entrant starts from zero. |
| **The calibration discipline** | Anyone can ship a yield model. Shipping a *verified* confidence statement requires a historical ledger and the statistical plumbing to use it. |
| **Switching cost** | Once the FPO board relies on the card to decide contracts, the card becomes the decision record of the business. |
| **Trust with buyers** | A buyer who has seen three seasons of honest intervals will accept a Setu-backed commitment faster than any pitch deck. |

---

## 7. What success looks like

**Product metrics**
- **Coverage fidelity:** empirical coverage within ±5% of nominal on held-out seasons — the proof we do not bluff.
- **Interval width shrink:** average range width narrows season over season as the ledger grows.
- **Card adoption:** % of contracts where the board's decision falls within the recommended range.

**Business metrics (hypotheses to validate, not claims)**
- Reduction in contract shortfall incidents.
- Reduction in the buyer's emergency-procurement premium (the PS's "follow the money" line).
- Reduction in distress sales of surplus.
- Increase in repeat contracts with the same buyer.

---

## 8. Honest caveats (we state these up front)

1. **Season one intervals will be wide.** With a thin calibration set, the honest answer is a broad range. That is correct behaviour, not a failure. A system that starts narrow and confident on thin data is the bluff we are replacing.
2. **The engine's honesty is bounded by the ledger's quality.** Garbage actuals in → garbage confidence out. Data hygiene at the collection point is a first-class product requirement.
3. **We do not replace the FPO board.** Contract decisions stay human. We make the human decision *informed and auditable*.
4. **Grade uncertainty is a second front.** v1 focuses on quantity; grade-yield ratio intervals follow in v1.1.

---

## 9. Roadmap

| Horizon | Scope |
|---|---|
| **v1 (weeks)** | CSV ingestion · point model · conformal calibration · coverage backtest · readiness card · rule gate · audit log |
| **v2** | Grade-yield ratio intervals · live satellite API integration · per-member risk flags · buyer-facing export |
| **v3** | Multi-crop, multi-season ledger · API connectors to FPO ERPs · buyer demand forecasting · multi-FPO pooled commitments |

---

## 10. One line

> **Setu does not predict the harvest. Setu tells an FPO exactly how much it is allowed to promise — and can prove it.**