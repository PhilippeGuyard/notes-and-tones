/* Dumbbell of guessed vs actual share of spending, by category. */
import { C, svgIn, tooltip } from "../lib.js";

export function perceptionChart(el, perceptions) {
  const rows = perceptions.guesses;
  const W = 720, H = 460, M = { t: 70, r: 40, b: 46, l: 230 };
  const svg = svgIn(el, W, H);
  const tip = tooltip();

  const xMax = Math.min(100, Math.ceil(d3.max(rows, d => Math.max(d.perceived, d.actual)) / 10) * 10 + 5);
  const x = d3.scaleLinear().domain([0, xMax]).range([M.l, W - M.r]);
  const y = d3.scaleBand().domain(rows.map(d => d.label))
    .range([M.t, H - M.b]).padding(0.45);

  svg.append("text").attr("class", "chart-title").attr("x", 24).attr("y", 28)
    .text("Guessed vs actual, category by category");
  svg.append("text").attr("class", "anno").attr("x", 24).attr("y", 48)
    .attr("fill", C.inkSoft)
    .text("% · each row against its own base — survey house, base and year in the tooltip");

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${H - M.b})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d => d + "%"));

  const g = svg.selectAll(".row").data(rows).join("g")
    .attr("class", "row")
    .on("mousemove", (ev, d) => tip.show(
      [d.label, `guessed ${d.perceived}%, actual ${d.actual}%`, `${d.source}, ${d.year}`], ev))
    .on("mouseleave", () => tip.hide());

  g.append("text")
    .attr("x", M.l - 14).attr("y", d => y(d.label) + y.bandwidth() / 2)
    .attr("text-anchor", "end").attr("dominant-baseline", "middle")
    .attr("font-size", ".76rem")
    .text(d => d.label);

  g.append("line")
    .attr("x1", d => x(d.actual)).attr("x2", d => x(d.actual))
    .attr("y1", d => y(d.label) + y.bandwidth() / 2)
    .attr("y2", d => y(d.label) + y.bandwidth() / 2)
    .attr("stroke", C.rule).attr("stroke-width", 6).attr("stroke-linecap", "round");

  g.append("circle")
    .attr("cx", d => x(d.actual)).attr("cy", d => y(d.label) + y.bandwidth() / 2)
    .attr("r", 9).attr("fill", C.reality).attr("stroke", C.paper).attr("stroke-width", 2);

  g.append("circle").attr("class", "dot-p")
    .attr("cx", d => x(d.actual)).attr("cy", d => y(d.label) + y.bandwidth() / 2)
    .attr("r", 9).attr("fill", C.perception).attr("stroke", C.paper).attr("stroke-width", 2)
    .attr("opacity", 0);

  g.append("text").attr("class", "anno")
    .attr("x", d => x((d.perceived + d.actual) / 2))
    .attr("y", d => y(d.label) + y.bandwidth() / 2 - 14)
    .attr("text-anchor", "middle").attr("fill", C.perception).attr("font-weight", 600)
    .attr("opacity", 0)
    .text(d => (d.perceived > d.actual ? "+" : "−") + Math.round(Math.abs(d.perceived - d.actual)) + "pts");

  function reveal(upTo) {
    rows.forEach((d, i) => {
      const on = i <= upTo;
      const row = g.filter((_, j) => j === i);
      row.select("line").transition().duration(900)
        .attr("x2", on ? x(d.perceived) : x(d.actual));
      row.select(".dot-p").transition().duration(900)
        .attr("cx", on ? x(d.perceived) : x(d.actual)).attr("opacity", on ? 1 : 0);
      row.selectAll("text.anno").transition().delay(on ? 700 : 0).duration(300)
        .attr("opacity", on ? 1 : 0);
    });
  }

  return {
    onStep(i) {
      if (i === 0) reveal(0);            // aid only
      else if (i >= 1) reveal(rows.length - 1);
    },
  };
}
