import { loadAll, scroller } from "./lib.js";
import { leaderboardChart } from "./charts/leaderboard.js";
import { inequalityChart } from "./charts/inequality.js";
import { sectorsChart } from "./charts/sectors.js";
import { actionsChart } from "./charts/actions.js";

const D = await loadAll([
  "leaderboard", "uk_share",
  "static/inequality", "static/sectors", "static/actions", "static/facts",
]);

const $ = id => document.getElementById(id);

/* scrolly sections */
scroller("counts", leaderboardChart($("chart-leaderboard"), D.leaderboard));
scroller("inequality", inequalityChart($("chart-inequality"), D.inequality));
scroller("sectors", sectorsChart($("chart-sectors"), D.sectors));
scroller("actions", actionsChart($("chart-actions"), D.actions));

/* ---- guess widget: UK share of this year's global CO₂ ---- */
{
  const w = $("guess-widget");
  const share = D.uk_share.data.uk_share_annual_pct;   // ~0.8
  const year = D.uk_share.data.year;
  const shown = share.toFixed(1);
  const row = document.createElement("div");
  row.className = "gw-row";
  const slider = Object.assign(document.createElement("input"),
    { type: "range", min: 0, max: 30, value: 15 });
  const val = Object.assign(document.createElement("span"),
    { className: "gw-value", textContent: "15%" });
  const btn = Object.assign(document.createElement("button"),
    { textContent: "Lock in" });
  const result = Object.assign(document.createElement("p"),
    { className: "gw-result" });
  slider.addEventListener("input", () => (val.textContent = slider.value + "%"));
  btn.addEventListener("click", () => {
    const g = +slider.value;
    result.textContent =
      g <= 1
        ? `You guessed ${g}%, and the measured share (${year}) is about ${shown}%. Spot on, which is rare. Now watch what that number does under the other three counts.`
        : `You guessed ${g}%. The measured share (${year}) is about ${shown}%, so your guess was roughly ${Math.round(g / share)} times the real number. Before you relax: watch what it does under the other three counts.`;
    w.classList.add("revealed");
  });
  row.append(slider, val, btn);
  w.append(row, result);
}

/* ---- belief cards ---- */
{
  const F = D.facts.data;
  const cards = [
    ["myth", "65%", "Asked how many climate scientists agree that humans are warming the planet, the public's average guess sits around two thirds.", F.consensus_perceived.source],
    ["fact", ">99%", "A review of 88,125 peer-reviewed climate papers found more than 99% agree warming is human-caused. The debate ended in the literature decades before it ended on television.", F.consensus_actual.source],
    ["myth", "“It’s China”", "The most common closing move in any climate argument: China emits a third of this year's tonnes, so nothing anyone else does matters.", "the argument, everywhere"],
    ["fact", "1.5×", "Counted since 1750, the US has emitted half as much again as China. Per person and counting imports, a Briton (7.1 t) is not far behind a Chinese resident (8.6 t).", F.us_china_cumulative.source],
    ["myth", "0.2 t", "What a full year of diligent recycling saves, the action the public most often ranks as the most effective thing an individual can do.", "Wynes & Nicholas (2017); Ipsos"],
    ["fact", "−48%", "UK territorial CO₂ since 1990. Delivered not by bins or straws but by changing what the electricity grid burns.", F.uk_reduction.source],
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
    s.textContent = (kind === "myth" ? "the story · " : "the record · ") + src;
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
