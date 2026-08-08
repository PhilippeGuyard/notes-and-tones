/* The world's emissions as a 10x10 waffle, coloured by income group. */
import { C, svgIn } from "../lib.js";

export function inequalityChart(el, ineq) {
  const W = 720, H = 560;
  const cell = 40, pad = 5, gx = 60, gy = 88;
  const svg = svgIn(el, W, H);
  const G = ineq.data.groups;

  svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26)
    .text("100 blocks of CO2e, by income group");
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46)
    .attr("fill", C.inkSoft)
    .text("Individual footprints incl. consumption & investments, 2019 · Chancel / World Inequality Lab");

  /* cells 0..99 filled top-left to bottom-right: richest first */
  const groupOf = i =>
    i < 17 ? "top1" : i < 48 ? "next9" : i < 88 ? "mid40" : "bottom50";
  const FILL = { top1: C.story, next9: C.storySoft, mid40: "#cec2a8", bottom50: C.data };

  const cells = svg.append("g").selectAll("rect").data(d3.range(100)).join("rect")
    .attr("x", i => gx + (i % 10) * (cell + pad))
    .attr("y", i => gy + Math.floor(i / 10) * (cell + pad))
    .attr("width", cell).attr("height", cell).attr("rx", 3)
    .attr("fill", "#e9dfc9").attr("stroke", C.rule);

  const legend = svg.append("g");
  const legendRows = G.map((g, i) => {
    const t = legend.append("text")
      .attr("x", gx + 10 * (cell + pad) + 14)
      .attr("y", gy + 24 + i * 64)
      .attr("font-size", ".72rem").attr("opacity", 0);
    t.append("tspan").attr("font-weight", 700).attr("fill", FILL[g.key] === "#cec2a8" ? C.inkSoft : FILL[g.key])
      .text(`${g.label} of people`);
    t.append("tspan").attr("x", gx + 10 * (cell + pad) + 14).attr("dy", 16)
      .text(`${g.emission_share} blocks · ~${g.avg_t} t each`);
    return t;
  });

  /* which groups are lit at each step */
  const LIT = [
    [],
    ["top1"],
    ["top1", "next9"],
    ["top1", "next9", "bottom50"],
    ["top1", "next9", "mid40", "bottom50"],
  ];

  function render(step) {
    const lit = new Set(LIT[Math.max(0, Math.min(step, LIT.length - 1))]);
    cells.transition().duration(700)
      .attr("fill", i => lit.has(groupOf(i)) ? FILL[groupOf(i)] : "#e9dfc9");
    legendRows.forEach((t, gi) =>
      t.transition().duration(500).attr("opacity", lit.has(G[gi].key) ? 1 : 0));
  }

  render(0);
  return { onStep: render };
}
