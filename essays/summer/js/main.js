import { loadAll, scroller } from "./lib.js";
import { analogChart } from "./charts/analog.js";
import { dotsChart } from "./charts/dots.js";
import { recordChart } from "./charts/record.js";
import { seasonsChart } from "./charts/seasons.js";
import { rainChart } from "./charts/rain.js";

const D = await loadAll(["analogs", "static/cities", "static/ukwide"]);
const CITIES = D.cities.data;
const ANALOGS = D.analogs.data;
const UK = D.ukwide.data;
const $ = id => document.getElementById(id);

/* merged per-city view used by charts and text */
function cityView(name) {
  const c = CITIES[name], a = ANALOGS[name];
  return {
    name,
    ...c,
    analogs: a.analogs,
    annual_t: a.annual_mean_t,
    annual_t_2050: a.annual_mean_t_2050,
    wmax: a.warmest_month_max_t,
    wmax2050: a.warmest_month_max_t_2050,
  };
}

/* ---- charts ---- */
const chAnalog = analogChart($("chart-analog"));
const chDots = dotsChart($("chart-dots"));
const chRecord = recordChart($("chart-record"));
const chSeasons = seasonsChart($("chart-seasons"), UK);
const chRain = rainChart($("chart-rain"), UK.regions);

scroller("analog", chAnalog);
scroller("dots", chDots);
scroller("record", chRecord);
scroller("seasons", chSeasons);
scroller("rain", chRain);

/* ---- city selection ---- */
let current = "London";

function nightsSentence(c) {
  const n2 = c.nights[2], n4 = c.nights[3];
  if (n2 >= 1)
    return `Tropical nights, when the temperature never drops below 20°C, go from `
      + `almost unknown to about ${n2} a summer by the 2050s, and ${n4} in a 4°C world.`;
  if (n4 <= 1)
    return `Tropical nights, when the temperature never drops below 20°C, are projected `
      + `to stay rare in ${c.name}: the median is still about ${n4} a year even in a 4°C world. `
      + `Further south they multiply.`;
  return `Tropical nights, when the temperature never drops below 20°C, stay near zero `
    + `in ${c.name} through the 2050s, then reach about ${n4} a year in a 4°C world.`;
}

function fill(field, text) {
  document.querySelectorAll(`[data-f="${field}"]`).forEach(el => (el.textContent = text));
}

function setCity(name) {
  current = name;
  const c = cityView(name);
  const region = UK.regions[c.region];

  fill("city", name);
  fill("annual_t", c.annual_t);
  fill("annual_t_2050", c.annual_t_2050);
  fill("wmax", c.wmax);
  fill("wmax2050", c.wmax2050);
  fill("analog1", c.analogs[0].city);
  fill("analog2", c.analogs[1].city);
  fill("analog3", c.analogs[2].city);
  fill("h25b", c.hot25[0]);
  fill("h28b", c.hot28[0]);
  fill("h25o", c.hot25[1]);
  fill("h25g2", c.hot25[2]);
  fill("h25r2", c.hot25_range2c);
  fill("h28g2", c.hot28[2]);
  fill("h25g4", c.hot25[3]);
  fill("h28g4", c.hot28[3]);
  fill("nights_sentence", nightsSentence(c));
  fill("record_t", c.record.t);
  fill("record_date", c.record.date);
  fill("record_station", c.record.station);
  fill("record_note", c.record.quality === "unverified" ? c.record.note : "");
  fill("region_label", region.label);
  fill("summer_range", `${region.summer_pct[0]}% to ${region.summer_pct[1]}%`);
  fill("winter_range", `+${region.winter_pct[0]}% to +${region.winter_pct[1]}%`);
  fill("summer_t_range", `+${region.summer_t[0]} to +${region.summer_t[1]}°C`);

  chAnalog.setCity(c);
  chDots.setCity(c);
  chRecord.setCity(c);
  chRain.setRegion(region);

  document.querySelectorAll("#city-picker button")
    .forEach(b => b.classList.toggle("on", b.textContent === name));
  history.replaceState(null, "", "#" + encodeURIComponent(name));
}

/* picker */
{
  const wrap = $("city-picker");
  for (const name of Object.keys(CITIES)) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = name;
    b.addEventListener("click", () => setCity(name));
    wrap.appendChild(b);
  }
}

/* initial city from hash */
{
  const fromHash = decodeURIComponent(location.hash.slice(1));
  setCity(CITIES[fromHash] ? fromHash : "London");
}

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
