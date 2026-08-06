/* The gap: 15 years of issue salience, annotated with the imagery that drove it. */
import { C, svgIn, tooltip } from "../lib.js";

export function salienceChart(el, salience, events) {
  const W = 720, H = 520, M = { t: 60, r: 26, b: 40, l: 52 };
  const svg = svgIn(el, W, H);
  const tip = tooltip();
  const parse = d3.timeParse("%Y-%m-%d");

  const s = salience.data.filter(d => d.immigration != null)
    .map(d => ({ date: parse(d.date), imm: d.immigration, eco: d.economy }));

  const x = d3.scaleTime().domain(d3.extent(s, d => d.date)).range([M.l, W - M.r]);
  const y = d3.scaleLinear().domain([0, 80]).range([H - M.b, M.t]);

  svg.append("text").attr("class", "chart-title").attr("x", 24).attr("y", 26)
    .text("“One of the most important issues facing the country”");
  svg.append("text").attr("class", "anno").attr("x", 24).attr("y", 44)
    .attr("fill", C.inkSoft).text("YouGov weekly tracker, % naming each issue");

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(8));
  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(${M.l},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "%"));

  const line = k => d3.line().x(d => x(d.date)).y(d => y(d[k]))
    .defined(d => d[k] != null).curve(d3.curveMonotoneX);

  // era shading sits under the lines
  const eraLayer = svg.append("g");

  svg.append("path").datum(s).attr("fill", "none")
    .attr("stroke", C.rule).attr("stroke-width", 1.6).attr("d", line("eco"));
  svg.append("text").attr("class", "anno").attr("fill", C.inkSoft)
    .attr("x", x(parse("2023-01-01"))).attr("y", y(62)).text("economy");

  svg.append("path").datum(s).attr("fill", "none")
    .attr("stroke", C.perception).attr("stroke-width", 2.6).attr("d", line("imm"));
  svg.append("text").attr("class", "anno").attr("fill", C.perception)
    .attr("font-weight", 600)
    .attr("x", x(parse("2012-01-01"))).attr("y", y(64)).text("immigration");

  // era shading, revealed per step
  const eras = [
    { from: "2015-04-01", to: "2016-09-01" },
    { from: "2018-11-01", to: "2025-01-01" },
    { from: "2026-07-15", to: "2026-08-06" },
  ].map(e => eraLayer.append("rect")
    .attr("x", x(parse(e.from))).attr("y", M.t)
    .attr("width", Math.max(4, x(parse(e.to)) - x(parse(e.from))))
    .attr("height", H - M.t - M.b)
    .attr("fill", C.gold).attr("opacity", 0));

  // event markers
  const evG = svg.append("g");
  const bisect = d3.bisector(d => d.date).center;
  events.data.forEach(evt => {
    const date = parse(evt.date);
    if (date < x.domain()[0] || date > x.domain()[1]) return;
    const near = s[bisect(s, date)];
    const cy = near?.imm != null ? y(near.imm) : y(30);
    evG.append("circle")
      .attr("cx", x(date)).attr("cy", cy).attr("r", 5.5)
      .attr("fill", C.paper).attr("stroke", C.ink).attr("stroke-width", 1.6)
      .style("cursor", "pointer")
      .on("mousemove", ev => tip.show([evt.label, evt.detail], ev))
      .on("mouseleave", () => tip.hide());
  });

  return {
    onStep(i) {
      eras.forEach((r, j) =>
        r.transition().duration(500).attr("opacity", i === j + 1 ? 0.14 : 0));
    },
  };
}
