/* The century curve: world CO₂ 2000-2100, wedges subtracted live, warming readout. */
import { C, svgIn } from "../lib.js";

export const WEDGE_COLORS = {
  coal: "#5b4a3a",
  road: "#a87b2d",
  forest: "#1e5f4a",
  other: "#7d8a6a",
  cdr: "#a3c4b4",
};
const WEDGE_LABELS = {
  coal: "coal power", road: "road transport", forest: "deforestation",
  other: "everything else", cdr: "carbon removal",
};
const KEYS = ["coal", "road", "forest", "other"];

export function curveChart(el, M, history) {
  const W = 720, H = 520, ML = 52, MR = 16, MT = 100, MB = 130;
  const svg = svgIn(el, W, H);
  const x = d3.scaleLinear().domain([2000, 2100]).range([ML, W - MR]);
  const y = d3.scaleLinear().domain([-12, 48]).range([H - MB, MT]);

  const title = svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26)
    .text("The century, in billions of tonnes a year");
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46).attr("fill", C.inkSoft)
    .text("world CO₂ including land use, GtCO₂ per year");

  /* axes */
  const axis = svg.append("g").attr("class", "axis");
  for (let v = 0; v <= 40; v += 10) {
    axis.append("line").attr("x1", ML).attr("x2", W - MR).attr("y1", y(v)).attr("y2", y(v))
      .attr("stroke", v === 0 ? C.inkSoft : C.rule).attr("stroke-width", v === 0 ? 1.2 : 0.6);
    axis.append("text").attr("x", ML - 8).attr("y", y(v) + 3).attr("text-anchor", "end")
      .attr("font-size", ".62rem").attr("fill", C.inkSoft).text(v);
  }
  for (const yr of [2000, 2025, 2050, 2075, 2100]) {
    axis.append("text").attr("x", x(yr)).attr("y", H - MB + 18).attr("text-anchor", "middle")
      .attr("font-size", ".64rem").attr("fill", C.inkSoft).text(yr);
  }

  const line = d3.line().x(d => x(d[0])).y(d => y(d[1]));

  /* history */
  const histArea = svg.append("path")
    .attr("fill", C.dataSoft).attr("opacity", 0.35)
    .attr("d", d3.area().x(d => x(d[0])).y0(y(0)).y1(d => y(d[1]))(history));
  svg.append("path").attr("fill", "none").attr("stroke", C.data).attr("stroke-width", 2)
    .attr("d", line(history));
  svg.append("text").attr("x", x(2012)).attr("y", y(36) - 8).attr("text-anchor", "middle")
    .attr("font-size", ".66rem").attr("fill", C.data).text("what happened");

  /* future layers (all driven by update) */
  const gFuture = svg.append("g").attr("opacity", 0);
  const basePath = gFuture.append("path").attr("fill", "none")
    .attr("stroke", C.inkSoft).attr("stroke-width", 1.6).attr("stroke-dasharray", "5,4");
  const baseLabel = gFuture.append("text").attr("font-size", ".66rem").attr("fill", C.inkSoft)
    .attr("text-anchor", "end").attr("x", x(2098))
    .attr("stroke", C.paper).attr("stroke-width", 4).attr("paint-order", "stroke")
    .text("current policies");
  const wedgePaths = {};
  for (const k of KEYS) {
    wedgePaths[k] = gFuture.append("path").attr("fill", WEDGE_COLORS[k]).attr("opacity", 0.45);
  }
  const cdrPath = gFuture.append("path").attr("fill", WEDGE_COLORS.cdr).attr("opacity", 0.6);
  const netPath = gFuture.append("path").attr("fill", "none")
    .attr("stroke", C.story).attr("stroke-width", 3);

  /* legend chips */
  const legend = svg.append("g").attr("opacity", 0);
  {
    let cx = ML;
    for (const k of [...KEYS, "cdr"]) {
      legend.append("rect").attr("x", cx).attr("y", H - MB + 30).attr("width", 9).attr("height", 9)
        .attr("fill", WEDGE_COLORS[k]).attr("opacity", 0.7);
      const t = legend.append("text").attr("x", cx + 13).attr("y", H - MB + 38)
        .attr("font-size", ".62rem").attr("fill", C.inkSoft).text(WEDGE_LABELS[k]);
      cx += 13 + WEDGE_LABELS[k].length * 6.2 + 16;
    }
  }

  /* warming readout, top right */
  const gRead = svg.append("g").attr("opacity", 0);
  const readBig = gRead.append("text").attr("x", W - MR).attr("y", 34).attr("text-anchor", "end")
    .attr("font-size", "1.7rem").attr("font-weight", 700).attr("fill", C.story);
  const readPeak = gRead.append("text").attr("x", W - MR).attr("y", 54).attr("text-anchor", "end")
    .attr("font-size", ".68rem").attr("fill", C.ink);
  const readRange = gRead.append("text").attr("x", W - MR).attr("y", 70).attr("text-anchor", "end")
    .attr("font-size", ".62rem").attr("fill", C.inkSoft).attr("opacity", 0);
  const readMeth = gRead.append("text").attr("x", W - MR).attr("y", 86).attr("text-anchor", "end")
    .attr("font-size", ".62rem").attr("font-weight", 600).attr("fill", C.data);

  /* the reckoning gauge: warming scale at the bottom */
  const gauge = svg.append("g").attr("opacity", 0);
  const gx = d3.scaleLinear().domain([1.0, 4.5]).range([ML, W - MR]);
  const GY = H - 42;
  gauge.append("line").attr("x1", ML).attr("x2", W - MR).attr("y1", GY).attr("y2", GY)
    .attr("stroke", C.rule).attr("stroke-width", 1.5);
  for (const t of [1.5, 2, 2.5, 3, 3.5, 4]) {
    gauge.append("text").attr("x", gx(t)).attr("y", GY + 16).attr("text-anchor", "middle")
      .attr("font-size", ".6rem").attr("fill", C.inkSoft).text(t + "°");
  }
  for (const [t, lab] of [[1.5, "1.5° goal"], [2.0, "2° limit"]]) {
    gauge.append("line").attr("x1", gx(t)).attr("x2", gx(t)).attr("y1", GY - 14).attr("y2", GY)
      .attr("stroke", C.ink).attr("stroke-width", 1.5);
    gauge.append("text").attr("x", gx(t)).attr("y", GY - 20).attr("text-anchor", "middle")
      .attr("font-size", ".62rem").attr("fill", C.ink).text(lab);
  }
  const gaugeDot = gauge.append("circle").attr("cy", GY).attr("r", 7)
    .attr("fill", C.story).attr("stroke", C.paper).attr("stroke-width", 2);
  const gaugeLab = gauge.append("text").attr("y", GY + 30).attr("text-anchor", "middle")
    .attr("font-size", ".68rem").attr("font-weight", 700).attr("fill", C.story);

  let step = 0, result = null;

  function futureSeries(r) {
    /* stacked tops between baseline and gross, clamped at zero like the model */
    const rows = r.years.map((yr, i) => {
      const w = r.wedges[i];
      let top = r.baseline[i];
      const tops = [top];
      for (const k of KEYS) tops.push(top = Math.max(0, tops[tops.length - 1] - w[k]));
      return { yr, tops, gross: tops[4], net: r.net[i] };
    });
    return rows;
  }

  function draw(dur) {
    if (!result) return;
    const rows = futureSeries(result);
    basePath.transition().duration(dur)
      .attr("d", line(rows.map(r => [r.yr, r.tops[0]])));
    baseLabel.attr("y", y(rows[rows.length - 1].tops[0]) - 14);
    KEYS.forEach((k, i) => {
      wedgePaths[k].transition().duration(dur).attr("d",
        d3.area().x(r => x(r.yr)).y0(r => y(r.tops[i])).y1(r => y(r.tops[i + 1]))(rows));
    });
    cdrPath.transition().duration(dur).attr("d",
      d3.area().x(r => x(r.yr)).y0(r => y(r.gross)).y1(r => y(r.net))(rows));
    netPath.transition().duration(dur).attr("d", line(rows.map(r => [r.yr, r.net])));

    readBig.text(`2100: ${result.t2100.toFixed(1)}°`);
    readPeak.text(result.peak.year >= 2099
      ? "still rising at the century's end"
      : `peaks at ${result.peak.t.toFixed(1)}° around ${result.peak.year}`);
    readRange.text(`likely ${result.t2100_range[0].toFixed(1)}° to ${result.t2100_range[1].toFixed(1)}° across the physics`);
    readMeth.text(result.methane_c
      ? `includes −${result.methane_c.toFixed(1)}° avoided by methane cuts` : "");

    const gt = Math.max(1.0, Math.min(4.5, result.peak.t));
    gaugeDot.transition().duration(dur).attr("cx", gx(gt));
    gaugeLab.transition().duration(dur).attr("x", gx(gt))
      .text(`your future · ${result.peak.t.toFixed(1)}°`);
  }

  function visibility(dur) {
    gFuture.transition().duration(dur).attr("opacity", step >= 1 ? 1 : 0);
    gRead.transition().duration(dur).attr("opacity", step >= 1 ? 1 : 0);
    readRange.transition().duration(dur).attr("opacity", step >= 2 ? 1 : 0);
    legend.transition().duration(dur).attr("opacity", step >= 3 ? 1 : 0);
    gauge.transition().duration(dur).attr("opacity", step >= 9 ? 1 : 0);
    histArea.transition().duration(dur).attr("opacity", step >= 1 ? 0.2 : 0.35);
  }

  return {
    onStep(s) { step = s; visibility(600); draw(600); },
    update(r) { result = r; draw(400); },
  };
}
