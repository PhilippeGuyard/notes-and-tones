/* The gap that does the most work: what housing costs do to the numbers.
   Median and poverty line slide left from before- to after-housing; the
   poverty rate climbs. */
import { C, svgIn, cumBelow } from "../lib.js";

export function housingChart(el, dist, stats) {
  const W = 720, H = 300, M = { t: 56, r: 90, b: 46, l: 130 };
  const svg = svgIn(el, W, H);
  const x = d3.scaleLinear().domain([0, 800]).range([M.l, W - M.r]);

  svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26)
    .text("What the rent does to the numbers");
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46).attr("fill", C.inkSoft)
    .text("before housing costs → after housing costs, whole population");

  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - M.b})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d => "£" + d).tickSizeOuter(0));

  const rows = [
    { label: "Median income", bhc: stats.data.BHC.median, ahc: stats.data.AHC.median, y: M.t + 24 },
    { label: "Poverty line", bhc: stats.data.BHC.poverty, ahc: stats.data.AHC.poverty, y: M.t + 90 },
  ];

  const defs = svg.append("defs");
  defs.append("marker").attr("id", "arrow").attr("viewBox", "0 0 10 10")
    .attr("refX", 8).attr("refY", 5).attr("markerWidth", 6).attr("markerHeight", 6)
    .attr("orient", "auto-start-reverse")
    .append("path").attr("d", "M0,0 L10,5 L0,10 z").attr("fill", C.perception);

  for (const r of rows) {
    svg.append("text").attr("x", M.l - 12).attr("y", r.y + 4).attr("text-anchor", "end")
      .attr("font-size", ".78rem").attr("font-weight", 600).attr("fill", C.ink).text(r.label);
    svg.append("line").attr("x1", x(r.bhc)).attr("x2", x(r.ahc)).attr("y1", r.y).attr("y2", r.y)
      .attr("stroke", C.perception).attr("stroke-width", 2).attr("marker-end", "url(#arrow)");
    // before dot
    svg.append("circle").attr("cx", x(r.bhc)).attr("cy", r.y).attr("r", 6).attr("fill", C.perceptionSoft)
      .attr("stroke", C.perception).attr("stroke-width", 1.5);
    svg.append("text").attr("x", x(r.bhc)).attr("y", r.y - 12).attr("text-anchor", "middle")
      .attr("font-size", ".66rem").attr("fill", C.inkSoft).text(`£${Math.round(r.bhc)}`);
    // after dot
    svg.append("circle").attr("cx", x(r.ahc)).attr("cy", r.y).attr("r", 7).attr("fill", C.reality);
    svg.append("text").attr("x", x(r.ahc)).attr("y", r.y + 22).attr("text-anchor", "middle")
      .attr("font-size", ".66rem").attr("font-weight", 700).attr("fill", C.reality).text(`£${Math.round(r.ahc)}`);
  }

  const povBHC = Math.round(cumBelow(dist.data.All.BHC, stats.data.BHC.poverty));
  const povAHC = Math.round(cumBelow(dist.data.All.AHC, stats.data.AHC.poverty));
  svg.append("text").attr("x", W - M.r + 6).attr("y", rows[1].y + 4).attr("font-size", ".72rem")
    .attr("font-weight", 700).attr("fill", C.poverty).text(`${povBHC}% → ${povAHC}%`);
  return {};
}
