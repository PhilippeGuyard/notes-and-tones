import { loadAll, scroller } from "./lib.js";
import { hookChart } from "./charts/hook.js";
import { perceptionChart } from "./charts/perception.js";
import { calculator } from "./charts/calculator.js";
import { welfareChart } from "./charts/welfare.js";
import { debtChart } from "./charts/debt.js";

const D = await loadAll(["spending", "welfare", "debt_interest", "static/perceptions"]);
const $ = id => document.getElementById(id);

/* scrolly sections */
scroller("hook", hookChart($("chart-hook"), D.spending));
scroller("myth1", perceptionChart($("chart-perception"), D.perceptions));
scroller("myth2", welfareChart($("chart-welfare"), D.welfare));

/* the letter */
calculator($("calc"), D.spending, D.perceptions);

/* solo charts */
debtChart($("chart-debt"), D.debt_interest);

/* ---- guess widget ---- */
{
  const w = $("guess-widget");
  const A = D.perceptions.aid;
  const row = document.createElement("div");
  row.className = "gw-row";
  const slider = Object.assign(document.createElement("input"),
    { type: "range", min: 0, max: 50, value: 25 });
  const val = Object.assign(document.createElement("span"),
    { className: "gw-value", textContent: "25" });
  const btn = Object.assign(document.createElement("button"),
    { textContent: "Lock in" });
  const result = Object.assign(document.createElement("p"),
    { className: "gw-result" });
  slider.addEventListener("input", () => (val.textContent = slider.value));
  btn.addEventListener("click", () => {
    const g = +slider.value;
    const actual = A.actual;
    const diff = g - actual;
    result.textContent =
      diff > 1
        ? `You said £${g} in every £100. The audited figure is ${actual}p (${A.source}, ${A.year}), so you overshot by a factor of ${Math.round(g / actual)}. You are in good company. ${A.factoid}`
        : diff < -0.5
          ? `You said £${g} in every £100. The audited figure is ${actual}p (${A.source}, ${A.year}), so you undershot, which makes you rare. ${A.factoid}`
          : `You said £${g} in every £100, almost exactly right: the audited figure is ${actual}p (${A.source}, ${A.year}). Most people are not close. ${A.factoid}`;
    w.classList.add("revealed");
  });
  row.append(slider, val, btn);
  w.append(row, result);
}

/* ---- belief cards ---- */
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
