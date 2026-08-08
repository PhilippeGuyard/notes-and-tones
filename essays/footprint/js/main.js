import { loadAll, scroller } from "./lib.js";
import { footprintChart } from "./charts/footprint.js";

const D = await loadAll(["static/factors"]);
const F = D.factors.data;
const $ = id => document.getElementById(id);

/* ---- state ---- */
const state = {
  carType: "petrol", miles: 80, carBuy: "kept",
  short: 1, long: 0, heat: "gas", household: 2, diet: "average",
};

const KM_PER_MILE = 1.609;

function pieces(s) {
  const car = s.carType === "none" ? 0
    : s.miles * 52 * KM_PER_MILE * F.car_per_km[s.carType];
  const embodied = s.carType === "none" ? 0
    : s.carBuy === "kept" ? F.car_embodied.kept
    : F.car_embodied[s.carType === "ev" ? "new_ev" : "new_petrol"];
  return {
    baseline: BASELINE,
    home: F.home_kg_per_household[s.heat] / s.household,
    food: F.diet[s.diet],
    car,
    embodied,
    flights: s.short * F.flight_short_rt + s.long * F.flight_long_rt,
  };
}
const total = p => Object.values(p).reduce((a, b) => a + b, 0);

/* baseline = part one's UK total minus the levers at average settings */
const BASELINE = (() => {
  const avg = F.average_settings;
  const leverSum = total({ ...piecesNoBaseline(avg) });
  return F.uk_total_kg - leverSum;
  function piecesNoBaseline(s) {
    return {
      home: F.home_kg_per_household[s.heat] / s.household,
      food: F.diet[s.diet],
      car: s.carType === "none" ? 0 : s.miles * 52 * KM_PER_MILE * F.car_per_km[s.carType],
      embodied: s.carType === "none" ? 0
        : s.carBuy === "kept" ? F.car_embodied.kept
        : F.car_embodied[s.carType === "ev" ? "new_ev" : "new_petrol"],
      flights: s.short * F.flight_short_rt + s.long * F.flight_long_rt,
    };
  }
})();
$("baseline-t").textContent = (BASELINE / 1000).toFixed(1);

/* ---- hash <-> state (positional, shareable) ---- */
const HASH_KEYS = ["carType", "miles", "carBuy", "short", "long", "heat", "household", "diet"];
function writeHash() {
  history.replaceState(null, "", "#" + HASH_KEYS.map(k => state[k]).join(","));
}
function readHash() {
  const parts = location.hash.slice(1).split(",");
  if (parts.length !== HASH_KEYS.length) return;
  const [carType, miles, carBuy, short, long, heat, household, diet] = parts;
  if (F.car_per_km[carType] === undefined || F.home_kg_per_household[heat] === undefined
      || F.diet[diet] === undefined || !["kept", "new"].includes(carBuy)) return;
  Object.assign(state, {
    carType, carBuy, heat, diet,
    miles: Math.max(0, Math.min(400, +miles || 0)),
    short: Math.max(0, Math.min(20, +short || 0)),
    long: Math.max(0, Math.min(20, +long || 0)),
    household: Math.max(1, Math.min(8, +household || 1)),
  });
}
readHash();

/* ---- chart + scroller ---- */
const chart = footprintChart($("chart-footprint"), F);
scroller("build", chart);

function comparison() {
  const km = state.miles * 52 * KM_PER_MILE;
  return {
    ev: km * F.car_per_km.ev + F.car_embodied.new_ev,
    petrol: km * F.car_per_km.petrol + F.car_embodied.kept,
  };
}

function refresh() {
  const p = pieces(state);
  chart.update(p, comparison());
  const c = comparison();
  $("car-verdict").textContent = state.carType === "none"
    ? "You have no car, which settles the comparison from the sidelines."
    : c.ev < c.petrol
      ? `At your mileage the new EV wins: ${(c.ev / 1000).toFixed(1)} t a year against ${(c.petrol / 1000).toFixed(1)} t for keeping the petrol car.`
      : `At your mileage keeping the old car wins: ${(c.petrol / 1000).toFixed(1)} t a year against ${(c.ev / 1000).toFixed(1)} t for the new EV.`;
  const t = total(p);
  const biggest = Object.entries(p).filter(([k]) => k !== "baseline")
    .sort((a, b) => b[1] - a[1])[0];
  const NAMES = { home: "home energy", food: "food", car: "driving",
                  embodied: "the car itself", flights: "flying" };
  $("verdict").textContent =
    `Your footprint: ${(t / 1000).toFixed(1)} tonnes a year, against the UK average of ${(F.uk_total_kg / 1000).toFixed(1)}. ` +
    `Your biggest personal slice is ${NAMES[biggest[0]]} at ${(biggest[1] / 1000).toFixed(1)} t.`;
  writeHash();
}

/* ---- controls ---- */
function buttonGroup(parent, options, get, set) {
  const div = document.createElement("div");
  div.className = "chart-toggle";
  const btns = options.map(([key, label]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", () => { set(key); sync(); refresh(); });
    div.appendChild(b);
    return [key, b];
  });
  function sync() { for (const [k, b] of btns) b.classList.toggle("on", get() === k); }
  sync();
  parent.appendChild(div);
  return sync;
}

function stepper(parent, label, get, set, min, max) {
  const row = document.createElement("div");
  row.className = "stepper";
  const cap = document.createElement("span");
  cap.className = "stepper-label";
  cap.textContent = label;
  const minus = Object.assign(document.createElement("button"), { textContent: "−", type: "button" });
  const val = Object.assign(document.createElement("span"), { className: "stepper-value", textContent: get() });
  const plus = Object.assign(document.createElement("button"), { textContent: "+", type: "button" });
  const nudge = d => () => { set(Math.max(min, Math.min(max, get() + d))); val.textContent = get(); refresh(); };
  minus.addEventListener("click", nudge(-1));
  plus.addEventListener("click", nudge(1));
  row.append(cap, minus, val, plus);
  parent.appendChild(row);
  return () => { val.textContent = get(); };
}

const syncs = [];

/* car */
syncs.push(buttonGroup($("ctl-car"),
  [["none", "No car"], ["petrol", "Petrol / diesel"], ["ev", "Electric"]],
  () => state.carType, v => { state.carType = v; }));
{
  const row = document.createElement("div");
  row.className = "gw-row";
  const slider = Object.assign(document.createElement("input"),
    { type: "range", min: 0, max: 400, step: 10, value: state.miles });
  const val = Object.assign(document.createElement("span"),
    { className: "ctl-value", textContent: state.miles + " mi/wk" });
  slider.addEventListener("input", () => {
    state.miles = +slider.value;
    val.textContent = state.miles + " mi/wk";
    refresh();
  });
  row.append(slider, val);
  $("ctl-car").appendChild(row);
  syncs.push(() => { slider.value = state.miles; val.textContent = state.miles + " mi/wk"; });
}

/* bought new */
syncs.push(buttonGroup($("ctl-carbuy"),
  [["kept", "Bought used, or kept"], ["new", "Bought new"]],
  () => state.carBuy, v => { state.carBuy = v; }));

/* flights */
syncs.push(stepper($("ctl-fly"), "short-haul round trips",
  () => state.short, v => { state.short = v; }, 0, 20));
syncs.push(stepper($("ctl-fly"), "long-haul round trips",
  () => state.long, v => { state.long = v; }, 0, 20));

/* home */
syncs.push(buttonGroup($("ctl-home"),
  [["gas", "Gas boiler"], ["heatpump", "Heat pump"], ["electric", "Electric heating"]],
  () => state.heat, v => { state.heat = v; }));
syncs.push(stepper($("ctl-home"), "people in the household",
  () => state.household, v => { state.household = v; }, 1, 8));

/* diet */
syncs.push(buttonGroup($("ctl-diet"),
  [["meat_heavy", "Meat most days"], ["average", "Average"],
   ["vegetarian", "Vegetarian"], ["vegan", "Vegan"]],
  () => state.diet, v => { state.diet = v; }));

/* share */
$("share-btn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    $("share-done").textContent = "copied";
  } catch {
    $("share-done").textContent = location.href;
  }
});

refresh();

/* ---- sources list ---- */
{
  const list = $("sources-list");
  for (const v of Object.values(D)) {
    if (v.source) {
      const d = document.createElement("div");
      d.textContent = "· " + v.source + (v.retrieved ? ` (retrieved ${v.retrieved})` : "");
      list.appendChild(d);
    }
  }
}
