/* Hook: concern (YouGov) vs net migration (ONS), 2012–2026, dual axis. */
import { C, svgIn, fmt } from "../lib.js";

export function hookChart(el, salience, netmig) {
  const W = 720, H = 520, M = { t: 56, r: 64, b: 40, l: 64 };
  const svg = svgIn(el, W, H);
  const parse = d3.timeParse("%Y-%m-%d");

  // monthly-average the weekly salience series to calm the line
  const byMonth = d3.rollups(
    salience.data.filter(d => d.immigration != null),
    v => d3.mean(v, d => d.immigration),
    d => d.date.slice(0, 7));
  const per = byMonth.map(([m, v]) => ({ date: parse(m + "-15"), v }))
    .sort((a, b) => a.date - b.date);

  const real = netmig.data.filter(d => d.net_migration != null)
    .map(d => ({ date: parse(d.date), v: d.net_migration, period: d.period }));

  const x = d3.scaleTime()
    .domain([parse("2012-01-01"), parse("2026-08-01")])
    .range([M.l, W - M.r]);
  const yP = d3.scaleLinear().domain([0, 75]).range([H - M.b, M.t]);
  const yR = d3.scaleLinear().domain([0, 1_000_000]).range([H - M.b, M.t]);

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${H - M.b})`)
    .call(d3.axisBottom(x).ticks(7).tickSizeOuter(0));
  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(${M.l},0)`)
    .call(d3.axisLeft(yP).ticks(5).tickFormat(d => d + "%"));
  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(${W - M.r},0)`)
    .call(d3.axisRight(yR).ticks(5).tickFormat(fmt.k));

  svg.append("text").attr("class", "chart-title").attr("x", M.l).attr("y", 24)
    .text("Concern vs net migration, UK");
  svg.append("text").attr("class", "anno").attr("x", M.l).attr("y", 42)
    .attr("fill", C.perception)
    .text("“most important issue” (YouGov, left)");
  svg.append("text").attr("class", "anno").attr("x", W - M.r).attr("y", 42)
    .attr("text-anchor", "end").attr("fill", C.reality)
    .text("ONS net migration (right)");

  const lineP = d3.line().x(d => x(d.date)).y(d => yP(d.v)).curve(d3.curveMonotoneX);
  const lineR = d3.line().x(d => x(d.date)).y(d => yR(d.v)).curve(d3.curveMonotoneX);

  const pPath = svg.append("path").datum(per)
    .attr("fill", "none").attr("stroke", C.perception).attr("stroke-width", 3)
    .attr("d", lineP);
  const rPath = svg.append("path").datum(real)
    .attr("fill", "none").attr("stroke", C.reality).attr("stroke-width", 3)
    .attr("d", lineR);

  // annotations, revealed by step
  const annos = svg.append("g");
  const peak = real.find(d => d.period?.startsWith("YE Mar 23"));
  const last = real[real.length - 1];
  const concernPeak = per.reduce((a, b) => (b.date > parse("2025-01-01") && b.v > (a?.v ?? 0) ? b : a), null);

  function mark(pt, y, color, label, dy = -12) {
    const g = annos.append("g").attr("opacity", 0);
    g.append("circle").attr("cx", x(pt.date)).attr("cy", y(pt.v)).attr("r", 5)
      .attr("fill", color).attr("stroke", C.paper).attr("stroke-width", 2);
    g.append("text").attr("class", "anno")
      .attr("x", x(pt.date)).attr("y", y(pt.v) + dy)
      .attr("text-anchor", "middle").attr("fill", color).attr("font-weight", 600)
      .text(label);
    return g;
  }
  const mPeak = peak && mark(peak, yR, C.reality, "944k peak");
  const mLast = last && mark(last, yR, C.reality, "171k", 22);
  const mConc = concernPeak && mark(concernPeak, yP, C.perception, "decade high");

  const lenP = pPath.node().getTotalLength();
  const lenR = rPath.node().getTotalLength();
  pPath.attr("stroke-dasharray", lenP).attr("stroke-dashoffset", lenP);
  rPath.attr("stroke-dasharray", lenR).attr("stroke-dashoffset", lenR);

  return {
    onStep(i) {
      pPath.transition().duration(1200)
        .attr("stroke-dashoffset", i >= 0 ? 0 : lenP);
      rPath.transition().duration(1400)
        .attr("stroke-dashoffset", i >= 1 ? 0 : lenR);
      mPeak?.transition().duration(400).attr("opacity", i >= 1 ? 1 : 0);
      mLast?.transition().duration(400).attr("opacity", i >= 2 ? 1 : 0);
      mConc?.transition().duration(400).attr("opacity", i >= 2 ? 1 : 0);
    },
  };
}
