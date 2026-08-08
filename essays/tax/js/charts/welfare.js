/* Myth: "benefits means the unemployed" — what benefit spending actually
   contains, as horizontal bars, with the unemployment slice singled out. */
import { C, svgIn, tooltip, fmt } from "../lib.js";

export function welfareChart(el, welfare) {
  const rows = [...welfare.categories].sort((a, b) => b.bn - a.bn);
  const W = 720, H = 460, M = { t: 70, r: 70, b: 40, l: 220 };
  const svg = svgIn(el, W, H);
  const tip = tooltip();

  const x = d3.scaleLinear().domain([0, d3.max(rows, d => d.bn) * 1.05])
    .range([M.l, W - M.r]);
  const y = d3.scaleBand().domain(rows.map(d => d.label))
    .range([M.t, H - M.b]).padding(0.3);

  svg.append("text").attr("class", "chart-title").attr("x", 24).attr("y", 28)
    .text(`The benefits bill, item by item, ${welfare.year}`);
  svg.append("text").attr("class", "anno").attr("x", 24).attr("y", 48)
    .attr("fill", C.inkSoft).text(`£bn a year · GB total £${Math.round(welfare.total_bn)}bn`);

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${H - M.b})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d => "£" + d + "bn"));

  const g = svg.selectAll(".row").data(rows).join("g")
    .on("mousemove", (ev, d) => tip.show(
      [d.label, `£${d.bn}bn · ${d.share}% of the bill`], ev))
    .on("mouseleave", () => tip.hide());

  g.append("text")
    .attr("x", M.l - 12).attr("y", d => y(d.label) + y.bandwidth() / 2)
    .attr("text-anchor", "end").attr("dominant-baseline", "middle")
    .attr("font-size", ".74rem")
    .text(d => d.label);

  const bars = g.append("rect")
    .attr("x", x(0)).attr("y", d => y(d.label))
    .attr("width", 0).attr("height", y.bandwidth())
    .attr("fill", C.reality).attr("opacity", 0.85);

  const labels = g.append("text").attr("class", "anno")
    .attr("x", d => x(d.bn) + 8).attr("y", d => y(d.label) + y.bandwidth() / 2)
    .attr("dominant-baseline", "middle").attr("font-size", ".72rem")
    .attr("fill", C.inkSoft).attr("opacity", 0)
    .text(d => `£${d.bn}bn`);

  let drawn = false;
  function grow() {
    if (drawn) return; drawn = true;
    // named transition: focus() also transitions these rects, and a second
    // default-named transition would cancel this one before it runs
    bars.transition("grow").duration(900).delay((d, i) => i * 60)
      .attr("width", d => x(d.bn) - x(0));
    labels.transition().delay(900).duration(300).attr("opacity", 1);
  }

  function focus(key) {
    bars.transition().duration(500)
      .attr("fill", d => key && d.key === key ? C.perception : C.reality)
      .attr("opacity", d => key && d.key !== key ? 0.35 : 0.9);
  }

  return {
    onStep(i) {
      grow();
      if (i === 0) focus(null);
      else if (i === 1) focus("state_pension");
      else if (i >= 2) focus("unemployment");
    },
  };
}
