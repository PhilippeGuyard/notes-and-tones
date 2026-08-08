/* The record thermometer: a horizontal scale from mild to unthinkable. */
import { C, svgIn } from "../lib.js";

export function recordChart(el) {
  const W = 720, H = 380, M = { l: 50, r: 50 };
  const AXIS_Y = 210;
  const svg = svgIn(el, W, H);
  const x = d3.scaleLinear().domain([15, 45]).range([M.l, W - M.r]);

  const title = svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26);
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46).attr("fill", C.inkSoft)
    .text("afternoon maximum, °C");

  const axis = svg.append("g").attr("class", "axis");
  axis.append("line").attr("x1", M.l - 8).attr("x2", W - M.r + 8)
    .attr("y1", AXIS_Y).attr("y2", AXIS_Y).attr("stroke", C.rule).attr("stroke-width", 1.5);
  for (let t = 15; t <= 45; t += 5) {
    axis.append("text").attr("x", x(t)).attr("y", AXIS_Y + 22)
      .attr("text-anchor", "middle").attr("font-size", ".64rem").attr("fill", C.inkSoft)
      .text(t + "°");
  }

  function marker(color) {
    const g = svg.append("g").attr("opacity", 0);
    const line = g.append("line").attr("y1", AXIS_Y - 26).attr("y2", AXIS_Y)
      .attr("stroke", color).attr("stroke-width", 3);
    const lab = g.append("text").attr("text-anchor", "middle")
      .attr("font-size", ".7rem").attr("font-weight", 700).attr("fill", color);
    const sub = g.append("text").attr("text-anchor", "middle")
      .attr("font-size", ".62rem").attr("fill", C.inkSoft);
    return { g, line, lab, sub };
  }
  const mRecord = marker(C.story);
  const mNow = marker(C.data);
  const mFut = marker(C.gold);
  const mUK = marker(C.ink);

  function place(m, t, l1, l2, dur, dy) {
    m.line.transition().duration(dur).attr("x1", x(t)).attr("x2", x(t));
    m.lab.transition().duration(dur).attr("x", x(t)).attr("y", AXIS_Y - 34 - dy).text(l1);
    m.sub.transition().duration(dur).attr("x", x(t)).attr("y", AXIS_Y - 34 - dy + 15).text(l2);
  }

  let city = null, step = 0;

  function draw(dur) {
    if (!city) return;
    title.text(`${city.name}: ordinary heat vs the record`);
    place(mRecord, city.record.t, `record · ${city.record.t}°`, city.record.date, dur, 40);
    place(mNow, city.wmax, `typical now · ${city.wmax}°`, "warmest-month afternoon", dur, 0);
    place(mFut, city.wmax2050, `typical 2050 · ${city.wmax2050}°`, "RCP4.5", dur, 0);
    place(mUK, 40.3, "UK record · 40.3°", "Coningsby, 2022", dur, 80);
    mRecord.g.transition().duration(dur).attr("opacity", 1);
    mNow.g.transition().duration(dur).attr("opacity", step >= 1 ? 1 : 0);
    mFut.g.transition().duration(dur).attr("opacity", step >= 2 ? 1 : 0);
    mUK.g.transition().duration(dur).attr("opacity", step >= 3 ? 1 : 0);
  }

  return {
    onStep(s) { step = s; draw(600); },
    setCity(c) { city = c; draw(400); },
  };
}
