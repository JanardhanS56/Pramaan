#!/usr/bin/env bash
# ==============================================================================
# Setu v1.0 "Pramaan" — End-to-End Demo Script (AC9)
# Runs in under 5 minutes: generate -> train -> calibrate -> backtest -> serve
# ==============================================================================
set -e

echo "======================================================================"
echo "  SETU v1.0 'PRAMAAN' — COMMITMENT CONFIDENCE ENGINE"
echo "  The proof release for Farmer Producer Organizations"
echo "======================================================================"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# 1. Deterministic Synthetic Data Generation
echo ""
echo "[Step 1/5] Generating deterministic synthetic datasets (seed=42)..."
python scripts/generate_data.py --seed 42 --output data/synthetic

# 2. Database Ingest
echo ""
echo "[Step 2/5] Initializing local database and ingesting canonical records..."
python -c "
from backend.app.db import init_db
from backend.app.core.ingest import load_validated_csv
from pathlib import Path
init_db()
data_dir = Path('data/synthetic')
for table in ['farmers', 'plots', 'sowing', 'harvest', 'signals', 'contracts', 'deliveries']:
    n = load_validated_csv(data_dir / f'{table}.csv', table)
    print(f'  ✓ Ingested {n} rows into {table}')
"

# 3. Model Training
echo ""
echo "[Step 3/5] Training yield forecasters across registered crops..."
python scripts/train.py --crop onion --seed 42
python scripts/train.py --crop tomato --seed 42
python scripts/train.py --crop paddy --seed 42

# 4. Coverage Backtest Gates
echo ""
echo "[Step 4/5] Executing coverage backtest on held-out seasons (2024-RB)..."
echo "----------------------------------------------------------------------"
python scripts/backtest.py --crop onion
echo "----------------------------------------------------------------------"
python scripts/backtest.py --crop tomato
echo "----------------------------------------------------------------------"

# Pre-generate initial suggestion cards for open contracts
python -c "
from sqlmodel import Session, create_engine
from backend.app.api.suggestions import generate_suggestions
from backend.app.config import settings
engine = create_engine(settings.DATABASE_URL)
with Session(engine) as s:
    cards = generate_suggestions(confidence=0.80, session=s)
    print(f'  ✓ Generated {len(cards)} Commitment Readiness Cards')
    for c in cards:
        print(f'    [{c.status}] Contract {c.contract_id}: Recommended {c.recommended_commitment_t}t / Buyer {c.buyer_requires_t}t (Risk: {int(c.shortfall_risk*100)}%)')
"

# 5. Launch Services
echo ""
echo "[Step 5/5] Ready to serve!"
echo "======================================================================"
echo "  Demo Ready:"
echo "  • Backend API : http://127.0.0.1:8000 (docs at /docs)"
echo "  • Web Frontend: http://localhost:3000"
echo "  • Core Demo   : Open http://localhost:3000"
echo "                  Click CTR-2025-07 (Onion, 100t) -> AMBER Readiness Card"
echo "======================================================================"
echo ""
echo "Starting servers (Ctrl+C to stop)..."

# Trap interrupt to kill background API server
trap 'kill $(jobs -p) 2>/dev/null || true' EXIT

uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 &
cd frontend && npm run dev
