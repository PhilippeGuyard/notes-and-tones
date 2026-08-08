/* Debt interest over time, with the education and defence budgets drawn in
   for scale. Solo chart, animated when first visible. */
import { C, svgIn, fmt, tooltip, onVisible } from "../lib.js";

export function debtChart(el, debt) {
  const s = debt.data;
  const W = 720, H = 480, M = { t: 64, r: 30, b: 40, l: 56 };
  const svg = svgIn(el, W, H);
  const tip = tooltip();

  const x = d3.scaleLinear().domain(d3.extent(s, d => d.year)).range([M.l, W - M.r]);
  const yMax = Math.max(d3.max(s, d => d.bn), debt.comparisons.education_bn) * 1.12;
  const y = d3.scaleLinear().domain([0, yMax]).nice().range([H - M.b, M.t]);

  svg.append("text").attr("class", "chart-title").attr("x", 24).attr("y", 28)
    .text("What servicing the national debt costs, per year");
  svg.append("text").attr("class", "anno").attr("x", 24).attr("y", 46)
    .attr("fill", C.inkSoft).text(`£bn · ${debt.source_short ?? "OBR public finances databank"}`);

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${H - M.b})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format("d")));
  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(${M.l},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(d => "£" + d + "bn"));

  // comparison rules: what whole departments cost, latest year
  for (const [key, label] of [["education_bn", "the entire education budget"],
                              ["defence_bn", "the entire defence budget"]]) {
    const v = debt.comparisons[key];
    svg.append("line").attr("x1", M.l).attr("x2", W - M.r)
      .attr("y1", y(v)).attr("y2", y(v))
      .attr("stroke", C.inkSoft).attr("stroke-width", 1).attr("stroke-dasharray", "4 4");
    svg.append("text").attr("class", "anno").attr("x", W - M.r).attr("y", y(v) - 6)
      .attr("text-anchor", "end").attr("fill", C.inkSoft)
      .text(`${label} · £${Math.round(v)}bn`);
  }

  const area = d3.area().x(d => x(d.year)).y0(y(0)).y1(d => y(d.bn))
    .curve(d3.curveMonotoneX);
  const line = d3.line().x(d => x(d.year)).y(d => y(d.bn))
    .curve(d3.curveMonotoneX);

  const clip = svg.append("clipPath").attr("id", "debt-clip").append("rect")
    .attr("x", M.l).attr("y", 0).attr("width", 0).attr("height", H);

  const g = svg.append("g").attr("clip-path", "url(#debt-clip)");
  g.append("path").datum(s).attr("fill", C.red).attr("opacity", .16).attr("d", area);
  g.append("path").datum(s).attr("fill", "none")
    .attr("stroke", C.red).attr("stroke-width", 3).attr("d", line);

  const last = s[s.length - 1];
  const endLabel = svg.append("g").attr("opacity", 0);
  endLabel.append("circle").attr("cx", x(last.year)).attr("cy", y(last.bn))
    .attr("r", 5).attr("fill", C.red).attr("stroke", C.paper).attr("stroke-width", 2);
  endLabel.append("text").attr("class", "anno")
    .attr("x", x(last.year) - 8).attr("y", y(last.bn) - 12)
    .attr("text-anchor", "end").attr("font-weight", 600).attr("fill", C.red)
    .text(`£${Math.round(last.bn)}bn, ${last.label}`);

  svg.append("rect").attr("x", M.l).attr("y", M.t)
    .attr("width", W - M.l - M.r).attr("height", H - M.t - M.b)
    .attr("fill", "transparent")
    .on("mousemove", ev => {
      const [mx] = d3.pointer(ev, svg.node());
      const d0 = s[d3.bisector(d => d.year).center(s, x.invert(mx))];
      tip.show([d0.label, `debt interest £${Math.round(d0.bn)}bn`,
        d0.share != null ? `${d0.share}% of all spending` : ""], ev);
    })
    .on("mouseleave", () => tip.hide());

  onVisible(el, () => {
    clip.transition().duration(1600).attr("width", W - M.l - M.r);
    endLabel.transition().delay(1400).duration(400).attr("opacity", 1);
  });
}
