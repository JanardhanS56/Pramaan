"""CLI entrypoint for training crop forecasters."""
import sys
import argparse
from pathlib import Path

root_dir = Path(__file__).resolve().parents[1]
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from sqlmodel import Session
from backend.app.db import engine, init_db
from backend.app.core.forecaster import train_forecaster_for_crop

def main():
    parser = argparse.ArgumentParser(description="Train point forecaster for Setu crops")
    parser.add_argument("--crop", type=str, default="onion", help="Target crop (e.g. onion, tomato, paddy, or 'all')")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--artifacts-dir", type=str, default="artifacts", help="Directory for model artifacts")
    args = parser.parse_args()

    init_db(engine)
    crops = ["onion", "tomato", "paddy"] if args.crop.lower() == "all" else [args.crop.lower()]

    with Session(engine) as session:
        for c in crops:
            print(f"Training forecaster for '{c}' (seed={args.seed})...")
            try:
                model, run, is_thin = train_forecaster_for_crop(
                    crop=c,
                    session=session,
                    seed=args.seed,
                    artifacts_dir=Path(args.artifacts_dir),
                )
                print(f"✓ Model trained: {run.id}")
                print(f"  Artifact: {run.artifact_path}")
                print(f"  Metrics: {run.metrics_json}")
                print(f"  Thin-data fallback: {is_thin}")
            except Exception as e:
                print(f"✗ Failed training for '{c}': {e}", file=sys.stderr)
                sys.exit(1)

if __name__ == "__main__":
    main()
