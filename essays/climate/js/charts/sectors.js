/* Where the tonnes come from: sector bars, then the talked-about items for scale. */
import { C, svgIn, fmt } from "../lib.js";

export function sectorsChart(el, sec) {
  const W = 720, H = 560, M = { l: 236, r: 64, t: 84 };
  const rowH = 44;
  const svg = svgIn(el, W, H);
  const rows = [...sec.data.sectors].sort((a, b) => b.share - a.share);
  const co = sec.data.callouts;
  const annos = [
    { label: "Aviation (share of CO2)", share: co.aviation_co2_pct },
    { label: "All plastics, made & dumped (est.)", share: 3.5 },
  ];

  svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26)
    .text("Global greenhouse gas emissions, by sector");
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46)
    .attr("fill", C.inkSoft)
    .text("% of global CO2e · Climate Watch via Our World in Data");

  const x = d3.scaleLinear().domain([0, 26]).range([M.l, W - M.r]);
  const FILL = { "Energy": C.data, "Land & food": C.gold,
                 "Industry": C.inkSoft, "Waste": C.dataSoft };
  const stepOf = r =>
    r.group === "Energy" ? 0 : r.group === "Land & food" ? 1 : 2;

  function bar(parent, d, y, fill) {
    const g = parent.append("g").attr("transform", `translate(0,${y})`).attr("opacity", 0);
    g.append("text")
      .attr("x", M.l - 10).attr("y", rowH / 2 + 4)
      .attr("text-anchor", "end").attr("font-size", ".68rem")
      .text(d.label);
    g.append("rect")
      .attr("x", M.l).attr("y", 9).attr("height", rowH - 18).attr("rx", 2)
      .attr("fill", fill)
      .attr("width", Math.max(x(d.share) - M.l, 2));
    g.append("text")
      .attr("x", x(d.share) + 6).attr("y", rowH / 2 + 4)
      .attr("font-size", ".68rem").attr("fill", C.inkSoft)
      .text(fmt.t1(d.share) + "%");
    return g;
  }

  const sectorGs = rows.map((d, i) => ({
    g: bar(svg, d, M.t + i * rowH, FILL[d.group]), step: stepOf(d),
  }));

  const sepY = M.t + rows.length * rowH + 16;
  const sep = svg.append("g").attr("opacity", 0);
  sep.append("line")
    .attr("x1", 8).attr("x2", W - M.r).attr("y1", sepY).attr("y2", sepY)
    .attr("stroke", C.rule).attr("stroke-dasharray", "4 4");
  sep.append("text")
    .attr("x", 8).attr("y", sepY + 22).attr("font-size", ".7rem")
    .attr("font-weight", 600).attr("fill", C.story)
    .text("…and the things the arguments are about, for scale");
  const annoGs = annos.map((d, i) =>
    bar(svg, d, sepY + 34 + i * rowH, C.story));

  function render(step) {
    for (const s of sectorGs)
      s.g.transition().duration(600).attr("opacity", step >= s.step ? 1 : 0);
    const on = step >= 3;
    sep.transition().duration(600).attr("opacity", on ? 1 : 0);
    for (const g of annoGs)
      g.transition().duration(600).attr("opacity", on ? 1 : 0);
  }

  render(0);
  return { onStep: render };
}
