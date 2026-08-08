# Climate series part 2: footprint explorer — design

Working title: "Your Seven Tonnes". Folder essay at `essays/footprint/`, order 17,
guided build-up scrollytelling with a persistent stacked-bar chart.

## Concept

Part 1 ended at 7.1 t per Briton (consumption basis). Part 2 asks: where are
*your* tonnes? The sticky chart is a stacked bar that fills as the reader makes
choices, then lands on part 1's world scales at the reveal.

## Structure

1. Masthead + hook (callback to part 1's 7.1 t).
2. The part you can't switch off: bar starts at ~3 t baseline (services,
   infrastructure, embedded consumption). Nearly half the footprint precedes any
   lifestyle choice; only politics touches it.
3. Lever scrollies, controls inside steps:
   - Getting around: car type (none / petrol / EV) + miles-per-week slider
     ("your miles, across all cars") + bought-new toggle adding amortized
     embodied manufacturing (~0.47 t/yr new petrol, ~0.67 t/yr new EV over a
     15-year life; kept/used ~0.1 t/yr). Dedicated step: new EV vs keeping an
     old petrol car at your mileage. No number-of-cars control: emissions
     follow miles, not vehicles owned.
   - Flying: short-haul and long-haul round trips per year (steppers)
   - At home: heating type (gas / heat pump / all-electric) + household size
   - Eating: diet selector (meat-heavy → vegan)
4. Reveal: total vs world bottom 50% (1.6 t), middle 40% (6.6 t), UK average
   (7.1 t), top-10% threshold, plus the 2 t Paris marker.
5. Close: biggest segment vs easiest cut; link to part 1's actions chart.

State is shareable via location.hash.

## Data

- Car & home & flights: UK Government (DESNZ/DEFRA 2025) GHG conversion factors;
  EV and electric heating priced off the grid factor. Flights include the
  radiative-forcing multiplier, disclosed (LHR–NYC round trip ≈ 1.6 t, matching
  part 1's actions chart).
- Home energy defaults: ~11,500 kWh gas + ~2,700 kWh electricity per household,
  divided by household size.
- Diets: Poore & Nemecek (2018) annual totals: meat-heavy ~2.5, average ~2.0,
  vegetarian ~1.4, vegan ~1.0 t.
- Baseline reconciliation: baseline = 7.1 t − sum of levers at UK-average
  settings, so an exactly-average reader reproduces part 1's number.
- Caveat for methodology: factors are CO2e; part 1's country charts were CO2.
  Disclose as in part 1's sectors chart.

## Files

essays/footprint/{index.html, css/style.css, js/lib.js, js/main.js,
js/charts/footprint.js, data/static/factors.json}; eleventy passthrough for
css/js/data; part 1 nav/foot links updated to point here.

## Verification

- UK-average settings sum to exactly 7.1 t.
- Hash roundtrip: set state, reload with hash, controls and bar restore.
- Browser scroll-through with zero console errors; mobile 375 px check.
- Flight factor sanity: one long-haul RT ≈ 1.6 t (consistency with part 1).
