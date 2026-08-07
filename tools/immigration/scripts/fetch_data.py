"""Fetch and bake immigration datasets into data/*.json for the d3 page.

Sources: ONS, Frontex, IOM, YouGov, UNHCR, Eurostat. Raw downloads are cached
in data/raw/; run with --refresh to re-download. Hand-curated datasets live in
data/static/ and are not touched by this script.
"""

import argparse
import datetime
import json
import sys
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parent.parent          # tools/immigration
REPO = ROOT.parent.parent                              # blog repo root
RAW = ROOT / "data" / "raw"                            # local download cache (gitignored)
OUT = REPO / "essays" / "immigration" / "data"         # live essay data the page fetches

UA = {"User-Agent": "Mozilla/5.0 (data pipeline for personal stats page)"}

URLS = {
    "ons.xlsx": (
        "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/"
        "populationandmigration/internationalmigration/datasets/"
        "longterminternationalimmigrationemigrationandnetmigrationflowsprovisional/"
        "yearendingdecember2025/may2026publicationspreadsheet.xlsx"
    ),
    "frontex.xlsx": (
        "https://www.frontex.europa.eu/assets/Migratory_routes/2026/"
        "Monthly_detections_of_IBC_2026_08_04.xlsx"
    ),
    "iom.csv": (
        "https://missingmigrants.iom.int/sites/g/files/tmzbdl601/files/"
        "report-migrant-incident/Missing_Migrants_Global_Figures_allData.csv"
    ),
    "yougov.xlsx": (
        "https://yougov.co.uk/_pubapis/v5/uk/trackers/"
        "the-most-important-issues-facing-the-country/download/"
    ),
    "irregular.xlsx": (
        "https://assets.publishing.service.gov.uk/media/6a05e3b7ee62840dba48a2c7/"
        "illegal-entry-routes-to-the-uk-dataset-mar-2026.xlsx"
    ),
    "visas.xlsx": (
        "https://assets.publishing.service.gov.uk/media/6a1d5a9f916cd732dcdaad5c/"
        "entry-clearance-visa-outcomes-datasets-mar-2026.xlsx"
    ),
}


def write_json(name, source, data):
    payload = {
        "source": source,
        "retrieved": datetime.date.today().isoformat(),
        "data": data,
    }
    path = OUT / name
    path.write_text(json.dumps(payload, indent=1))
    print(f"wrote {path.relative_to(REPO)}")


def download(refresh=False):
    RAW.mkdir(parents=True, exist_ok=True)
    for name, url in URLS.items():
        dest = RAW / name
        if dest.exists() and not refresh:
            continue
        print(f"downloading {name} ...")
        try:
            r = requests.get(url, headers=UA, timeout=120)
            r.raise_for_status()
        except requests.RequestException as e:
            # Missing raw files only break the steps that need them.
            print(f"DOWNLOAD FAILED {name}: {e}", file=sys.stderr)
            continue
        dest.write_bytes(r.content)


# ---------- transforms ----------

def parse_ye_period(period):
    """'YE Jun 12' (optionally suffixed 'P'/'R') -> period end '2012-06-30'."""
    months = {"Mar": "03-31", "Jun": "06-30", "Sep": "09-30", "Dec": "12-31"}
    _, mon, yy = period.split()[:3]
    return f"20{yy}-{months[mon]}"


def ons_net_migration():
    df = pd.read_excel(RAW / "ons.xlsx", sheet_name="1", header=5)
    df.columns = [str(c).split("\n")[0] for c in df.columns]
    df = df.rename(columns={"All Nationalities": "value"})
    df = df.dropna(subset=["Flow", "Period"])
    out = {}
    for _, row in df.iterrows():
        date = parse_ye_period(str(row["Period"]).strip())
        rec = out.setdefault(date, {"date": date, "period": row["Period"].strip()})
        rec[str(row["Flow"]).strip().lower().replace(" ", "_")] = int(row["value"])
    series = sorted(out.values(), key=lambda r: r["date"])
    write_json("uk_net_migration.json",
               "ONS Long-term international migration, YE Dec 2025 (May 2026)", series)


def frontex_routes():
    df = pd.read_excel(RAW / "frontex.xlsx", sheet_name="Detections_of_IBC", header=1)
    month_cols = [c for c in df.columns if isinstance(c, str) and len(c) == 7
                  and c[:3].isalpha() and c[3:].isdigit()]
    long = df.melt(id_vars=["Route"], value_vars=month_cols,
                   var_name="month", value_name="value")
    long["value"] = pd.to_numeric(long["value"], errors="coerce").fillna(0)
    long["month"] = pd.to_datetime(long["month"], format="%b%Y").dt.strftime("%Y-%m")
    monthly = (long.groupby(["Route", "month"])["value"].sum().reset_index())
    routes = {}
    for route, grp in monthly.groupby("Route"):
        routes[route] = [{"m": r.month, "v": int(r.value)}
                         for r in grp.itertuples() if r.value > 0 or True]
    annual = (long.assign(year=long["month"].str[:4].astype(int))
              .groupby(["Route", "year"])["value"].sum().reset_index())
    annual_out = [{"route": r.Route, "year": int(r.year), "value": int(r.value)}
                  for r in annual.itertuples()]
    write_json("frontex.json",
               "Frontex monthly detections of illegal border crossings (Aug 2026 file)",
               {"monthly": routes, "annual": annual_out})


def iom_deaths():
    df = pd.read_csv(RAW / "iom.csv")
    df.columns = [c.replace("﻿", "").strip('"') for c in df.columns]
    med = df[df["Region of Incident"].str.contains("Mediterranean", na=False)]
    med_yr = med.groupby("Incident Year")["Total Number of Dead and Missing"].sum()
    glob_yr = df.groupby("Incident Year")["Total Number of Dead and Missing"].sum()
    data = {
        "mediterranean": [{"year": int(y), "value": int(v)} for y, v in med_yr.items()],
        "global": [{"year": int(y), "value": int(v)} for y, v in glob_yr.items()],
    }
    write_json("med_deaths.json", "IOM Missing Migrants Project (CC BY 4.0)", data)


def yougov_salience():
    df = pd.read_excel(RAW / "yougov.xlsx", sheet_name="All adults")
    df = df.rename(columns={df.columns[0]: "issue"})
    keep = {"Immigration & Asylum": "immigration", "The economy": "economy",
            "Health": "health"}
    rows = df[df["issue"].isin(keep)].set_index("issue")
    dates = [c for c in rows.columns if not str(c).startswith("issue")]
    series = []
    for d in dates:
        date = pd.to_datetime(d).strftime("%Y-%m-%d")
        rec = {"date": date}
        for issue, key in keep.items():
            v = rows.at[issue, d]
            if pd.notna(v):
                rec[key] = round(float(v) * 100, 1)
        series.append(rec)
    write_json("salience.json",
               "YouGov 'Most important issues facing the country' tracker", series)


def unhcr_resettlement():
    r = requests.get("https://api.unhcr.org/population/v1/solutions/",
                     params={"yearFrom": 1990, "yearTo": 2025}, timeout=60)
    r.raise_for_status()
    items = r.json()["items"]
    series = [{"year": it["year"], "value": it["resettlement"]}
              for it in items if it.get("resettlement") not in (None, "-")]
    write_json("resettlement.json",
               "UNHCR Refugee Data Finder, solutions endpoint (CC BY 4.0)", series)


def unhcr_hosts():
    items, page = [], 1
    while True:
        r = requests.get("https://api.unhcr.org/population/v1/population/",
                         params={"year": 2024, "coa_all": "true", "page": page},
                         timeout=60)
        r.raise_for_status()
        d = r.json()
        items += d["items"]
        if page >= d["maxPages"]:
            break
        page += 1
    hosts = []
    for it in items:
        refugees = int(it.get("refugees") or 0)
        oip = it.get("oip")
        oip = int(oip) if oip not in (None, "-", "0") else 0
        if refugees:
            hosts.append({"country": it["coa_name"], "iso": it["coa_iso"],
                          "refugees": refugees, "oip": oip})
    hosts.sort(key=lambda h: h["refugees"] + h["oip"], reverse=True)
    write_json("refugee_hosts.json",
               "UNHCR Refugee Data Finder, population endpoint, year 2024 (CC BY 4.0)",
               hosts[:25])


NON_COUNTRY = {"Stateless", "Not currently recorded", "Unknown", "Other"}


def top_nationalities(counts, n=5, exclude=NON_COUNTRY):
    """{nationality: value} -> top-n [{'nationality', 'value'}], real countries only."""
    ranked = sorted(((k, v) for k, v in counts.items() if k not in exclude),
                    key=lambda kv: kv[1], reverse=True)
    return [{"nationality": k, "value": int(v)} for k, v in ranked[:n]]


def origins():
    """Top origin nationalities, 2025: small boat arrivals vs long-term visas issued."""
    year = 2025
    irr = pd.read_excel(RAW / "irregular.xlsx", sheet_name="Data_IER_D01", header=1)
    irr.columns = [str(c).strip() for c in irr.columns]
    sb = irr[(irr["Method of entry"] == "Small boat arrivals") & (irr["Year"] == year)]
    boats = pd.to_numeric(sb["Number of detections"], errors="coerce").groupby(
        sb["Nationality"]).sum()

    vis = pd.read_excel(RAW / "visas.xlsx", sheet_name="Data_Vis_D02", header=3)
    vis.columns = [str(c).strip() for c in vis.columns]
    v = vis[(vis["Year"] == year) & (vis["Case outcome"] == "Issued")]
    # Applicant-type coverage differs by group: Work/Study publish Main+Dependant,
    # Family publishes only "All". "Other" mixes both, so it is left out.
    mask = (
        (v["Visa type group"].isin(["Work", "Study"])
         & v["Applicant type"].isin(["Main Applicant", "Dependant"]))
        | ((v["Visa type group"] == "Family") & (v["Applicant type"] == "All"))
    )
    lt = v[mask]
    visas = pd.to_numeric(lt["Decisions"], errors="coerce").groupby(
        lt["Nationality"]).sum()

    write_json("origins.json",
               "Home Office immigration statistics, YE Mar 2026: small boat arrivals "
               "and entry clearance visas (work, study, family) by nationality", {
                   "year": year,
                   "boats": {"total": int(boats.sum()),
                             "top": top_nationalities(boats.to_dict())},
                   "visas": {"total": int(visas.sum()),
                             "top": top_nationalities(visas.to_dict())},
               })


EU_GEO = ("BE BG CZ DK DE EE IE EL ES FR HR IT CY LV LT LU HU MT NL AT PL PT RO"
          " SI SK FI SE").split()


def eurostat_json(dataset, params):
    r = requests.get(
        f"https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}",
        params={"format": "JSON", "lang": "EN", **params}, timeout=120)
    r.raise_for_status()
    return r.json()


def jsonstat_unpack(d):
    """JSON-stat 2.0 -> list of dicts keyed by dimension category ids."""
    dims = d["id"]
    sizes = d["size"]
    cats = []
    for dim in dims:
        idx = d["dimension"][dim]["category"]["index"]
        if isinstance(idx, dict):
            ordered = sorted(idx, key=idx.get)
        else:
            ordered = list(idx)
        cats.append(ordered)
    out = []
    for flat, val in d["value"].items():
        flat = int(flat)
        rec = {}
        for i in range(len(dims) - 1, -1, -1):
            rec[dims[i]] = cats[i][flat % sizes[i]]
            flat //= sizes[i]
        rec["value"] = val
        out.append(rec)
    return out


def eurostat_asylum():
    d = eurostat_json("migr_asyappctza", {
        "citizen": "TOTAL", "sex": "T", "age": "TOTAL", "applicant": "TOTAL",
        **{"geo": EU_GEO + ["EU27_2020"]},
        **{"time": [str(y) for y in range(2010, 2026)]},
    })
    recs = jsonstat_unpack(d)
    out = {}
    for r in recs:
        out.setdefault(r["geo"], []).append({"year": int(r["time"]), "value": r["value"]})
    for v in out.values():
        v.sort(key=lambda x: x["year"])
    write_json("eu_asylum.json",
               "Eurostat migr_asyappctza (total asylum applicants)", out)


def eurostat_percapita():
    apps = eurostat_json("migr_asyappctza", {
        "citizen": "TOTAL", "sex": "T", "age": "TOTAL", "applicant": "TOTAL",
        **{"geo": EU_GEO}, "time": "2025",
    })
    pop = eurostat_json("demo_pjan", {
        "sex": "T", "age": "TOTAL", **{"geo": EU_GEO}, "time": "2025",
    })
    apps_by_geo = {r["geo"]: r["value"] for r in jsonstat_unpack(apps)}
    pop_by_geo = {r["geo"]: r["value"] for r in jsonstat_unpack(pop)}
    labels = apps["dimension"]["geo"]["category"]["label"]
    out = []
    for geo, n in apps_by_geo.items():
        if geo in pop_by_geo and pop_by_geo[geo]:
            out.append({
                "geo": geo, "country": labels.get(geo, geo),
                "applications": n, "population": pop_by_geo[geo],
                "per_million": round(n / pop_by_geo[geo] * 1e6),
            })
    # UK from Home Office (not in Eurostat since Brexit)
    out.append({"geo": "UK", "country": "United Kingdom", "applications": 100600,
                "population": 68300000, "per_million": round(100600 / 68.3),
                "note": "Home Office 2025 (individuals); population ONS mid-year estimate"})
    out.sort(key=lambda r: r["per_million"], reverse=True)
    write_json("per_capita_asylum.json",
               "Eurostat migr_asyappctza + demo_pjan (2025); UK: Home Office", out)


STEPS = {
    "ons": ons_net_migration,
    "frontex": frontex_routes,
    "iom": iom_deaths,
    "yougov": yougov_salience,
    "resettlement": unhcr_resettlement,
    "hosts": unhcr_hosts,
    "eu_asylum": eurostat_asylum,
    "per_capita": eurostat_percapita,
    "origins": origins,
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true", help="re-download raw files")
    ap.add_argument("steps", nargs="*", choices=[*STEPS, []], help="subset of steps")
    args = ap.parse_args()
    download(refresh=args.refresh)
    failed = []
    for name in (args.steps or STEPS):
        try:
            STEPS[name]()
        except Exception as e:  # keep going; page falls back to static data
            print(f"FAILED {name}: {e}", file=sys.stderr)
            failed.append(name)
    if failed:
        sys.exit(f"failed steps: {', '.join(failed)}")


if __name__ == "__main__":
    main()
