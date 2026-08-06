/* Myth 4: asylum applications — absolute vs per-capita, animated reorder. */
import { C, svgIn, fmt, tooltip } from "../lib.js";

export function perCapitaChart(el, percap) {
  const data = percap.data.slice();
  const W = 860, H = 30 * data.length + 120, M = { t: 84, r: 60, b: 20, l: 150 };

  const wrap = d3.select(el);
  const toggle = wrap.append("div").attr("class", "chart-toggle");
  const svg = svgIn(el, W, H);
  const tip = tooltip();

  svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26)
    .text("Asylum applications, 2025 — who takes the most?");
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46)
    .attr("fill", C.inkSoft)
    .text("Eurostat (EU-27) + Home Office (UK, individuals). UK highlighted.");

  const xAxis = svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${M.t - 8})`);

  const rows = svg.append("g").selectAll("g").data(data, d => d.geo).join("g");
  rows.append("rect")
    .attr("x", M.l).attr("height", 20).attr("rx", 2)
    .attr("fill", d => d.geo === "UK" ? C.gold : C.reality)
    .on("mousemove", (ev, d) => tip.show(
      [d.country,
       `${fmt.n(d.applications)} applications`,
       `${fmt.n(d.per_million)} per million people`], ev))
    .on("mouseleave", () => tip.hide());
  rows.append("text").attr("class", "rowlabel")
    .attr("x", M.l - 10).attr("text-anchor", "end")
    .attr("font-size", ".72rem")
    .attr("font-weight", d => d.geo === "UK" ? 700 : 400)
    .text(d => d.country);
  rows.append("text").attr("class", "rowval")
    .attr("font-size", ".68rem").attr("fill", C.inkSoft);

  let mode = "applications";
  function render() {
    const key = mode;
    const sorted = data.slice().sort((a, b) => b[key] - a[key]);
    const y = d3.scaleBand().domain(sorted.map(d => d.geo))
      .range([M.t, H - M.b]).padding(0.3);
    const x = d3.scaleLinear().domain([0, d3.max(data, d => d[key])])
      .range([M.l, W - M.r]);
    xAxis.transition().duration(900)
      .call(d3.axisTop(x).ticks(6).tickFormat(fmt.k));
    rows.transition().duration(900)
      .attr("transform", d => `translate(0,${y(d.geo)})`);
    rows.select("rect").transition().duration(900)
      .attr("width", d => x(d[key]) - M.l)
      .attr("height", y.bandwidth());
    rows.select(".rowlabel").transition().duration(900)
      .attr("y", d => y.bandwidth() / 2 + 4);
    rows.select(".rowval").transition().duration(900)
      .attr("x", d => x(d[key]) + 6)
      .attr("y", d => y.bandwidth() / 2 + 4)
      .textTween(function (d) {
        const v = d[key];
        return () => key === "per_million" ? fmt.n(v) + "/M" : fmt.k(v);
      });
    toggle.selectAll("button").classed("on", function () {
      return this.dataset.mode === mode;
    });
  }

  for (const [m, label] of [["applications", "Absolute"], ["per_million", "Per million people"]]) {
    toggle.append("button").attr("data-mode", m).text(label)
      .on("click", () => { mode = m; render(); });
  }
  render();
  return {};
}
