"""CLI script to generate synthetic dataset for Setu."""
import sys
import argparse
from pathlib import Path

# Ensure repository root is on sys.path
root_dir = Path(__file__).resolve().parents[1]
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.app.seed.generator import generate_dataset, save_dataset_to_csv

def main():
    parser = argparse.ArgumentParser(description="Generate synthetic data for Setu")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument(
        "--output-dir",
        type=str,
        default="data/synthetic",
        help="Target directory for output CSVs",
    )
    args = parser.parse_args()

    out_path = Path(args.output_dir)
    print(f"Generating synthetic dataset with seed={args.seed} into {out_path}...")
    dataset = generate_dataset(seed=args.seed)
    save_dataset_to_csv(dataset, out_path)
    print(f"Generated {len(dataset)} CSV files successfully.")

if __name__ == "__main__":
    main()
