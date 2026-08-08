# Futures simulator — verified constants (research pass 2026-08-08)

Rule: nothing ships that is not on this page with a source. Web-verified 2026-08-08.

## Physics

- TCRE (transient climate response to cumulative CO2 emissions): best estimate
  1.65°C per 1000 PgC, likely range 1.0–2.3 (IPCC AR6 WG1 ch. 5).
  Converted: 0.45°C per 1000 GtCO2, likely 0.27–0.63.
- Human-induced warming in 2025: 1.37°C above 1850–1900, rising ~0.27°C/decade
  (Indicators of Global Climate Change 2025, ESSD; essd.copernicus.org/articles/18/3889/2026).
  On current trends 1.5°C is crossed around 2030.

## Emissions today (Global Carbon Budget 2025)

- Fossil CO2 2025 projection: 38.1 GtCO2. Land-use change: 4.1 GtCO2.
  Total ~42.2 GtCO2/yr (2024 actual: 42.4 ± 3.2).
- Historical world series for the chart: OWID co2-data CSV
  (co2_including_luc, World), already cached in tools/climate/data/raw/.

## Benchmark futures (Climate Action Tracker, Nov 2025 global update)

- Current policies: 2.6°C median by 2100 (was 2.7 in Nov 2024; 0.1 drop is a
  methodology update on China pathways, not progress).
- Pledges & targets (NDCs + net-zero): ~2.2°C.
- Optimistic (all net-zero promises kept): 1.9°C.
- In 2015 current policies pointed at ~3.6°C.

Calibration (verified in node against essays/futures/js/model.js, 2026-08-08):
baseline flat 42.2 to 2050 then linear to 35 by 2100 → all-off cumulative
2981 GtCO2 → 2.71°C by 2100 (CAT current policies: 2.6–2.7 ✓). All levers
maxed → peak 1.40°C in 2081, 1.38 by 2100, net-zero 2082, −5.3 Gt net by 2100
(AR6 C1 pathways: peak ~1.5–1.6, 2100 ~1.4; model runs ~0.1–0.2 optimistic
because aerosol unmasking is ignored — disclose). Mid scenario → 1.93°C
(CAT optimistic net-zero: 1.9 ✓).

## Sector wedges (lever sizes = current sector emissions, phased out)

- Coal power: ~10 GtCO2/yr (IEA: 10 Gt in 2018; 9.9 Gt in 2022, ~76% of
  electricity-sector CO2).
- Transport: ~8 GtCO2/yr total (IEA 2018 via OWID); road = 75% ≈ 6 GtCO2
  (passenger 45.1%, trucks 29.4%); aviation 11.6% ≈ 0.9; shipping 10.6%.
  Lever covers road only; aviation/shipping stay in baseline (say so in prose).
- Deforestation / land-use change: 4.1 GtCO2/yr (GCB 2025).
- Industry & buildings direct emissions: reuse part 1's verified Climate Watch
  sector shares (essays/climate/data/static/sectors.json) to size the wedge;
  lever = halve direct emissions by 2050 (efficiency + electrification).
- Methane: 40–45% cut by 2030 avoids ~0.3°C by the 2040s (UNEP/CCAC Global
  Methane Assessment, 2021). Modelled as a direct −0.3°C offset, not fake CO2.
  No verified number for partial action → lever is two-state (off / full).
- CDR: reader-chosen 0 / 5 / 10 GtCO2/yr by 2100, ramp from 2030. Flagged
  speculative; no source claims it exists at scale.

Double-counting caveat (disclose in methodology): wedges subtract from the
current-policies aggregate; where current policies already assume some sector
decline this overstates a lever slightly. The two calibration anchors bound the
error.

## Global strip (payoff B), all sourced

- 70–90% of coral reefs decline at 1.5°C; >99% at 2°C (IPCC SR15 SPM, high /
  very high confidence).
- Sustained warming between 2°C and 3°C: Greenland and West Antarctic ice
  sheets lost almost completely and irreversibly over millennia; together
  9–11 m of sea level (IPCC AR6).
- Sea level by 2100 (likely, vs 1995–2014): 0.28–0.55 m lowest pathway
  (SSP1-1.9); 0.63–1.01 m highest (SSP5-8.5) (AR6 WG1).
- Markers: 1.5 and 2.0 (Paris); 1.9 / 2.2 / 2.6 (CAT, above); reader's dial.

## Part 3 callback (payoff A)

Interpolate hot25 / hot28 / tropical nights linearly between part 3's verified
UKCP18 anchor columns (essays/summer/data/static/cities.json:
[baseline, observed 2001–20, 2°C, 4°C]). Global warming level assigned to each
column: observed 2001–2020 ≈ 1.1°C (IGCC decade averages), 2°C and 4°C columns
at face value. Below 1.1 clamp to observed; label the whole panel as linear
interpolation between published anchors, not new projection.

## Sources

- IPCC AR6 WG1 ch.5 (TCRE); WG1 SPM/ch.9 (sea level); SYR (ice sheets)
- IPCC SR15 SPM (coral)
- IGCC 2025 (ESSD 18, 3889, 2026) — warming to date
- Global Carbon Budget 2025 (ESSD) — emissions
- Climate Action Tracker Nov 2025 global update — benchmark futures
- UNEP/CCAC Global Methane Assessment 2021 — methane °C
- IEA (via OWID "Cars, planes, trains", 2018 data) — transport split
- IEA — coal power ~10 GtCO2
