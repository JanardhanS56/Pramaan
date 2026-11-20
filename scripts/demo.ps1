# ==============================================================================
# Setu v1.0 Pramaan — End-to-End Demo Script for Windows PowerShell
# ==============================================================================
$ErrorActionPreference = 'Stop'

Write-Host '======================================================================' -ForegroundColor Cyan
Write-Host '  SETU v1.0 PRAMAAN — COMMITMENT CONFIDENCE ENGINE' -ForegroundColor Cyan
Write-Host '  The proof release for Farmer Producer Organizations' -ForegroundColor Cyan
Write-Host '======================================================================' -ForegroundColor Cyan

# 1. Deterministic Synthetic Data Generation
Write-Host ''
Write-Host '[Step 1/5] Generating deterministic synthetic datasets (seed=42)...' -ForegroundColor Yellow
python scripts/generate_data.py --seed 42 --output data/synthetic

# 2. Database Ingest
Write-Host ''
Write-Host '[Step 2/5] Initializing local database and ingesting canonical records...' -ForegroundColor Yellow
python scripts/setup_demo.py ingest

# 3. Model Training
Write-Host ''
Write-Host '[Step 3/5] Training yield forecasters across registered crops...' -ForegroundColor Yellow
python scripts/train.py --crop onion --seed 42
python scripts/train.py --crop tomato --seed 42
python scripts/train.py --crop paddy --seed 42

# 4. Coverage Backtest Gates
Write-Host ''
Write-Host '[Step 4/5] Executing coverage backtest on held-out seasons 2024-RB...' -ForegroundColor Yellow
Write-Host '----------------------------------------------------------------------' -ForegroundColor DarkGray
python scripts/backtest.py --crop onion
Write-Host '----------------------------------------------------------------------' -ForegroundColor DarkGray
python scripts/backtest.py --crop tomato
Write-Host '----------------------------------------------------------------------' -ForegroundColor DarkGray

# Pre-generate initial suggestions
Write-Host ''
Write-Host 'Evaluating open contracts and generating Readiness Cards...' -ForegroundColor Yellow
python scripts/setup_demo.py pregenerate

Write-Host ''
Write-Host '[Step 5/5] Ready to serve!' -ForegroundColor Green
Write-Host '======================================================================' -ForegroundColor Green
Write-Host '  Demo Ready:' -ForegroundColor Green
Write-Host '  • Backend API : http://127.0.0.1:8000 (docs at /docs)' -ForegroundColor White
Write-Host '  • Web Frontend: http://localhost:3000' -ForegroundColor White
Write-Host '  • Core Demo   : Open http://localhost:3000' -ForegroundColor White
Write-Host '                  Click CTR-2025-07 (Onion 100t) -> AMBER Readiness Card' -ForegroundColor White
Write-Host '======================================================================' -ForegroundColor Green
Write-Host ''
Write-Host 'To launch servers, run in two separate terminals:' -ForegroundColor Cyan
Write-Host '  Terminal 1: uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload' -ForegroundColor White
Write-Host '  Terminal 2: cd frontend; npm run dev' -ForegroundColor White
