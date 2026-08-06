"""Turn the HBAI CSVs into the tidy JSON the income essay reads.

The three source CSVs (produced by the sibling marimo `uk_income` project's
fetch_data.py) are vendored into ./source so this repo rebuilds on its own.
Writes compact JSON into essays/income/data/ and prints the headline figures
used in the prose, so the copy and the charts can never drift.

Run: python3 tools/income/build_data.py
Pure stdlib, no dependencies.
"""

import csv
import json
from pathlib import Path

# vendored copy of the marimo uk_income CSVs (see ./source)
SRC = Path(__file__).resolve().parent / "source"
OUT = Path(__file__).resolve().parents[2] / "essays" / "income" / "data"
OUT.mkdir(parents=True, exist_ok=True)

GROUPS = ["All", "Children", "Working-age", "Pensioners"]
HOUSING = ["AHC", "BHC"]

SRC_NOTE = (
    "DWP Households Below Average Income (HBAI), FYE 1995-2024 table pack; "
    "whole population, equivalised net household income."
)
SRC_URL = (
    "https://www.gov.uk/government/statistics/"
    "households-below-average-income-for-financial-years-ending-1995-to-2024"
)


def read_rows(name):
    with open(SRC / name, newline="") as f:
        return list(csv.DictReader(f))


def build_distribution():
    raw = read_rows("hbai_distribution.csv")
    out = {}
    for g in GROUPS:
        out[g] = {}
        for h in HOUSING:
            bands = [
                (float(r["band_lower_gbp_week"]), float(r["pct"]))
                for r in raw
                if r["group"] == g and r["housing"] == h
            ]
            bands.sort()
            total = sum(p for _, p in bands)
            series, cum = [], 0.0
            for band, pct in bands:
                share = 100 * pct / total
                cum += share
                series.append(
                    {
                        "band": int(band),
                        "share": round(share, 4),
                        "cum": round(cum, 4),
                    }
                )
            out[g][h] = series
    return out


def build_stats():
    rows = read_rows("hbai_stats.csv")
    stats = {}
    for r in rows:
        stats[r["housing"]] = {
            "median": float(r["median_gbp_week"]),
            "poverty": float(r["poverty_line_gbp_week"]),
            "mean": float(r["mean_gbp_week"]),
        }
    return stats


def build_regional():
    rows = read_rows("regional_poverty.csv")
    return [
        {
            "region": r["region"],
            "rate": float(r["poverty_rate_ahc"]),
            "period": r["period"],
        }
        for r in rows
    ]


def pct_below(series, threshold):
    return round(sum(b["share"] for b in series if b["band"] < threshold), 1)


def band_share(series, median, lo, hi):
    total = 0.0
    for b in series:
        if b["band"] >= lo * median and (hi is None or b["band"] < hi * median):
            total += b["share"]
    return round(total, 1)


def main():
    dist = build_distribution()
    stats = build_stats()
    regional = build_regional()

    (OUT / "distribution.json").write_text(
        json.dumps(
            {"source": SRC_NOTE, "url": SRC_URL, "groups": GROUPS, "data": dist},
            indent=1,
        )
    )
    (OUT / "stats.json").write_text(
        json.dumps({"source": SRC_NOTE, "url": SRC_URL, "data": stats}, indent=1)
    )
    (OUT / "regional.json").write_text(
        json.dumps(
            {
                "source": "JRF Geography and poverty (from HBAI 2023/24), AHC, "
                "three-year average 2021-24.",
                "data": regional,
            },
            indent=1,
        )
    )

    # ---- headline figures for the prose ----
    all_ahc = dist["All"]["AHC"]
    all_bhc = dist["All"]["BHC"]
    med_ahc = stats["AHC"]["median"]
    med_bhc = stats["BHC"]["median"]
    pov_ahc = stats["AHC"]["poverty"]

    print("\n=== headline figures ===")
    print(f"median AHC  £{med_ahc:.0f}/wk  = £{med_ahc*52:,.0f}/yr")
    print(f"median BHC  £{med_bhc:.0f}/wk  = £{med_bhc*52:,.0f}/yr")
    print(f"poverty AHC £{pov_ahc:.0f}/wk  = £{pov_ahc*52:,.0f}/yr")
    print(f"poverty BHC £{stats['BHC']['poverty']:.0f}/wk = £{stats['BHC']['poverty']*52:,.0f}/yr")
    print(f"mean AHC    £{stats['AHC']['mean']:.0f}/wk  = £{stats['AHC']['mean']*52:,.0f}/yr")

    print("\n-- All, AHC --")
    for t in (300, 500, 700, 1000):
        print(f"  below £{t}/wk (£{t*52:,}/yr): {pct_below(all_ahc, t):.0f}%")
    print(f"  below median (£{med_ahc:.0f}): {pct_below(all_ahc, med_ahc):.0f}%")
    print(f"  below poverty line: {pct_below(all_ahc, pov_ahc):.0f}%")

    print("\n-- OECD-style bands, All, AHC (relative to median) --")
    print(f"  in poverty (<60%):        {band_share(all_ahc, med_ahc, 0, 0.60)}%")
    print(f"  squeezed (60-75%):        {band_share(all_ahc, med_ahc, 0.60, 0.75)}%")
    print(f"  comfortable (75-200%):    {band_share(all_ahc, med_ahc, 0.75, 2.00)}%")
    print(f"  well-off (>200%):         {band_share(all_ahc, med_ahc, 2.00, None)}%")

    print("\n-- poverty rate by age (share below the poverty line) --")
    for g in GROUPS:
        pa = pct_below(dist[g]["AHC"], pov_ahc)
        pb = pct_below(dist[g]["BHC"], stats["BHC"]["poverty"])
        print(f"  {g:12s}  AHC {pa:4.0f}%   BHC {pb:4.0f}%")

    print("\n-- regional AHC poverty (sorted) --")
    for r in sorted(regional, key=lambda x: -x["rate"]):
        print(f"  {r['region']:26s} {r['rate']:.0f}%")

    print(f"\nwrote JSON to {OUT}")


if __name__ == "__main__":
    main()
