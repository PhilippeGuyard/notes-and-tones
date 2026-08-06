/* Poverty by age, before vs after housing costs. The reveal is the flip:
   housing costs push children up and pensioners down. */
import { C, svgIn, tooltip, cumBelow } from "../lib.js";

export function ageChart(el, dist, stats) {
  const groups = ["Children", "Working-age", "Pensioners", "All"];
  const W = 720, H = 420, M = { t: 60, r: 20, b: 60, l: 44 };
  const svg = svgIn(el, W, H);
  const tip = tooltip();

  // poverty rate = share below that basis's poverty line
  const rate = (g, h) => cumBelow(dist.data[g][h], stats.data[h].poverty);
  const data = groups.map(g => ({ group: g, BHC: rate(g, "BHC"), AHC: rate(g, "AHC") }));

  svg.append("text").attr("class", "chart-title").attr("x", M.l).attr("y", 26)
    .text("Poverty rate by age");
  svg.append("text").attr("class", "anno").attr("x", M.l).attr("y", 46).attr("fill", C.inkSoft)
    .text("% below the relative poverty line · before vs after housing costs");

  const x0 = d3.scaleBand().domain(groups).range([M.l, W - M.r]).padding(0.28);
  const x1 = d3.scaleBand().domain(["BHC", "AHC"]).range([0, x0.bandwidth()]).padding(0.15);
  const y = d3.scaleLinear().domain([0, 36]).range([H - M.b, M.t]);

  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - M.b})`)
    .call(d3.axisBottom(x0).tickSizeOuter(0));
  svg.append("g").attr("class", "axis").attr("transform", `translate(${M.l},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "%"));

  const colOf = h => h === "AHC" ? C.reality : C.perceptionSoft;

  const g = svg.append("g").selectAll("g").data(data).join("g")
    .attr("transform", d => `translate(${x0(d.group)},0)`);
  for (const h of ["BHC", "AHC"]) {
    g.append("rect")
      .attr("x", x1(h)).attr("width", x1.bandwidth())
      .attr("y", d => y(d[h])).attr("height", d => (H - M.b) - y(d[h]))
      .attr("fill", colOf(h)).attr("rx", 2)
      .on("mousemove", (ev, d) => tip.show(
        [`${d.group}, ${h === "AHC" ? "after" : "before"} housing`,
         `${Math.round(d[h])}% in relative poverty`], ev))
      .on("mouseleave", () => tip.hide());
    g.append("text").attr("x", x1(h) + x1.bandwidth() / 2)
      .attr("y", d => y(d[h]) - 5).attr("text-anchor", "middle")
      .attr("font-size", ".68rem").attr("font-weight", 700).attr("fill", C.inkSoft)
      .text(d => Math.round(d[h]) + "%");
  }

  // legend
  const leg = svg.append("g").attr("transform", `translate(${M.l},${H - 18})`);
  [["before housing", C.perceptionSoft], ["after housing", C.reality]].forEach(([lab, col], i) => {
    const gg = leg.append("g").attr("transform", `translate(${i * 160},0)`);
    gg.append("rect").attr("width", 13).attr("height", 13).attr("rx", 2).attr("fill", col);
    gg.append("text").attr("x", 19).attr("y", 11).attr("font-size", ".72rem").attr("fill", C.ink).text(lab);
  });
  return {};
}
