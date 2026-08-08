/* The year as a ring; the growing season stretches. UK-wide, disclosed. */
import { C, svgIn } from "../lib.js";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const day2a = d => (d / 365) * 2 * Math.PI - Math.PI / 2;

export function seasonsChart(el, uk) {
  const W = 720, H = 480, CX = 360, CY = 260, R = 150;
  const svg = svgIn(el, W, H);
  const gs = uk.growing_season;

  svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26)
    .text("England's growing season, then and now");
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46).attr("fill", C.inkSoft)
    .text("Met Office State of the UK Climate · 5°C-threshold definition");

  const ring = svg.append("g");
  ring.append("circle").attr("cx", CX).attr("cy", CY).attr("r", R)
    .attr("fill", "none").attr("stroke", C.rule).attr("stroke-width", 1.5);
  MONTHS.forEach((m, i) => {
    const a = day2a(i * 30.4 + 15);
    ring.append("text")
      .attr("x", CX + Math.cos(a) * (R + 24)).attr("y", CY + Math.sin(a) * (R + 24) + 4)
      .attr("text-anchor", "middle").attr("font-size", ".66rem").attr("fill", C.inkSoft)
      .text(m);
  });

  /* arcs centred on 1 July: baseline vs recent */
  const mk = (days, color, r) => {
    const half = days / 2, mid = 182;
    const arc = d3.arc()
      .innerRadius(r - 9).outerRadius(r)
      .startAngle(day2a(mid - half) + Math.PI / 2)
      .endAngle(day2a(mid + half) + Math.PI / 2);
    return svg.append("path").attr("transform", `translate(${CX},${CY})`)
      .attr("d", arc()).attr("fill", color).attr("opacity", 0);
  };
  const baseArc = mk(gs.baseline_6190_days, C.dataSoft, R - 4);
  const nowArc = mk(gs.recent_days, C.data, R - 18);

  const centre = svg.append("text").attr("x", CX).attr("y", CY - 6)
    .attr("text-anchor", "middle").attr("font-size", "1.6rem")
    .attr("font-weight", 800).attr("font-family", "Fraunces").attr("opacity", 0);
  const centreSub = svg.append("text").attr("x", CX).attr("y", CY + 18)
    .attr("text-anchor", "middle").attr("font-size", ".7rem")
    .attr("fill", C.inkSoft).attr("opacity", 0);

  function draw(step, dur = 600) {
    baseArc.transition().duration(dur).attr("opacity", 1);
    nowArc.transition().duration(dur).attr("opacity", step >= 1 ? 1 : 0);
    centre.transition().duration(dur).attr("opacity", step >= 1 ? 1 : 0)
      .text(step >= 2 ? "+21%" : `+${gs.longer_days} days`);
    centreSub.transition().duration(dur).attr("opacity", step >= 1 ? 1 : 0)
      .text(step >= 2 ? `growing degree days, ${gs.gdd_period}` : `${gs.period} vs 1961–1990`);
  }

  draw(0);
  return { onStep: s => draw(s) };
}
