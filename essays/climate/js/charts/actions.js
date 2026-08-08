/* Perceived ranking of personal actions vs measured tonnes saved. */
import { C, svgIn, fmt } from "../lib.js";

export function actionsChart(el, act) {
  const W = 720, H = 560, M = { l: 250, r: 76, t: 84 };
  const rowH = 48;
  const svg = svgIn(el, W, H);
  const A = act.data.actions;
  const child = act.data.child_note;

  const title = svg.append("text").attr("class", "chart-title")
    .attr("x", 8).attr("y", 26);
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46)
    .attr("fill", C.inkSoft)
    .text("t CO₂e saved per person-year · Wynes & Nicholas (2017); public ranking: Ipsos");

  const x = d3.scaleLinear().domain([0, 2.6]).range([M.l, W - M.r]);

  const rowsG = svg.append("g").selectAll("g").data(A, d => d.key).join("g")
    .attr("transform", d => `translate(0,${M.t + (d.perceived_rank - 1) * rowH})`);
  rowsG.append("text").attr("class", "rankbadge")
    .attr("x", 16).attr("y", rowH / 2 + 5)
    .attr("font-size", ".85rem").attr("font-weight", 700).attr("fill", C.story)
    .text(d => "#" + d.perceived_rank);
  rowsG.append("text").attr("class", "name")
    .attr("x", M.l - 10).attr("y", rowH / 2 + 4)
    .attr("text-anchor", "end").attr("font-size", ".72rem")
    .text(d => d.label);
  rowsG.append("rect").attr("class", "bar")
    .attr("x", M.l).attr("y", 11).attr("height", rowH - 22).attr("rx", 2)
    .attr("fill", C.data).attr("width", 0);
  rowsG.append("text").attr("class", "val")
    .attr("x", M.l + 6).attr("y", rowH / 2 + 4)
    .attr("font-size", ".68rem").attr("fill", C.inkSoft).attr("opacity", 0)
    .text(d => fmt.t1(d.impact_t) + " t");

  const childNote = svg.append("text")
    .attr("x", 8).attr("y", M.t + A.length * rowH + 34)
    .attr("font-size", ".72rem").attr("fill", C.story).attr("opacity", 0);
  childNote.append("tspan").attr("font-weight", 700)
    .text(`${child.label}: ${child.impact_t} t →`);
  childNote.append("tspan")
    .text(" off this chart by a factor of twenty (and disputed; see notes)");

  const byImpact = [...A].sort((a, b) => b.impact_t - a.impact_t);
  const impactRank = new Map(byImpact.map((d, i) => [d.key, i]));

  function render(step) {
    title.text(step < 2 ? "Ranked by perceived effectiveness"
                        : "Re-sorted by measured effect");
    rowsG.transition().duration(900)
      .attr("transform", d => {
        const i = step < 2 ? d.perceived_rank - 1 : impactRank.get(d.key);
        return `translate(0,${M.t + i * rowH})`;
      });
    rowsG.select(".bar").transition().duration(900)
      .attr("width", d => step >= 1 ? Math.max(x(d.impact_t) - M.l, 2.5) : 0);
    rowsG.select(".val").transition().duration(900)
      .attr("x", d => step >= 1 ? x(d.impact_t) + 6 : M.l + 6)
      .attr("opacity", step >= 1 ? 1 : 0);
    childNote.transition().duration(600).attr("opacity", step >= 3 ? 1 : 0);
  }

  render(0);
  return { onStep: render };
}
