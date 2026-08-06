/* Hook: the whole UK income distribution (All, after housing costs), with the
   average, the median and the poverty line revealed one step at a time. */
import { C, svgIn, fmt } from "../lib.js";

export function hookChart(el, dist, stats) {
  const W = 720, H = 500, M = { t: 54, r: 24, b: 46, l: 30 };
  const svg = svgIn(el, W, H);

  const series = dist.data.All.AHC.filter(d => d.band >= 0 && d.band <= 1200);
  const s = stats.data.AHC;

  const x = d3.scaleLinear().domain([0, 1200]).range([M.l, W - M.r]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(series, d => d.share) * 1.08]).range([H - M.b, M.t]);
  const bw = (x(10) - x(0)) - 1;

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${H - M.b})`)
    .call(d3.axisBottom(x).ticks(7).tickFormat(d => "£" + d).tickSizeOuter(0));
  svg.append("text").attr("class", "anno").attr("x", W - M.r).attr("y", H - 10)
    .attr("text-anchor", "end").attr("fill", C.inkSoft)
    .text("equivalised income, £/week (after housing costs)");

  svg.append("text").attr("class", "chart-title").attr("x", M.l).attr("y", 26)
    .text("Every household in Britain, lined up by income");

  // poverty shading (revealed at step 3)
  const shade = svg.append("rect")
    .attr("x", x(0)).attr("y", M.t)
    .attr("width", x(s.poverty) - x(0)).attr("height", H - M.b - M.t)
    .attr("fill", C.poverty).attr("opacity", 0);

  // bars
  const bars = svg.append("g").selectAll("rect").data(series).join("rect")
    .attr("x", d => x(d.band)).attr("width", bw)
    .attr("y", H - M.b).attr("height", 0)
    .attr("fill", C.reality).attr("opacity", 0.85);

  function vline(value, color, label, dy) {
    const g = svg.append("g").attr("opacity", 0);
    g.append("line").attr("x1", x(value)).attr("x2", x(value))
      .attr("y1", M.t - 6).attr("y2", H - M.b)
      .attr("stroke", color).attr("stroke-width", 2.5);
    g.append("text").attr("x", x(value)).attr("y", M.t - 10 + dy)
      .attr("text-anchor", "middle").attr("fill", color)
      .attr("font-weight", 700).attr("font-size", ".72rem")
      .text(label);
    return g;
  }
  const gMean = vline(s.mean, C.perception, `average £${Math.round(s.mean)}`, 0);
  const gMedian = vline(s.median, C.ink, `median £${Math.round(s.median)}`, 16);
  const gPov = vline(s.poverty, C.poverty, `poverty £${Math.round(s.poverty)}`, 0);

  let drawn = false;
  function grow() {
    if (drawn) return; drawn = true;
    bars.transition().duration(900).delay((d, i) => i * 4)
      .attr("y", d => y(d.share)).attr("height", d => H - M.b - y(d.share));
  }

  return {
    onStep(i) {
      if (i >= 0) grow();
      gMean.transition().duration(400).attr("opacity", i >= 1 ? 1 : 0);
      gMedian.transition().duration(400).attr("opacity", i >= 2 ? 1 : 0);
      gPov.transition().duration(400).attr("opacity", i >= 3 ? 1 : 0);
      shade.transition().duration(500).attr("opacity", i >= 3 ? 0.14 : 0);
    },
  };
}
