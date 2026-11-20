# ==============================================================================
# Setu v1.0 "Pramaan" — End-to-End Demo Script for Windows PowerShell
# ==============================================================================
$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  SETU v1.0 'PRAMAAN' — COMMITMENT CONFIDENCE ENGINE" -ForegroundColor Cyan
Write-Host "  The proof release for Farmer Producer Organizations" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Deterministic Synthetic Data Generation
Write-Host "`n[Step 1/5] Generating deterministic synthetic datasets (seed=42)..." -ForegroundColor Yellow
python scripts/generate_data.py --seed 42 --output data/synthetic

# 2. Database Ingest
Write-Host "`n[Step 2/5] Initializing local database and ingesting canonical records..." -ForegroundColor Yellow
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
Write-Host "`n[Step 3/5] Training yield forecasters across registered crops..." -ForegroundColor Yellow
python scripts/train.py --crop onion --seed 42
python scripts/train.py --crop tomato --seed 42
python scripts/train.py --crop paddy --seed 42

# 4. Coverage Backtest Gates
Write-Host "`n[Step 4/5] Executing coverage backtest on held-out seasons (2024-RB)..." -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray
python scripts/backtest.py --crop onion
Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray
python scripts/backtest.py --crop tomato
Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray

# Pre-generate initial suggestions
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

Write-Host "`n[Step 5/5] Ready to serve!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  Demo Ready:" -ForegroundColor Green
Write-Host "  • Backend API : http://127.0.0.1:8000 (docs at /docs)" -ForegroundColor White
Write-Host "  • Web Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  • Core Demo   : Open http://localhost:3000" -ForegroundColor White
Write-Host "                  Click CTR-2025-07 (Onion, 100t) -> AMBER Readiness Card" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Green
