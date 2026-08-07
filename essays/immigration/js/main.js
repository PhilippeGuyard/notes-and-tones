import { loadAll, scroller } from "./lib.js";
import { hookChart } from "./charts/hook.js";
import { perceptionChart } from "./charts/perception.js";
import { compositionChart } from "./charts/composition.js";
import { originsChart } from "./charts/origins.js";
import { ukSeriesChart } from "./charts/ukseries.js";
import { frontexChart } from "./charts/frontex.js";
import { perCapitaChart } from "./charts/percapita.js";
import { hostsChart } from "./charts/hosts.js";
import { salienceChart } from "./charts/salience.js";
import { warsChart } from "./charts/wars.js";
import { deathsChart } from "./charts/deaths.js";
import { resettlementChart } from "./charts/resettlement.js";

const D = await loadAll([
  "salience", "uk_net_migration", "frontex", "eu_asylum", "per_capita_asylum",
  "refugee_hosts", "med_deaths", "resettlement", "origins",
  "static/perceptions", "static/composition", "static/events", "static/facts",
  "static/small_boats",
]);

const $ = id => document.getElementById(id);

/* scrolly sections */
scroller("hook", hookChart($("chart-hook"), D.salience, D.uk_net_migration));
scroller("myth1", perceptionChart($("chart-perception"), D.perceptions));
scroller("myth2", compositionChart($("chart-composition"), D.composition));
scroller("myth3origins", originsChart($("chart-origins"), D.origins));
scroller("myth4uk", ukSeriesChart($("chart-ukseries"), D.uk_net_migration));
scroller("myth4eu", frontexChart($("chart-frontex"), D.frontex));
scroller("gap", salienceChart($("chart-salience"), D.salience, D.events));

/* solo charts */
perCapitaChart($("chart-percapita"), D.per_capita_asylum);
hostsChart($("chart-hosts"), D.refugee_hosts);
warsChart($("chart-wars"), D.eu_asylum, D.facts);
deathsChart($("chart-deaths"), D.med_deaths);
resettlementChart($("chart-resettlement"), D.resettlement);

/* ---- guess widget ---- */
{
  const w = $("guess-widget");
  const row = document.createElement("div");
  row.className = "gw-row";
  const slider = Object.assign(document.createElement("input"),
    { type: "range", min: 0, max: 100, value: 50 });
  const val = Object.assign(document.createElement("span"),
    { className: "gw-value", textContent: "50" });
  const btn = Object.assign(document.createElement("button"),
    { textContent: "Lock in" });
  const result = Object.assign(document.createElement("p"),
    { className: "gw-result" });
  slider.addEventListener("input", () => (val.textContent = slider.value));
  btn.addEventListener("click", () => {
    const g = +slider.value;
    const actual = 16; // ~16% foreign-born, England & Wales census 2021
    const diff = g - actual;
    result.textContent =
      diff > 2
        ? `You guessed ${g}%. The measured share is about ${actual}% (2021 census), so you overshot by ${diff} points. You're in good company: the average British guess is 24%.`
        : diff < -2
          ? `You guessed ${g}%. The measured share is about ${actual}% (2021 census), so you undershot by ${-diff} points, which makes you rare: the average British guess is 24%.`
          : `You guessed ${g}%, almost exactly right (about ${actual}%, 2021 census). The average British guess is 24%.`;
    w.classList.add("revealed");
  });
  row.append(slider, val, btn);
  w.append(row, result);
}

/* ---- belief cards (myth 6) ---- */
{
  const F = D.facts.data;
  const cards = [
    ["myth", "2:1", "Britons believe, by two to one, that immigrants take more in benefits than they pay in tax.", "NIESR attitudes review"],
    ["fact", "NRPF", "Most UK visas carry “No Recourse to Public Funds”: no Universal Credit, no housing benefit, no child benefit until permanent settlement.", F.nrpf.source],
    ["fact", "6% vs 11%", "Out-of-work benefit claim rates: non-UK nationals 6%, UK nationals 11% (last robust DWP comparison).", "DWP 2014"],
    ["fact", "OBR", "An average-wage migrant arriving at 25 contributes more over a lifetime than a UK-born worker on the same wage.", F.obr_fiscal.source],
    ["myth", "39%", "of Britons now believe immigrants increase crime, up from 30% just two years earlier.", F.crime_belief.source],
    ["fact", "No link", "Studies of England & Wales and 23 European countries find no causal effect of immigration on crime. Property crime fell for 20 years while the foreign-born population rose.", "LSE; Migration Observatory"],
  ];
  const wrap = $("beliefs-cards");
  for (const [kind, big, text, src] of cards) {
    const d = document.createElement("div");
    d.className = `belief-card card--${kind}`;
    const h = document.createElement("p");
    h.className = "big";
    h.textContent = big;
    const p = document.createElement("p");
    p.textContent = text;
    const s = document.createElement("span");
    s.className = "src";
    s.textContent = (kind === "myth" ? "the belief · " : "the record · ") + src;
    d.append(h, p, s);
    wrap.appendChild(d);
  }
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
