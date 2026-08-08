"""Build data for essays/futures/ (climate futures simulator).

Inputs (already on disk, nothing downloaded):
- tools/climate/data/raw/owid-co2-data.csv  (cached by tools/climate)
- essays/summer/data/static/cities.json     (part 3's verified UKCP18 anchors)

Outputs:
- essays/futures/data/history.json   World CO₂ incl. land use, 2000-2024, GtCO₂
- essays/futures/data/callback.json  slim per-city heat anchors for interpolation
"""

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
RAW_CSV = ROOT / "tools" / "climate" / "data" / "raw" / "owid-co2-data.csv"
CITIES = ROOT / "essays" / "summer" / "data" / "static" / "cities.json"
OUT = ROOT / "essays" / "futures" / "data"

RETRIEVED = "2026-08-08"


def history():
    df = pd.read_csv(RAW_CSV, usecols=["country", "year", "co2_including_luc"])
    world = df[(df.country == "World") & (df.year >= 2000)].dropna()
    years = [[int(r.year), round(r.co2_including_luc / 1000, 1)] for r in world.itertuples()]
    out = {
        "source": "Global Carbon Budget via Our World in Data co2-data "
                  "(co2_including_luc, World): fossil CO₂ plus land-use change",
        "retrieved": RETRIEVED,
        "unit": "GtCO₂ per year",
        "data": {"years": years},
    }
    (OUT / "history.json").write_text(json.dumps(out) + "\n")
    print(f"history.json: {years[0][0]}-{years[-1][0]}, last = {years[-1][1]} Gt")


def callback():
    src = json.loads(CITIES.read_text())
    # columns in part 3: [1981-2000 baseline, observed 2001-2020, 2C, 4C];
    # keep the last three with global warming anchors assigned to each column.
    cities = {
        name: {k: c[k][1:] for k in ("hot25", "hot28", "nights")}
        for name, c in src["data"].items()
    }
    out = {
        "source": src["source"],
        "retrieved": RETRIEVED,
        "note": "Derived from part 3's cities.json: [observed 2001-2020, 2C, 4C] "
                "columns, for linear interpolation at warming anchors "
                "[1.0, 2.0, 4.0] C above 1850-1900 (observed period assigned "
                "1.0C per IGCC decade averages).",
        "data": {"anchors_c": [1.0, 2.0, 4.0], "cities": cities},
    }
    (OUT / "callback.json").write_text(json.dumps(out) + "\n")
    print(f"callback.json: {len(cities)} cities")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "static").mkdir(exist_ok=True)
    history()
    callback()
