/* Poverty by region, after housing costs. The reveal is London on top once
   rent is taken out, not the North. */
import { C, svgIn, tooltip } from "../lib.js";

export function regionChart(el, region) {
  const nations = ["England", "Scotland", "Wales", "Northern Ireland", "United Kingdom"];
  const data = region.data.slice().sort((a, b) => b.rate - a.rate);
  const W = 720, H = 26 * data.length + 90, M = { t: 64, r: 44, b: 20, l: 176 };
  const svg = svgIn(el, W, H);
  const tip = tooltip();

  svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26)
    .text("Relative poverty by region (after housing costs)");
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46).attr("fill", C.inkSoft)
    .text("JRF, 2021-24 average · London highlighted");

  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.rate) * 1.12]).range([M.l, W - M.r]);
  const y = d3.scaleBand().domain(data.map(d => d.region)).range([M.t, H - M.b]).padding(0.24);

  const isNation = r => nations.includes(r);
  const rows = svg.append("g").selectAll("g").data(data).join("g")
    .attr("transform", d => `translate(0,${y(d.region)})`);
  rows.append("rect")
    .attr("x", M.l).attr("width", d => x(d.rate) - M.l).attr("height", y.bandwidth()).attr("rx", 2)
    .attr("fill", d => d.region === "London" ? C.poverty : isNation(d.region) ? C.perception : C.reality)
    .attr("opacity", d => isNation(d.region) && d.region !== "London" ? 0.55 : 1)
    .on("mousemove", (ev, d) => tip.show([d.region, `${d.rate}% in relative poverty (AHC)`], ev))
    .on("mouseleave", () => tip.hide());
  rows.append("text").attr("x", M.l - 10).attr("text-anchor", "end")
    .attr("y", y.bandwidth() / 2 + 4).attr("font-size", ".72rem")
    .attr("font-weight", d => d.region === "London" ? 700 : isNation(d.region) ? 600 : 400)
    .attr("fill", d => isNation(d.region) ? C.inkSoft : C.ink)
    .text(d => d.region);
  rows.append("text").attr("x", d => x(d.rate) + 6).attr("y", y.bandwidth() / 2 + 4)
    .attr("font-size", ".68rem").attr("fill", C.inkSoft).text(d => d.rate + "%");
  return {};
}
