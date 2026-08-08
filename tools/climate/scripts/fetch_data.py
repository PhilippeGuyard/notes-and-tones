"""Build the data files for essays/climate/ from the OWID CO2 dataset.

Downloads the Our World in Data / Global Carbon Budget country CSV
(github.com/owid/co2-data, CC-BY, ~60MB), caches it under data/raw/, and
emits slim per-chart JSONs into essays/climate/data/.

Run: uv run scripts/fetch_data.py            (from tools/climate/)
Re-run any time; outputs are deterministic for a given raw snapshot.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import pandas as pd
import requests

HERE = Path(__file__).resolve().parent
RAW = HERE.parent / "data" / "raw" / "owid-co2-data.csv"
OUT = HERE.parents[2] / "essays" / "climate" / "data"

CSV_URL = "https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv"
SOURCE = "Our World in Data, from the Global Carbon Budget (owid/co2-data)"

# Per-capita leaderboards only consider countries above this population,
# otherwise city-states and islands crowd out everything recognisable.
MIN_POP = 1_000_000
TOP_N = 10
UK = "United Kingdom"


def load() -> pd.DataFrame:
    if not RAW.exists():
        RAW.parent.mkdir(parents=True, exist_ok=True)
        print(f"downloading {CSV_URL} ...")
        r = requests.get(CSV_URL, timeout=120)
        r.raise_for_status()
        RAW.write_bytes(r.content)
    df = pd.read_csv(RAW)
    # Real countries carry a 3-letter ISO code; aggregates (World, continents,
    # income groups) have blank or OWID_xx codes. Keep World for shares.
    return df[df.iso_code.notna() & ~df.iso_code.str.startswith("OWID_") | (df.country == "World")]


def latest_year(df: pd.DataFrame, col: str) -> int:
    """Most recent year in which at least 100 countries report `col`."""
    counts = df[df.country != "World"].dropna(subset=[col]).groupby("year").size()
    return int(counts[counts >= 100].index.max())


def leaderboard(df: pd.DataFrame, col: str, per_capita: bool) -> dict:
    yr = latest_year(df, col)
    snap = df[(df.year == yr) & (df.country != "World")].dropna(subset=[col]).copy()
    if per_capita:
        snap = snap[snap.population >= MIN_POP]
    snap = snap.sort_values(col, ascending=False).reset_index(drop=True)
    snap["rank"] = snap.index + 1

    world_row = df[(df.year == yr) & (df.country == "World")]
    world = float(world_row[col].iloc[0]) if not world_row[col].isna().all() else None

    keep = snap[(snap["rank"] <= TOP_N) | (snap.country == UK)]
    rows = [
        {
            "country": r.country,
            "iso": r.iso_code,
            "value": round(float(getattr(r, col)), 2),
            "rank": int(r.rank),
        }
        for r in keep.itertuples()
    ]
    return {"year": yr, "world": world, "n_ranked": len(snap), "top": rows}


def build_leaderboard(df: pd.DataFrame) -> dict:
    return {
        "source": SOURCE,
        "retrieved": str(date.today()),
        "note": f"Per-capita boards exclude countries under {MIN_POP:,} people. "
                "Cumulative is fossil CO2 since 1750. Consumption-based adjusts "
                "for CO2 embedded in traded goods.",
        "data": {
            "annual": {"unit": "Mt CO2", **leaderboard(df, "co2", False)},
            "per_capita": {"unit": "t CO2 per person", **leaderboard(df, "co2_per_capita", True)},
            "cumulative": {"unit": "Mt CO2 since 1750", **leaderboard(df, "cumulative_co2", False)},
            "consumption": {"unit": "t CO2 per person, consumption basis",
                            **leaderboard(df, "consumption_co2_per_capita", True)},
        },
    }


def build_uk_share(df: pd.DataFrame) -> dict:
    """The numbers the guess widget and prose lean on."""
    uk = df[df.country == UK]
    world = df[df.country == "World"]

    def at(frame: pd.DataFrame, col: str, yr: int) -> float | None:
        row = frame[frame.year == yr]
        return None if row.empty or row[col].isna().all() else float(row[col].iloc[0])

    yr = latest_year(df, "co2")
    yr_cons = latest_year(df, "consumption_co2_per_capita")
    out = {
        "year": yr,
        "uk_annual_mt": at(uk, "co2", yr),
        "uk_share_annual_pct": at(uk, "share_global_co2", yr),
        "uk_share_cumulative_pct": at(uk, "share_global_cumulative_co2", yr),
        "uk_per_capita_t": at(uk, "co2_per_capita", yr),
        "world_per_capita_t": at(world, "co2_per_capita", yr),
        "consumption_year": yr_cons,
        "uk_production_per_capita_t": at(uk, "co2_per_capita", yr_cons),
        "uk_consumption_per_capita_t": at(uk, "consumption_co2_per_capita", yr_cons),
        "world_annual_mt": at(world, "co2", yr),
    }
    return {"source": SOURCE, "retrieved": str(date.today()), "data": out}


def main() -> None:
    df = load()
    OUT.mkdir(parents=True, exist_ok=True)
    for name, payload in [
        ("leaderboard", build_leaderboard(df)),
        ("uk_share", build_uk_share(df)),
    ]:
        path = OUT / f"{name}.json"
        path.write_text(json.dumps(payload, indent=1) + "\n")
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
