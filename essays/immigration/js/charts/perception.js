/* Myth 1: dumbbell of perceived vs actual immigrant share, by place. */
import { C, svgIn, tooltip } from "../lib.js";

export function perceptionChart(el, perceptions) {
  const rows = perceptions.immigrant_share;
  const W = 720, H = 460, M = { t: 70, r: 40, b: 46, l: 210 };
  const svg = svgIn(el, W, H);
  const tip = tooltip();

  const x = d3.scaleLinear().domain([0, 40]).range([M.l, W - M.r]);
  const y = d3.scaleBand().domain(rows.map(d => d.place))
    .range([M.t, H - M.b]).padding(0.45);

  svg.append("text").attr("class", "chart-title").attr("x", 24).attr("y", 28)
    .text("Guessed vs measured immigrant share of population");
  svg.append("text").attr("class", "anno").attr("x", 24).attr("y", 48)
    .attr("fill", C.inkSoft).text("% of population · Ipsos / Eurobarometer, survey year in brackets");

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${H - M.b})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d => d + "%"));

  const g = svg.selectAll(".row").data(rows).join("g")
    .attr("class", "row")
    .on("mousemove", (ev, d) => tip.show(
      [d.place, `guessed ${d.perceived}% — actual ${d.actual}%`, `${d.source}, ${d.year}`], ev))
    .on("mouseleave", () => tip.hide());

  g.append("text")
    .attr("x", M.l - 14).attr("y", d => y(d.place) + y.bandwidth() / 2)
    .attr("text-anchor", "end").attr("dominant-baseline", "middle")
    .attr("font-size", ".76rem")
    .text(d => `${d.place} (${d.year})`);

  const conn = g.append("line")
    .attr("x1", d => x(d.actual)).attr("x2", d => x(d.actual))
    .attr("y1", d => y(d.place) + y.bandwidth() / 2)
    .attr("y2", d => y(d.place) + y.bandwidth() / 2)
    .attr("stroke", C.rule).attr("stroke-width", 6).attr("stroke-linecap", "round");

  const dotA = g.append("circle")
    .attr("cx", d => x(d.actual)).attr("cy", d => y(d.place) + y.bandwidth() / 2)
    .attr("r", 9).attr("fill", C.reality).attr("stroke", C.paper).attr("stroke-width", 2);

  const dotP = g.append("circle")
    .attr("cx", d => x(d.actual)).attr("cy", d => y(d.place) + y.bandwidth() / 2)
    .attr("r", 9).attr("fill", C.perception).attr("stroke", C.paper).attr("stroke-width", 2)
    .attr("opacity", 0);

  const gapLabel = g.append("text").attr("class", "anno")
    .attr("x", d => x((d.perceived + d.actual) / 2))
    .attr("y", d => y(d.place) + y.bandwidth() / 2 - 14)
    .attr("text-anchor", "middle").attr("fill", C.perception).attr("font-weight", 600)
    .attr("opacity", 0)
    .text(d => `+${d.perceived - d.actual}pts`);

  let shown = -1;
  function reveal(upTo) {
    rows.forEach((d, i) => {
      const on = i <= upTo;
      const sel = idx => g.filter((_, j) => j === idx);
      const row = sel(i);
      row.select("line").transition().duration(900)
        .attr("x2", on ? x(d.perceived) : x(d.actual));
      row.selectAll("circle").filter((_, k) => k === 1).transition().duration(900)
        .attr("cx", on ? x(d.perceived) : x(d.actual)).attr("opacity", on ? 1 : 0);
      row.selectAll("text.anno").transition().delay(on ? 700 : 0).duration(300)
        .attr("opacity", on ? 1 : 0);
    });
    shown = upTo;
  }

  return {
    onStep(i) {
      if (i === 0) reveal(0);          // UK only
      else if (i >= 1) reveal(rows.length - 1);
    },
  };
}
