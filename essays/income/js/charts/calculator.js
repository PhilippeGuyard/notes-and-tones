/* "Where do you actually sit?" — the reader enters their household income,
   we equivalise it the way HBAI does and show their true percentile, against
   the near-universal instinct to guess "somewhere in the middle". */
import { C, HOUSEHOLDS, equivalise, percentileBelow, cumBelow, fmt } from "../lib.js";

// UK resident population, ONS mid-2023 (~68.3 million), for turning a
// percentile into a head count.
const UK_POP = 68_300_000;

function people(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " million";
  if (n >= 1e4) return Math.round(n / 1e4) * 10 + " thousand";
  if (n >= 1e3) return Math.round(n / 1e3) + " thousand";
  return Math.round(n).toLocaleString();
}

export function calculator(el, dist, stats, onYou) {
  const state = { hh: HOUSEHOLDS[1], period: "year", housing: "AHC", income: 40000 };

  const wrap = d3.select(el);
  const controls = wrap.append("div").attr("class", "calc-controls");

  // household
  const f1 = controls.append("div").attr("class", "calc-field");
  f1.append("label").text("Your household");
  const sel = f1.append("select");
  sel.selectAll("option").data(HOUSEHOLDS).join("option")
    .attr("value", d => d.key).text(d => d.label)
    .property("selected", d => d === state.hh);
  sel.on("change", function () {
    state.hh = HOUSEHOLDS.find(h => h.key === this.value); render();
  });

  // income
  const f2 = controls.append("div").attr("class", "calc-field");
  f2.append("label").text("Net household income");
  const inc = f2.append("input").attr("type", "number").attr("min", 0).attr("step", 500)
    .property("value", state.income);
  inc.on("input", function () { state.income = +this.value || 0; render(); });

  // per year / per week
  const f3 = controls.append("div").attr("class", "calc-field");
  f3.append("label").text("Per");
  const segP = f3.append("div").attr("class", "seg");
  for (const [k, lab] of [["year", "year"], ["week", "week"]]) {
    segP.append("button").attr("data-k", k).text(lab)
      .on("click", () => {
        // convert the shown figure so the meaning is preserved
        if (k !== state.period) {
          state.income = k === "week" ? Math.round(state.income / 52) : Math.round(state.income * 52);
          inc.property("value", state.income);
        }
        state.period = k; render();
      });
  }

  // housing basis
  const f4 = controls.append("div").attr("class", "calc-field");
  f4.append("label").text("Measured");
  const segH = f4.append("div").attr("class", "seg");
  for (const [k, lab] of [["BHC", "before housing"], ["AHC", "after housing"]]) {
    segH.append("button").attr("data-k", k).text(lab)
      .on("click", () => { state.housing = k; render(); });
  }

  wrap.append("p").attr("class", "calc-help").text(
    "Take-home pay for everyone in the household, added together. " +
    "“After housing” means once rent or mortgage interest is paid.");

  const result = wrap.append("div").attr("class", "calc-result");
  const rank = result.append("p").attr("class", "calc-rank").node();
  const headcount = result.append("p").attr("class", "calc-people").node();
  const band = result.append("p").attr("class", "calc-band");

  // mini distribution bar
  const barWrap = result.append("div").attr("class", "calc-bar");
  const BW = 720, BH = 120, M = { t: 10, r: 14, b: 26, l: 14 };
  const bsvg = barWrap.append("svg").attr("viewBox", `0 0 ${BW} ${BH}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const bx = d3.scaleLinear().domain([0, 1200]).range([M.l, BW - M.r]);
  bsvg.append("g").attr("class", "axis").attr("transform", `translate(0,${BH - M.b})`)
    .call(d3.axisBottom(bx).ticks(6).tickFormat(d => "£" + d).tickSizeOuter(0));
  const barBars = bsvg.append("g");
  const medLine = bsvg.append("g");
  const youLine = bsvg.append("g").attr("opacity", 0);

  function classify(eq, median) {
    if (eq < 0.60 * median) return ["In poverty", C.poverty];
    if (eq < 0.75 * median) return ["Squeezed", C.squeezed];
    if (eq < 2.00 * median) return ["Middle / comfortable", C.comfortable];
    return ["Well-off", C.welloff];
  }

  function render() {
    segP.selectAll("button").classed("on", function () { return this.dataset.k === state.period; });
    segH.selectAll("button").classed("on", function () { return this.dataset.k === state.housing; });

    const series = dist.data.All[state.housing];
    const median = stats.data[state.housing].median;

    const weekly = state.period === "week" ? state.income : state.income / 52;
    const eq = equivalise(weekly, state.hh, state.housing);
    const [bandName, bandColor] = classify(eq, median);

    // The published data collapses everyone above £1,500/week into one band, so
    // it cannot rank within the richest few per cent. Detect that and say so,
    // rather than claiming "richer than 100%".
    const topEdge = series[series.length - 1].band;
    const belowTop = cumBelow(series, topEdge);
    const inTop = eq >= topEdge;

    const headline = (lead, value, tail) => {
      const a = document.createElement("span"); a.textContent = lead;
      const num = document.createElement("span"); num.className = "num"; num.textContent = value;
      const t = document.createElement("span"); t.textContent = tail;
      rank.replaceChildren(a, num, t);
    };

    let above;
    if (inTop) {
      const topPct = Math.max(1, Math.round(100 - belowTop));
      above = belowTop;
      headline("In the UK’s top ", topPct + "%", ".");
      headcount.textContent =
        `That is at least ${people((belowTop / 100) * UK_POP)} below you. The figures group ` +
        `everyone above £1,500 a week together, so they cannot rank within the richest ${topPct}%.`;
      band.textContent = `Equivalised to £${Math.round(eq)}/week · ${bandName} · the very top`;
    } else {
      above = Math.max(0, Math.min(100, percentileBelow(series, eq)));
      headline("Richer than ", Math.round(above) + "%", " of the UK.");
      const poorerN = (above / 100) * UK_POP;
      const poorerT = above < 0.1 ? "almost nobody" : people(poorerN);
      const richerT = above > 99.9 ? "almost nobody" : people(UK_POP - poorerN);
      headcount.textContent =
        `That is roughly ${poorerT} poorer than you, and ${richerT} richer.`;
      const pctile = Math.round(above);
      band.textContent =
        `Equivalised to £${Math.round(eq)}/week · ${bandName}` +
        (pctile >= 90 ? " · roughly the top tenth"
          : pctile <= 10 ? " · roughly the bottom tenth" : "");
    }

    // redraw mini distribution
    const view = series.filter(d => d.band >= 0 && d.band <= 1200);
    const yb = d3.scaleLinear().domain([0, d3.max(view, d => d.share)]).range([BH - M.b, M.t]);
    const bw = (bx(10) - bx(0)) - 1;
    barBars.selectAll("rect").data(view).join("rect")
      .attr("x", d => bx(d.band)).attr("width", bw)
      .attr("y", d => yb(d.share)).attr("height", d => (BH - M.b) - yb(d.share))
      .attr("fill", C.realitySoft);

    medLine.selectAll("*").remove();
    medLine.append("line").attr("x1", bx(median)).attr("x2", bx(median))
      .attr("y1", M.t).attr("y2", BH - M.b).attr("stroke", C.ink).attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "3 3");
    medLine.append("text").attr("x", bx(median)).attr("y", M.t + 2)
      .attr("text-anchor", "middle").attr("font-size", ".6rem").attr("fill", C.inkSoft)
      .text("median");

    const yx = Math.max(M.l, Math.min(BW - M.r, bx(Math.min(eq, 1200))));
    youLine.attr("opacity", 1).selectAll("*").remove();
    youLine.append("line").attr("x1", yx).attr("x2", yx)
      .attr("y1", M.t - 4).attr("y2", BH - M.b).attr("stroke", bandColor).attr("stroke-width", 3);
    youLine.append("text").attr("x", yx).attr("y", M.t - 6)
      .attr("text-anchor", "middle").attr("font-size", ".62rem").attr("font-weight", 700)
      .attr("fill", bandColor).text("you");

    onYou?.({ eq, housing: state.housing, below: above });
  }

  render();
  return { };
}
