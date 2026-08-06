/* Myth 3a: UK net migration series with annotated wave and fall. */
import { C, svgIn, fmt, tooltip } from "../lib.js";

export function ukSeriesChart(el, netmig) {
  const W = 720, H = 500, M = { t: 64, r: 30, b: 40, l: 64 };
  const svg = svgIn(el, W, H);
  const tip = tooltip();
  const parse = d3.timeParse("%Y-%m-%d");

  const s = netmig.data.filter(d => d.net_migration != null)
    .map(d => ({ ...d, date: parse(d.date) }));

  const x = d3.scaleTime().domain(d3.extent(s, d => d.date)).range([M.l, W - M.r]);
  const y = d3.scaleLinear().domain([0, 1_000_000]).nice().range([H - M.b, M.t]);

  svg.append("text").attr("class", "chart-title").attr("x", 24).attr("y", 28)
    .text("UK net migration, year-ending quarters");
  svg.append("text").attr("class", "anno").attr("x", 24).attr("y", 46)
    .attr("fill", C.inkSoft).text("ONS long-term international migration, May 2026 vintage");

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${H - M.b})`)
    .call(d3.axisBottom(x).ticks(7));
  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(${M.l},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(fmt.k));

  const area = d3.area().x(d => x(d.date)).y0(y(0)).y1(d => y(d.net_migration))
    .curve(d3.curveMonotoneX);
  const line = d3.line().x(d => x(d.date)).y(d => y(d.net_migration))
    .curve(d3.curveMonotoneX);

  const clip = svg.append("clipPath").attr("id", "uk-clip").append("rect")
    .attr("x", M.l).attr("y", 0).attr("width", 0).attr("height", H);

  const g = svg.append("g").attr("clip-path", "url(#uk-clip)");
  g.append("path").datum(s).attr("fill", C.realitySoft).attr("opacity", .45).attr("d", area);
  g.append("path").datum(s).attr("fill", "none")
    .attr("stroke", C.reality).attr("stroke-width", 3).attr("d", line);

  // invisible hover strip
  svg.append("rect").attr("x", M.l).attr("y", M.t)
    .attr("width", W - M.l - M.r).attr("height", H - M.t - M.b)
    .attr("fill", "transparent")
    .on("mousemove", ev => {
      const [mx] = d3.pointer(ev, svg.node());
      const d0 = s[d3.bisector(d => d.date).center(s, x.invert(mx))];
      tip.show([d0.period, `net migration ${fmt.n(d0.net_migration)}`], ev);
    })
    .on("mouseleave", () => tip.hide());

  const annos = [
    { p: "YE Mar 23", label: "peak 944k", dy: -14 },
    { p: "YE Dec 25 P", label: "171k, lowest of the era", dy: -16 },
  ].map(a => {
    const pt = s.find(d => d.period === a.p);
    if (!pt) return null;
    const gg = svg.append("g").attr("opacity", 0);
    gg.append("circle").attr("cx", x(pt.date)).attr("cy", y(pt.net_migration))
      .attr("r", 5).attr("fill", C.reality).attr("stroke", C.paper).attr("stroke-width", 2);
    gg.append("text").attr("class", "anno").attr("x", x(pt.date))
      .attr("y", y(pt.net_migration) + a.dy)
      .attr("text-anchor", a.p.includes("25") ? "end" : "middle")
      .attr("font-weight", 600).attr("fill", C.reality).text(a.label);
    return gg;
  });

  const tEnd = i => [parse("2020-03-01"), parse("2023-06-01"), s[s.length - 1].date][Math.min(i, 2)];

  return {
    onStep(i) {
      clip.transition().duration(1300)
        .attr("width", Math.max(0, x(tEnd(i)) - M.l));
      annos[0]?.transition().duration(400).attr("opacity", i >= 1 ? 1 : 0);
      annos[1]?.transition().duration(400).attr("opacity", i >= 2 ? 1 : 0);
    },
  };
}
