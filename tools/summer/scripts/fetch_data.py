"""Build analog data for essays/summer/ from Bastin et al. (2019).

Downloads the paper's S2 supporting table (figshare) and emits the UK city
rows as essays/summer/data/analogs.json: top-3 analog cities with
dissimilarity scores plus the bioclim variables used in the essay.

Paper: Bastin et al. 2019, PLOS ONE 10.1371/journal.pone.0217592 (with
correction 10.1371/journal.pone.0224120; the correction is textual only).
Scenario: CMIP5 ensemble, RCP4.5, 2050. Note the paper's press materials
promoted "London 2050 = Barcelona"; the S2 table ranks Melbourne first and
Barcelona third for London. The essay uses the table, not the press release.

Run: uv run scripts/fetch_data.py            (from tools/summer/)
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import pandas as pd
import requests

HERE = Path(__file__).resolve().parent
RAW = HERE.parent / "data" / "raw" / "s2.ods"
OUT = HERE.parents[2] / "essays" / "summer" / "data"

S2_URL = "https://ndownloader.figshare.com/files/16220150"
SOURCE = ("Bastin et al. (2019) PLOS ONE, S2 table (figshare); "
          "CMIP5 RCP4.5 ensemble, 2050 horizon")

UK_CITIES = ["London", "Birmingham", "Manchester", "Leeds",
             "Glasgow", "Edinburgh", "Cardiff", "Belfast"]


def load() -> pd.DataFrame:
    if not RAW.exists():
        RAW.parent.mkdir(parents=True, exist_ok=True)
        print(f"downloading {S2_URL} ...")
        r = requests.get(S2_URL, timeout=120)
        r.raise_for_status()
        RAW.write_bytes(r.content)
    return pd.read_excel(RAW, engine="odf")


def main() -> None:
    df = load()
    rows = df[df.current_city.isin(UK_CITIES)]
    missing = set(UK_CITIES) - set(rows.current_city)
    assert not missing, f"cities missing from S2: {missing}"

    cities = {}
    for r in rows.itertuples():
        cities[r.current_city] = {
            "analogs": [
                {"city": r.future_city_1_source, "dissim": round(r.future_city_1_source_dissim, 3)},
                {"city": r.future_city_2_source, "dissim": round(r.future_city_2_source_dissim, 3)},
                {"city": r.future_city_3_source, "dissim": round(r.future_city_3_source_dissim, 3)},
            ],
            "annual_mean_t": round(r.Annual_Mean_Temperature, 1),
            "annual_mean_t_2050": round(r.future_Annual_Mean_Temperature, 1),
            "warmest_month_max_t": round(r.Max_Temperature_of_Warmest_Month, 1),
            "warmest_month_max_t_2050": round(r.future_Max_Temperature_of_Warmest_Month, 1),
            "annual_precip_mm": round(r.Annual_Precipitation),
            "annual_precip_mm_2050": round(r.future_Annual_Precipitation),
        }

    OUT.mkdir(parents=True, exist_ok=True)
    payload = {"source": SOURCE, "retrieved": str(date.today()), "data": cities}
    path = OUT / "analogs.json"
    path.write_text(json.dumps(payload, indent=1) + "\n")
    print(f"wrote {path}")


if __name__ == "__main__":
    main()
