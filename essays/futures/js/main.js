import { loadAll, scroller } from "./lib.js";
import { compute, DEFAULTS, POSITIONS } from "./model.js";
import { curveChart } from "./charts/curve.js";
import { stripChart } from "./charts/strip.js";

const D = await loadAll(["history", "callback", "static/model", "static/consequences"]);
const M = D.model.data;
const CB = D.callback.data;
const $ = id => document.getElementById(id);

/* ---- state ---- */
const state = { ...DEFAULTS, city: "London" };

/* ---- hash <-> state (positional, shareable) ---- */
const HASH_KEYS = ["coal", "road", "forest", "other", "methane", "cdr", "city"];
function writeHash() {
  history.replaceState(null, "", "#" + HASH_KEYS.map(k => state[k]).join(","));
}
function readHash() {
  const parts = location.hash.slice(1).split(",");
  if (parts.length !== HASH_KEYS.length) return;
  const next = Object.fromEntries(HASH_KEYS.map((k, i) => [k, decodeURIComponent(parts[i])]));
  for (const k of Object.keys(POSITIONS)) {
    if (!POSITIONS[k].includes(next[k])) return;
  }
  if (!CB.cities[next.city]) next.city = "London";
  Object.assign(state, next);
}
readHash();

/* ---- charts + scrollers ---- */
const chCurve = curveChart($("chart-curve"), M, D.history.data.years);
const chStrip = stripChart($("chart-strip"), D.consequences.data);
scroller("build", chCurve);
scroller("strip", chStrip);

/* ---- part 3 callback: interpolate at the reader's peak warming ---- */
function interp(vals, t) {
  const a = CB.anchors_c; /* [1.0, 2.0, 4.0] */
  const tt = Math.max(a[0], Math.min(a[2], t));
  const [i, j] = tt <= a[1] ? [0, 1] : [1, 2];
  const f = (tt - a[i]) / (a[j] - a[i]);
  return Math.round(vals[i] + f * (vals[j] - vals[i]));
}

function fill(field, text) {
  document.querySelectorAll(`[data-f="${field}"]`).forEach(el => (el.textContent = text));
}

function refreshCallback(r) {
  const c = CB.cities[state.city];
  const t = r.peak.t;
  fill("cb-city", state.city);
  fill("cb-peak", t.toFixed(1));
  fill("cb-h25", interp(c.hot25, t));
  fill("cb-h28", interp(c.hot28, t));
  fill("cb-nights", interp(c.nights, t));
  fill("cb-h25-2c", c.hot25[1]);
  fill("cb-h25-4c", c.hot25[2]);
  document.querySelectorAll("#city-picker button")
    .forEach(b => b.classList.toggle("on", b.textContent === state.city));
}

/* ---- refresh ---- */
function refresh() {
  const r = compute(M, state);
  chCurve.update(r);
  chStrip.setWarming(r.peak.t);
  refreshCallback(r);
  const held = r.peak.t <= 2.05;
  $("verdict").textContent =
    `Your century peaks at ${r.peak.t.toFixed(1)}°C` +
    (r.peak.year >= 2099 ? ", still rising in 2100" : ` around ${r.peak.year}`) +
    ` and stands at ${r.t2100.toFixed(1)}°C in 2100 ` +
    `(likely ${r.t2100_range[0].toFixed(1)} to ${r.t2100_range[1].toFixed(1)} across the physics). ` +
    (held ? "The 2°C limit holds. Part three's calendar stops at the column you chose."
          : "The 2°C limit does not hold on these settings.");
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
}

const ctl = (id, key, options) =>
  buttonGroup($(id), options, () => state[key], v => { state[key] = v; });

ctl("ctl-coal", "coal", [
  ["none", "Keeps burning"], ["2050", "Gone by 2050"], ["2040", "Gone by 2040"]]);
ctl("ctl-road", "road", [
  ["none", "No end date"], ["2040", "Sales end 2040"], ["2035", "Sales end 2035"]]);
ctl("ctl-forest", "forest", [
  ["none", "Continues"], ["halt", "Halted by 2035"]]);
ctl("ctl-methane", "methane", [
  ["off", "Left to leak"], ["on", "The 45% programme"]]);
ctl("ctl-other", "other", [
  ["0", "Current course"], ["25", "Quarter off by 2050"], ["50", "Half off by 2050"]]);
ctl("ctl-cdr", "cdr", [
  ["0", "None"], ["5", "5 Gt a year"], ["10", "10 Gt a year"]]);

/* city picker for the callback */
{
  const wrap = $("city-picker");
  for (const name of Object.keys(CB.cities)) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = name;
    b.addEventListener("click", () => { state.city = name; refresh(); });
    wrap.appendChild(b);
  }
}

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
  const seen = new Set();
  for (const v of Object.values(D)) {
    if (v.source && !seen.has(v.source)) {
      seen.add(v.source);
      const d = document.createElement("div");
      d.textContent = "· " + v.source + (v.retrieved ? ` (retrieved ${v.retrieved})` : "");
      list.appendChild(d);
    }
  }
}
