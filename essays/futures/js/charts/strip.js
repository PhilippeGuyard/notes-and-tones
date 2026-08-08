/* The consequence strip: a warming scale from 1 to 4.5 degrees, with what each
   stop costs (IPCC-sourced) above the axis and whose future sits where below. */
import { C, svgIn } from "../lib.js";

export function stripChart(el, Q) {
  const W = 720, H = 480, ML = 40, MR = 40;
  const AXIS_Y = 235;
  const svg = svgIn(el, W, H);
  const x = d3.scaleLinear().domain(Q.domain).range([ML, W - MR]);

  svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26)
    .text("What each tenth of a degree buys");
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46).attr("fill", C.inkSoft)
    .text("warming above 1850–1900, °C");

  /* axis */
  svg.append("line").attr("x1", ML - 6).attr("x2", W - MR + 6)
    .attr("y1", AXIS_Y).attr("y2", AXIS_Y).attr("stroke", C.rule).attr("stroke-width", 1.5);
  for (let t = 1; t <= 4.5; t += 0.5) {
    svg.append("text").attr("x", x(t)).attr("y", AXIS_Y + 18).attr("text-anchor", "middle")
      .attr("font-size", ".62rem").attr("fill", C.inkSoft).text(t + "°");
  }

  /* paris lines + today, always on */
  for (const p of Q.paris) {
    svg.append("line").attr("x1", x(p.t)).attr("x2", x(p.t))
      .attr("y1", AXIS_Y - 12).attr("y2", AXIS_Y + 4)
      .attr("stroke", C.ink).attr("stroke-width", 2);
    svg.append("text").attr("x", x(p.t)).attr("y", AXIS_Y - 18).attr("text-anchor", "middle")
      .attr("font-size", ".64rem").attr("font-weight", 700).attr("fill", C.ink).text(p.label);
  }
  svg.append("circle").attr("cx", x(Q.today.t)).attr("cy", AXIS_Y).attr("r", 4).attr("fill", C.data);
  /* plain today label for the early steps; the laddered one replaces it at step 2 */
  const todayStatic = svg.append("text").attr("x", x(Q.today.t)).attr("y", AXIS_Y + 34)
    .attr("text-anchor", "middle").attr("font-size", ".64rem").attr("fill", C.data)
    .text(`today · ${Q.today.t}°`);

  /* labels are wide; stack any that would collide (part 3's ladder, reused) */
  function ladder(temps, minGap) {
    const order = temps.map((t, i) => ({ t, i })).sort((a, b) => a.t - b.t);
    const dys = new Array(temps.length).fill(0);
    for (let k = 1; k < order.length; k++) {
      if (x(order[k].t) - x(order[k - 1].t) < minGap)
        dys[order[k].i] = dys[order[k - 1].i] + 34;
    }
    return dys;
  }

  /* consequences above the axis */
  const gCons = svg.append("g").attr("opacity", 0);
  {
    const zone = Q.consequences.find(c => c.zone);
    gCons.append("rect").attr("x", x(zone.t)).attr("y", AXIS_Y - 8)
      .attr("width", x(zone.t2) - x(zone.t)).attr("height", 8)
      .attr("fill", C.story).attr("opacity", 0.35);
    const points = Q.consequences.filter(c => !c.zone)
      .concat([{ t: Q.sea_level_2100.low.t, label: `sea level 2100: ${Q.sea_level_2100.low.range}`, sub: Q.sea_level_2100.low.label },
               { t: Q.sea_level_2100.high.t, label: `sea level 2100: ${Q.sea_level_2100.high.range}`, sub: Q.sea_level_2100.high.label },
               { t: (zone.t + zone.t2) / 2, label: "ice sheets: the point of no return", sub: "Greenland & West Antarctica, 2–3° sustained" }]);
    const dys = ladder(points.map(p => p.t), 190);
    points.forEach((p, i) => {
      const yTop = AXIS_Y - 52 - dys[i];
      gCons.append("line").attr("x1", x(p.t)).attr("x2", x(p.t))
        .attr("y1", yTop + 10).attr("y2", AXIS_Y - 10)
        .attr("stroke", C.storySoft).attr("stroke-width", 1.2);
      gCons.append("text").attr("x", x(p.t)).attr("y", yTop).attr("text-anchor", "middle")
        .attr("font-size", ".64rem").attr("font-weight", 700).attr("fill", C.story)
        .text(p.label);
      if (p.sub) gCons.append("text").attr("x", x(p.t)).attr("y", yTop + 13)
        .attr("text-anchor", "middle").attr("font-size", ".58rem").attr("fill", C.inkSoft)
        .text(p.sub);
    });
  }

  /* benchmark futures, today, and the reader below the axis; the reader's
     marker moves, so all labels re-ladder on every draw. Lines live in a layer
     under the labels, and labels carry a paper halo, so a line crossing a
     neighbour's text disappears behind it. */
  const gBench = svg.append("g").attr("opacity", 0);
  const gLines = gBench.append("g");
  const gLabs = gBench.append("g");
  function belowMarker(color, bold) {
    const halo = t => t.attr("stroke", C.paper).attr("stroke-width", 4)
      .attr("paint-order", "stroke");
    return {
      line: gLines.append("line").attr("stroke", color).attr("stroke-width", bold ? 3 : 1.2),
      lab: halo(gLabs.append("text").attr("text-anchor", "middle")
        .attr("font-size", bold ? ".7rem" : ".62rem")
        .attr("font-weight", bold ? 700 : 400).attr("fill", color)),
      sub: halo(gLabs.append("text").attr("text-anchor", "middle")
        .attr("font-size", ".6rem").attr("fill", C.inkSoft)),
    };
  }
  const mBench = Q.benchmarks.map(() => belowMarker(C.ink, false));
  const mToday = belowMarker(C.data, false);
  const mYou = belowMarker(C.story, true);

  let step = 0, warming = null;

  function draw(dur) {
    if (warming == null) return;
    const clamped = Math.max(Q.domain[0], Math.min(Q.domain[1], warming));
    const temps = [...Q.benchmarks.map(b => b.t), Q.today.t, clamped];
    const dys = ladder(temps, 120);
    const place = (m, t, l1, l2, dy, tail) => {
      const yLab = AXIS_Y + 62 + dy;
      m.line.transition().duration(dur).attr("x1", x(t)).attr("x2", x(t))
        .attr("y1", AXIS_Y + tail).attr("y2", yLab - 20);
      m.lab.transition().duration(dur).attr("x", x(t)).attr("y", yLab - 8).text(l1);
      m.sub.transition().duration(dur).attr("x", x(t)).attr("y", yLab + 5).text(l2);
    };
    Q.benchmarks.forEach((b, i) => place(mBench[i], b.t, `${b.t}°`, b.label, dys[i], 4));
    place(mToday, Q.today.t, `today · ${Q.today.t}°`, "", dys[3], 6);
    place(mYou, clamped, `your future · ${warming.toFixed(1)}°`, "", dys[4], -10);
  }

  return {
    onStep(s) {
      step = s;
      gCons.transition().duration(600).attr("opacity", step >= 1 ? 1 : 0);
      gBench.transition().duration(600).attr("opacity", step >= 2 ? 1 : 0);
      todayStatic.transition().duration(600).attr("opacity", step >= 2 ? 0 : 1);
      draw(600);
    },
    setWarming(t) { warming = t; draw(400); },
  };
}
