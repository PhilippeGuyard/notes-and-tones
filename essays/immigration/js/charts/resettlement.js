/* The collapse of the safe route: global resettlement departures, 1990–2025. */
import { C, svgIn, fmt, tooltip } from "../lib.js";

export function resettlementChart(el, resettlement) {
  const s = resettlement.data.filter(d => d.value != null);
  const W = 760, H = 340, M = { t: 56, r: 26, b: 40, l: 60 };
  const svg = svgIn(el, W, H);
  const tip = tooltip();

  svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 24)
    .text("The safe route, closing");
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 42)
    .text("Refugees resettled worldwide per year (UNHCR)");

  const x = d3.scaleLinear().domain(d3.extent(s, d => d.year)).range([M.l, W - M.r]);
  const y = d3.scaleLinear().domain([0, d3.max(s, d => d.value)]).nice()
    .range([H - M.b, M.t]);

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${H - M.b})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format("d")));
  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(${M.l},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(fmt.k));

  svg.append("path").datum(s)
    .attr("fill", "none").attr("stroke", "#d9a441").attr("stroke-width", 2.5)
    .attr("d", d3.line().x(d => x(d.year)).y(d => y(d.value)).curve(d3.curveMonotoneX));

  svg.selectAll(".pt").data(s).join("circle")
    .attr("cx", d => x(d.year)).attr("cy", d => y(d.value)).attr("r", 3.4)
    .attr("fill", "#d9a441")
    .on("mousemove", (ev, d) => tip.show([`${d.year}`, `${fmt.n(d.value)} resettled`], ev))
    .on("mouseleave", () => tip.hide());

  const last = s[s.length - 1];
  svg.append("text").attr("class", "anno")
    .attr("x", x(last.year) - 8).attr("y", y(last.value) - 14)
    .attr("text-anchor", "end").attr("font-weight", 600).attr("fill", "#d9a441")
    .text(`${last.year}: ${fmt.k(last.value)} (−57%) · US ceiling now 7,500`);
}
