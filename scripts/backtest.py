"""CLI entrypoint for running crop coverage backtest matching design.md §7."""
import sys
import argparse
from pathlib import Path

root_dir = Path(__file__).resolve().parents[1]
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from sqlmodel import Session
from backend.app.db import engine, init_db
from backend.app.core.backtest import run_backtest_for_crop

def main():
    parser = argparse.ArgumentParser(description="Run coverage backtest on held-out seasons for Setu crops")
    parser.add_argument("--crop", type=str, default="onion", help="Target crop (e.g. onion, tomato, paddy, or 'all')")
    parser.add_argument("--json", action="store_true", help="Output raw JSON report instead of text")
    args = parser.parse_args()

    init_db(engine)
    crops = ["onion", "tomato", "paddy"] if args.crop.lower() == "all" else [args.crop.lower()]

    with Session(engine) as session:
        for c in crops:
            try:
                report = run_backtest_for_crop(crop=c, session=session)
                if args.json:
                    import json
                    print(json.dumps(report.to_dict(), indent=2))
                else:
                    print(report.format_cli_output())
                    print()
            except Exception as e:
                print(f"✗ Backtest error for '{c}': {e}", file=sys.stderr)
                sys.exit(1)

if __name__ == "__main__":
    main()
