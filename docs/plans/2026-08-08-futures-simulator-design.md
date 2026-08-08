# Climate futures simulator — design (Climate Series finale)

## Concept

`essays/futures/` (order 19): a guided-build scrollytelling simulator. The sticky
chart is the global CO2 emissions curve 2000–2100 with a live warming readout.
The reader receives six policy dials one scroll-step at a time; each dial bends
the curve; cumulative emissions set the warming via TCRE. The essay closes by
translating the reader's chosen future back into part 3's summer numbers and a
sourced global-consequences strip.

## Model (data/static/model.json, per-value source fields)

- Warming = 1.3°C observed + TCRE × cumulative future CO2.
  TCRE = 0.45°C per 1000 GtCO2, likely range 0.27–0.63 (IPCC AR6 WG1), drawn
  as an uncertainty band, stated in prose.
- Baseline = current-policies pathway: ~37 GtCO2/yr, slow decline, calibrated
  to land near Climate Action Tracker's ~2.7°C by 2100 with all dials off.
- Each lever subtracts a sourced wedge (GtCO2/yr, phased in) from the baseline.
  Methane is a direct °C offset (AR6 methane mitigation ≈ 0.2°C class), not
  fake CO2.
- Calibration anchors (unit-checked before any prose quotes a number):
  all-off ≈ 2.6–2.8°C; all-max ≈ 1.6–1.8°C. If sourced wedges cannot hit both,
  fix the wedges, never fudge the physics.
- Limits disclosed in methodology: linear TCRE, no carbon-cycle surprises,
  CDR speculative.

## Levers (scrolly 2, one step each, control in the step like part 2)

1. Coal exit year for unabated power (2070 / 2050 / 2040)
2. Transport: combustion-car sales end year + aviation growth
3. Methane: none / pledged / deep cuts → °C offset
4. Forests: deforestation halt + reforestation wedge
5. Industry & buildings efficiency/electrification wedge
6. Carbon removal: 0 / 5 / 10 GtCO2 per yr by 2100 (flagged speculative)

Wedge sizes from IPCC AR6 WG3 mitigation potentials (SPM.7 class); every step
states its wedge and source in prose. No invented numbers; research pass first,
same discipline as part 3 (tools/futures/research/ notes file).

## Structure

- Masthead: kicker "Climate series · finale"; hook: three essays of diagnosis,
  this is the treatment room.
- Scrolly 1 "the machine" (3 steps): baseline draws, area fills, readout climbs
  to ~2.7°C, TCRE band appears with one honest uncertainty sentence.
- Scrolly 2 "the dials" (6 steps): one lever per step, curve bends live.
- Scrolly 3 "the reckoning": 1.5°C and 2°C markers land; free-play state.
- Payoff A: part 3 callback. Same 8-city picker; hot days and tropical nights
  linearly interpolated between part 3's verified UKCP18 anchor columns
  (baseline / 2°C / 4°C), labelled as interpolation.
- Payoff B: global strip. Horizontal 1.0–4.5°C scale, ~6 AR6-sourced
  consequence markers plus the reader's marker, current-policies and pledges
  markers. Reuse the `ladder()` label-collision helper from
  essays/summer/js/charts/record.js (slider-driven labels).
- Close: agency-focused ending; methodology footer lists every constant,
  source, and model limit.
- State (all dials + city) persists in the URL hash, shareable like part 2.

## Registration & verification

- Front matter: order 19, date 2026-08-08, `updated` bumped past part 3 so the
  finale leads the feed; passthrough entries for essays/futures/{css,js,data};
  part 3 nav gains a "Finale →" link; parts 1–2 untouched.
- Verify: model anchor checks; full browser scroll-through with visible window
  (rAF gotcha); every hand-entered figure checked against its source;
  `npm run build` output check; user reviews prose before commit.
