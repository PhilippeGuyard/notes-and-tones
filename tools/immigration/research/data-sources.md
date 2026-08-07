# EU + UK Immigration Data Sources — Verified 2026-08-06

## Verified machine-readable sources (all HTTP-checked)

### 1. ONS Long-Term International Migration (LTIM)

- **URL (verified 200, xlsx):** `https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/populationandmigration/internationalmigration/datasets/longterminternationalimmigrationemigrationandnetmigrationflowsprovisional/yearendingdecember2025/may2026publicationspreadsheet.xlsx`
- **Landing page (stable):** <https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/internationalmigration/datasets/longterminternationalimmigrationemigrationandnetmigrationflowsprovisional>
- XLSX. Latest: YE Dec 2025 (pub 21 May 2026). ~6-monthly. OGL v3.0.
- Fields: immigration/emigration/net by year, nationality group (British/EU/non-EU). **Caveat:** file URL changes each edition — scrape landing page for `href="/file?uri=...xlsx"` or hardcode headline series.

### 2. Home Office irregular migration / small boats

- **Summary ODS (verified):** `https://assets.publishing.service.gov.uk/media/6a05e3d05f39105e0848a2c5/illegal-entry-routes-to-the-uk-summary-mar-2026-tables.ods`
- **Detailed XLSX (verified):** `https://assets.publishing.service.gov.uk/media/6a05e3b7ee62840dba48a2c7/illegal-entry-routes-to-the-uk-dataset-mar-2026.xlsx`
- **Stable hub:** <https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables>
- Latest: YE Mar 2026; going forward annual (August). OGL v3.0.
- Fields: detected arrivals by method (small boat/lorry/air), quarter, nationality, age/sex. **Caveat:** asset URLs change every release — scrape the hub.

### 2b. Home Office entry clearance visas by nationality

- **Detailed XLSX (verified, ~31 MB):** `https://assets.publishing.service.gov.uk/media/6a1d5a9f916cd732dcdaad5c/entry-clearance-visa-outcomes-datasets-mar-2026.xlsx`
- Same hub/cadence/license/URL-churn as #2. Sheet Data_Vis_D02: outcomes by year/quarter, nationality, visa type group/type/subgroup, applicant type. **Caveat:** applicant-type coverage differs by group — Work/Study publish Main Applicant + Dependant, Family only "All", "Other" mixes both (double-count risk).

### 3. Home Office asylum applications + backlog

- **Asylum summary ODS (verified):** `https://assets.publishing.service.gov.uk/media/6a05e023da82768016cb3fa5/asylum-summary-mar-2026-tables.ods`
- **Backlog XLSX (verified):** `https://assets.publishing.service.gov.uk/media/6a05df3d5f39105e0848a2be/asylum-claims-awaiting-decision-datasets-mar-2026.xlsx`
- Same hub/cadence/license/URL-churn as #2. Fields: claims by quarter/nationality, decisions, grant rates, backlog time series.

### 4. Eurostat asylum applications (migr_asyappctza)

- **JSON API (verified, JSON-stat 2.0):** `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/migr_asyappctza?format=JSON&lang=EN&citizen=TOTAL&sex=T&age=TOTAL&geo=DE&geo=FR&time=2023`
- Add `geo=`/`time=` params; omitting filters → huge payload. SDMX-CSV: `.../sdmx/2.1/data/migr_asyappctza?format=SDMX-CSV`.
- Annual; updated 2026-07-09. Free, attribution. No key — CORS OK, ideal for live d3 fetch.

### 5. Frontex irregular border crossings by route

- **XLSX (verified via GET, monthly):** `https://www.frontex.europa.eu/assets/Migratory_routes/2026/Monthly_detections_of_IBC_2026_08_04.xlsx`
- **Landing:** <https://www.frontex.europa.eu/what-we-do/monitoring-and-risk-analysis/migratory-map/>
- Monthly detections by route, 2009→present. **Caveats:** filename embeds publish date — scrape landing page; server rejects HEAD (use GET). Detections ≠ persons. No explicit license — attribute Frontex/FRAN.

### 6. IOM Missing Migrants Project

- **All-data CSV (verified):** `https://missingmigrants.iom.int/sites/g/files/tmzbdl601/files/report-migrant-incident/Missing_Migrants_Global_Figures_allData.csv`
- Per-year: `https://missingmigrants.iom.int/global-figures/{YEAR}/csv`. Mirror: <https://data.humdata.org/dataset/iom-missing-migrants-project-data>
- Incident-level 2014→present: date, region, route, dead/missing, coordinates. CC BY 4.0. Aggregate to year/region in preprocessing.

### 7. UNHCR Refugee Data Finder API

- **Verified JSON:** `https://api.unhcr.org/population/v1/population/?yearFrom=2010&yearTo=2024&coa=GBR` (`&download=true` → zipped CSV)
- Docs: <https://api.unhcr.org/docs/refugee-statistics.html> — no key.
- Endpoints: `/population`, `/asylum-applications`, `/asylum-decisions`, `/solutions` (resettlement). Fields: refugees, asylum_seekers, coa/coo ISO3, year. CC BY 4.0.

### 8. Immigration salience tracker — YouGov

- **Full dataset XLSX, no auth (verified, ~1.1 MB):** `https://yougov.co.uk/_pubapis/v5/uk/trackers/the-most-important-issues-facing-the-country/download/`
- Tracker: <https://yougov.com/en-gb/trackers/the-most-important-issues-facing-the-country>
- Weekly, 2011→present, % naming each issue, with crossbreaks. Cite YouGov.
- **Ipsos Issues Index:** PDF charts only — fallback: hand-transcribe annual immigration-salience series (~50 points, 1974→present) into JSON.

## Requires registration / no clean download — fallbacks

### 9. Perceived vs actual immigrant share

- **Ipsos Perils of Perception:** PDFs only, e.g. <https://www.ipsos.com/sites/default/files/ct/news/documents/2024-11/ipsos-the-perils-of-perception-2024.pdf>. **Fallback (recommended):** hardcode ~30-40 country perceived-vs-actual pairs into JSON (2018 wave for per-country; cite year).
- **Eurobarometer (GESIS):** registration required; SPSS/Stata. Fallback: hardcode per-country perceived-vs-actual pairs.

### 10. OECD International Migration Database (optional)

- **SDMX CSV API (verified):** `https://sdmx.oecd.org/public/rest/data/OECD.ELS.IMD,DSD_MIG@DF_MIG,1.0/GBR........?startPeriod=2015&format=csvfile`
- Key: `REF_AREA.CITIZENSHIP.FREQ.MEASURE.SEX.BIRTH_PLACE.EDUCATION_LEV.UNIT_MEASURE`; `MEASURE=B11` = inflows. Explorer: <https://data-explorer.oecd.org> (`DSD_MIG@DF_MIG`). Annual, ~18-month lag.

## Practical notes for the d3 build

- **Live-fetchable in browser (JSON, no key):** Eurostat (#4), UNHCR (#7).
- **Stable-URL files for preprocessing:** IOM CSV (#6), YouGov XLSX (#8), OECD CSV (#10).
- **URL churn — snapshot at build time / scrape landing pages:** ONS (#1), Home Office (#2, #3), Frontex (#5).
- **Hardcode as JSON:** Perils of Perception pairs (#9), Ipsos Issues Index history (#8 fallback).
- ODS/XLSX won't parse natively in d3 — convert to CSV/JSON in preprocessing (Python + pandas/openpyxl/odfpy).

Dead/broken flagged: `cdn.ons.gov.uk` variant 404s (use `www.ons.gov.uk/file?uri=`); `yougov.com/_pubapis` 404s (use `yougov.co.uk`); Frontex rejects HEAD (use GET).
