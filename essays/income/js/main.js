import { loadAll, scroller } from "./lib.js";
import { hookChart } from "./charts/hook.js";
import { calculator } from "./charts/calculator.js";
import { explorer } from "./charts/explorer.js";
import { bandsChart } from "./charts/bands.js";
import { ageChart } from "./charts/age.js";
import { regionChart } from "./charts/region.js";
import { housingChart } from "./charts/housing.js";

const D = await loadAll(["distribution", "stats", "regional", "static/perceptions"]);
const $ = id => document.getElementById(id);

/* hook: the whole distribution */
scroller("hook", hookChart($("chart-hook"), D.distribution, D.stats));

/* where do you sit — feeds its result into the explorer's "you" line */
const exp = explorer($("chart-explorer"), D.distribution, D.stats);
calculator($("calc"), D.distribution, D.stats, you => exp.setYou(you));

/* OECD bands (scrolly) */
scroller("bands", bandsChart($("chart-bands"), D.distribution, D.stats));

/* solo charts */
ageChart($("chart-age"), D.distribution, D.stats);
regionChart($("chart-region"), D.regional);
housingChart($("chart-housing"), D.distribution, D.stats);

/* belief cards */
{
  const wrap = $("beliefs-cards");
  for (const c of D.perceptions.beliefs) {
    const d = document.createElement("div");
    d.className = `belief-card card--${c.kind}`;
    const h = document.createElement("p"); h.className = "big"; h.textContent = c.big;
    const p = document.createElement("p"); p.textContent = c.text;
    const s = document.createElement("span"); s.className = "src";
    s.textContent = (c.kind === "myth" ? "the assumption · " : "the record · ") + c.src;
    d.append(h, p, s);
    wrap.appendChild(d);
  }
}

/* sources */
{
  const list = $("sources-list");
  const seen = new Set();
  for (const v of Object.values(D)) {
    if (v.source && !seen.has(v.source)) {
      seen.add(v.source);
      const d = document.createElement("div");
      d.textContent = "· " + v.source;
      list.appendChild(d);
    }
  }
}
