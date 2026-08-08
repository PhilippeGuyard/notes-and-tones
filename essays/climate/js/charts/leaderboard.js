/* The four counts: one bar chart that re-sorts, re-scales and re-labels itself
   as the scroll moves through annual / per-head / cumulative / consumption. */
import { C, svgIn, fmt } from "../lib.js";

const MEASURES = [
  { key: "annual", title: "This year's tonnes, by country",
    f: v => fmt.k(v) },
  { key: "per_capita", title: "Tonnes per person",
    f: v => fmt.t1(v) + " t" },
  { key: "cumulative", title: "Every tonne since 1750",
    f: v => (v / 1000).toFixed(0) + " Gt" },
  { key: "consumption", title: "Tonnes per person, counting imports",
    f: v => fmt.t1(v) + " t" },
];

export function leaderboardChart(el, lb) {
  const W = 720, H = 560, M = { l: 168, r: 84, t: 78 };
  const rowH = 42;
  const svg = svgIn(el, W, H);

  const title = svg.append("text").attr("class", "chart-title")
    .attr("x", 8).attr("y", 26);
  const sub = svg.append("text").attr("class", "anno")
    .attr("x", 8).attr("y", 46).attr("fill", C.inkSoft);
  const gap = svg.append("text")
    .attr("x", M.l - 12).attr("text-anchor", "end")
    .attr("font-size", ".9rem").attr("fill", C.inkSoft)
    .attr("opacity", 0).text("⋮");

  const x = d3.scaleLinear().range([M.l, W - M.r]);
  const g = svg.append("g");

  function render(step) {
    const m = MEASURES[Math.max(0, Math.min(step, 3))];
    const d = lb.data[m.key];
    const list = [...d.top].sort((a, b) => a.rank - b.rank);
    const ukOutside = list.some(r => r.country === "United Kingdom" && r.rank > 10);
    x.domain([0, list[0].value]);

    title.text(m.title);
    sub.text(`${d.unit} · ${d.year} · Global Carbon Budget`);
    gap.transition().duration(600)
      .attr("y", M.t + 10 * rowH - rowH / 2 + 6)
      .attr("opacity", ukOutside ? 1 : 0);

    const rows = g.selectAll("g.row").data(list, r => r.country);

    const enter = rows.enter().append("g").attr("class", "row")
      .attr("opacity", 0)
      .attr("transform", (r, i) => `translate(0,${M.t + i * rowH})`);
    enter.append("text").attr("class", "name")
      .attr("x", M.l - 12).attr("y", rowH / 2 + 4)
      .attr("text-anchor", "end").attr("font-size", ".72rem");
    enter.append("rect").attr("class", "bar")
      .attr("x", M.l).attr("y", 8)
      .attr("height", rowH - 16).attr("rx", 2)
      .attr("width", 0);
    enter.append("text").attr("class", "val")
      .attr("y", rowH / 2 + 4)
      .attr("font-size", ".68rem").attr("fill", C.inkSoft)
      .attr("x", M.l + 6);

    rows.exit().transition().duration(500).attr("opacity", 0).remove();

    const all = enter.merge(rows);
    const uk = r => r.country === "United Kingdom";
    all.transition().duration(900)
      .attr("opacity", 1)
      .attr("transform", (r, i) => `translate(0,${M.t + i * rowH})`);
    all.select(".name")
      .attr("font-weight", r => uk(r) ? 700 : 400)
      .text(r => uk(r) ? `United Kingdom · #${r.rank}` : r.country);
    all.select(".bar").transition().duration(900)
      .attr("fill", r => uk(r) ? C.gold : C.data)
      .attr("width", r => Math.max(x(r.value) - M.l, 2.5));
    all.select(".val").transition().duration(900)
      .attr("x", r => x(r.value) + 6)
      .text(r => m.f(r.value));
  }

  render(0);
  return { onStep: render };
}
