/* Interactive distribution explorer: pick a group and housing basis, drag a
   threshold, and read off how much of Britain lives below it. Mirrors the
   marimo notebook's central chart. */
import { C, svgIn, fmt } from "../lib.js";

export function explorer(el, dist, stats) {
  const state = { group: "All", housing: "AHC", thr: 500, you: null };

  const wrap = d3.select(el);

  // controls
  const controls = wrap.append("div").attr("class", "calc-controls");
  const f1 = controls.append("div").attr("class", "calc-field");
  f1.append("label").text("Group");
  const sel = f1.append("select");
  sel.selectAll("option").data(dist.groups).join("option")
    .attr("value", d => d).text(d => d);
  sel.on("change", function () { state.group = this.value; render(); });

  const f2 = controls.append("div").attr("class", "calc-field");
  f2.append("label").text("Housing costs");
  const seg = f2.append("div").attr("class", "seg");
  for (const [k, lab] of [["BHC", "before"], ["AHC", "after"]]) {
    seg.append("button").attr("data-k", k).text(lab)
      .on("click", () => { state.housing = k; render(); });
  }

  const f3 = controls.append("div").attr("class", "calc-field").style("flex", "1").style("min-width", "220px");
  const lab3 = f3.append("label");
  const slider = f3.append("input").attr("type", "range")
    .attr("min", 0).attr("max", 1200).attr("step", 10).property("value", state.thr);
  slider.on("input", function () { state.thr = +this.value; render(); });

  // callout
  const calloutNode = wrap.append("p").attr("class", "calc-rank").style("margin-top", "1.2rem").node();
  const sub = wrap.append("p").attr("class", "calc-band");

  // chart
  const W = 720, H = 420, M = { t: 44, r: 20, b: 44, l: 30 };
  const svg = svgIn(el, W, H);
  const x = d3.scaleLinear().domain([0, 1200]).range([M.l, W - M.r]);
  const xAxis = svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - M.b})`)
    .call(d3.axisBottom(x).ticks(7).tickFormat(d => "£" + d).tickSizeOuter(0));
  svg.append("text").attr("class", "anno").attr("x", W - M.r).attr("y", H - 8)
    .attr("text-anchor", "end").attr("fill", C.inkSoft).text("equivalised income, £/week");
  const shade = svg.append("rect").attr("y", M.t).attr("fill", C.perception).attr("opacity", 0.12);
  const barsG = svg.append("g");
  const linesG = svg.append("g");

  function pctBelow(series, t) {
    return series.filter(d => d.band < t).reduce((a, d) => a + d.share, 0);
  }

  function render() {
    seg.selectAll("button").classed("on", function () { return this.dataset.k === state.housing; });
    lab3.text(`Threshold  £${state.thr}/week`);

    const full = dist.data[state.group][state.housing];
    const s = stats.data[state.housing];
    const view = full.filter(d => d.band >= 0 && d.band <= 1200);
    const y = d3.scaleLinear().domain([0, d3.max(view, d => d.share) * 1.08]).range([H - M.b, M.t]);
    const bw = (x(10) - x(0)) - 1;

    barsG.selectAll("rect").data(view).join("rect")
      .attr("x", d => x(d.band)).attr("width", bw)
      .attr("y", d => y(d.share)).attr("height", d => (H - M.b) - y(d.share))
      .attr("fill", d => d.band < state.thr ? C.reality : C.realitySoft);

    shade.attr("x", x(0)).attr("width", Math.max(0, x(state.thr) - x(0)))
      .attr("height", H - M.b - M.t);

    linesG.selectAll("*").remove();
    const mark = (v, color, label, dy, weight) => {
      linesG.append("line").attr("x1", x(v)).attr("x2", x(v)).attr("y1", M.t - 4).attr("y2", H - M.b)
        .attr("stroke", color).attr("stroke-width", weight).attr("stroke-dasharray", weight < 2 ? "3 3" : null);
      linesG.append("text").attr("x", x(v)).attr("y", M.t - 4 + dy).attr("text-anchor", "middle")
        .attr("font-size", ".64rem").attr("font-weight", 700).attr("fill", color).text(label);
    };
    mark(s.poverty, C.poverty, `poverty £${Math.round(s.poverty)}`, -4, 1.5);
    mark(s.median, C.ink, `median £${Math.round(s.median)}`, 10, 1.5);
    mark(state.thr, C.perception, "threshold", 24, 3);
    if (state.you != null && state.you.housing === state.housing)
      mark(Math.min(state.you.eq, 1200), C.comfortable, "you", 38, 3);

    const below = pctBelow(full, state.thr);
    const belowPov = pctBelow(full, s.poverty);
    const grpName = state.group === "All" ? "the UK population" : state.group.toLowerCase();

    const a = document.createElement("span"); a.textContent = Math.round(below) + "% ";
    a.className = "num";
    const b = document.createElement("span");
    b.textContent = `of ${grpName} live on less than £${state.thr}/week`;
    calloutNode.replaceChildren(a, b);
    sub.textContent =
      `≈ £${fmt.n(state.thr * 52)}/year, ${state.housing}. ` +
      `For reference, ${Math.round(belowPov)}% are below the poverty line ` +
      `(£${Math.round(s.poverty)}/week, ${state.housing}).`;
  }

  render();
  return {
    setYou(you) { state.you = you; render(); },
  };
}
