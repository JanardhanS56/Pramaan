from pathlib import Path

def test_monorepo_structure():
    root = Path(__file__).resolve().parents[2]
    expected_dirs = [
        root / "backend" / "app" / "models",
        root / "backend" / "app" / "schemas",
        root / "backend" / "app" / "api",
        root / "backend" / "app" / "core",
        root / "backend" / "app" / "seed",
        root / "backend" / "tests",
        root / "data" / "schema",
        root / "data" / "synthetic",
        root / "scripts",
    ]
    for d in expected_dirs:
        assert d.is_dir(), f"Missing directory: {d}"
