"""Setup and database seeding script for Setu Pramaan demo."""
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parents[1]
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import pandas as pd
from sqlmodel import Session, create_engine

from backend.app.api.suggestions import generate_suggestions
from backend.app.config import settings
from backend.app.core.ingest import load_validated_csv
from backend.app.db import init_db

def ingest_data():
    init_db()
    data_dir = Path("data/synthetic")
    tables = ["farmers", "plots", "sowing", "harvest", "signals", "contracts", "deliveries"]
    engine = create_engine(settings.DATABASE_URL)
    with Session(engine) as session:
        for table in tables:
            csv_file = data_dir / f"{table}.csv"
            if csv_file.exists():
                df = pd.read_csv(csv_file)
                n = load_validated_csv(table, df, session)
                print(f"  ✓ Ingested {n} rows into {table}")

def pregenerate_cards():
    engine = create_engine(settings.DATABASE_URL)
    with Session(engine) as s:
        cards = generate_suggestions(confidence=0.80, crop=None, session=s)
        print(f"  ✓ Generated {len(cards)} Commitment Readiness Cards")
        for c in cards:
            risk_pct = int(round(c.shortfall_risk * 100))
            print(f"    [{c.status}] Contract {c.contract_id}: Recommended {c.recommended_commitment_t}t / Buyer {c.buyer_requires_t}t (Risk: {risk_pct}%)")

if __name__ == "__main__":
    import sys
    action = sys.argv[1] if len(sys.argv) > 1 else "all"
    if action in ["ingest", "all"]:
        ingest_data()
    if action in ["pregenerate", "all"]:
        pregenerate_cards()
