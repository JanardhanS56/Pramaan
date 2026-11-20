# NOTES — Setu v1.0 "Pramaan"

## Discoveries & Architecture Decisions
1. **Conformal Exchangeability & Chronological Season Splits:**
   - Standard random train/test splits cause future-to-past data leakage in seasonal agriculture.
   - We enforced strict chronological splits: earliest 60% seasons for training, middle 20% for conformal calibration, latest 20% held-out for backtest verification.
   - Evaluated on `2024-RB` held-out season, achieving 0.85 empirical coverage at nominal 0.80 (within ±0.05 gate tolerance).

2. **Thin-Data Guard:**
   - Datasets with < 30 calibration rows or < 60 training rows (such as paddy with 25 plots) automatically fall back to a robust `SeasonalMeanBaselineModel` and flag `is_thin_data: true`.
   - Intervals widen naturally on thin data; if width exceeds 1.5× point estimate, `low_information` is raised and any `GREEN` recommendation is automatically downgraded to `AMBER` with a caution banner.

3. **Human Gate & Liability Firewall:**
   - Overriding an AMBER or RED recommendation requires both an explicit justification reason and an authorized actor identifier.
   - Enforced strictly on the backend (`HTTP 422 REASON_REQUIRED`), ensuring no client bypass is possible.
   - Every suggestion and decision is recorded in an append-only audit trail with a SHA-256 state hash.

## Deferred Items (v2 Scope)
- **Live Satellite APIs:** Integration with Sentinel-2 / Landsat live tile pipelines.
- **Micro-climate Sensor Integration:** IoT soil moisture probes and automated weather stations.
- **Grade Transition Probability Models:** Dynamic multinomial logistic regression for Grade A/B/C transitions under post-harvest temperature stress.
- **Multi-FPO Supply Pooling:** Inter-FPO spot trading and contract load sharing across farmer federations.
- **Buyer Direct Portal:** External access portal with verifiable zero-knowledge or HMAC-authenticated commitment proofs.
- **Payment & Logistics Integration:** Escrow smart contracts, e-NAM, and ONDC protocol adapters.
