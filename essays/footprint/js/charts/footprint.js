/* The persistent bar: your footprint, stacked as you scroll, then judged
   against the world markers from part one. */
import { C, svgIn } from "../lib.js";

const SEGS = [
  { key: "baseline", label: "shared baseline", color: "#8b8070" },
  { key: "home", label: "home energy", color: C.data },
  { key: "food", label: "food", color: C.gold },
  { key: "car", label: "driving", color: C.story },
  { key: "embodied", label: "making the car", color: C.storySoft },
  { key: "flights", label: "flying", color: C.dataSoft },
];

export function footprintChart(el, F) {
  const W = 720, H = 560, TOP = 64, BOT = H - 44;
  const BX = 210, BW = 130;
  const svg = svgIn(el, W, H);
  const y = d3.scaleLinear().domain([0, 12000]).range([BOT, TOP]);

  svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26)
    .text("Your year, in tonnes of CO2e");

  /* tonne grid */
  const grid = svg.append("g").attr("class", "axis");
  for (let t = 0; t <= 12000; t += 1000) {
    grid.append("line").attr("x1", BX - 46).attr("x2", BX + BW + 10)
      .attr("y1", y(t)).attr("y2", y(t)).attr("stroke", C.rule)
      .attr("stroke-width", t % 2000 === 0 ? 1 : 0.5);
    if (t % 2000 === 0)
      grid.append("text").attr("x", BX - 52).attr("y", y(t) + 4)
        .attr("text-anchor", "end").attr("font-size", ".66rem")
        .attr("fill", C.inkSoft).text(t / 1000 + " t");
  }

  const segG = svg.append("g");
  const rects = new Map(), labels = new Map();
  for (const s of SEGS) {
    rects.set(s.key, segG.append("rect")
      .attr("x", BX).attr("width", BW).attr("fill", s.color)
      .attr("y", BOT).attr("height", 0));
    labels.set(s.key, segG.append("text")
      .attr("x", BX + BW + 14).attr("font-size", ".7rem").attr("opacity", 0));
  }
  const totalLabel = svg.append("text")
    .attr("x", BX + BW / 2).attr("text-anchor", "middle")
    .attr("font-size", "1rem").attr("font-weight", 700).attr("opacity", 0);

  /* world markers (step 8) + paris budget (step 9) */
  const markerG = svg.append("g").attr("opacity", 0);
  const parisG = svg.append("g").attr("opacity", 0);
  for (const m of F.scale_markers) {
    const g = m.paris ? parisG : markerG;
    g.append("line").attr("x1", BX - 46).attr("x2", W - 190)
      .attr("y1", y(m.kg)).attr("y2", y(m.kg))
      .attr("stroke", m.paris ? C.story : C.ink)
      .attr("stroke-width", m.paris ? 1.6 : 1)
      .attr("stroke-dasharray", m.paris ? "6 4" : "2 3");
    g.append("text").attr("x", W - 182).attr("y", y(m.kg) + 4)
      .attr("font-size", ".64rem")
      .attr("fill", m.paris ? C.story : C.inkSoft)
      .text(m.label);
  }

  /* new-EV vs kept-petrol comparison (step 4) */
  const cmpG = svg.append("g").attr("opacity", 0);
  const cmpX = W - 176, cmpW = 44;
  cmpG.append("text").attr("x", cmpX - 8).attr("y", TOP + 6)
    .attr("font-size", ".68rem").attr("font-weight", 600)
    .text("car only, per year:");
  const cmpBars = [0, 1].map(i => ({
    rect: cmpG.append("rect").attr("x", cmpX + i * (cmpW + 26)).attr("width", cmpW)
      .attr("fill", i ? C.storySoft : C.data).attr("y", BOT).attr("height", 0),
    val: cmpG.append("text").attr("x", cmpX + i * (cmpW + 26) + cmpW / 2)
      .attr("text-anchor", "middle").attr("font-size", ".64rem").attr("fill", C.inkSoft),
    cap: cmpG.append("text").attr("x", cmpX + i * (cmpW + 26) + cmpW / 2)
      .attr("y", BOT + 16).attr("text-anchor", "middle").attr("font-size", ".62rem")
      .text(i ? "kept petrol" : "new EV"),
  }));

  let step = 0, lastPieces = null, lastCmp = null;

  function draw(dur) {
    if (!lastPieces) return;
    const visible = SEGS.filter(s => step >= 1 || s.key !== "baseline");
    let acc = 0;
    for (const s of SEGS) {
      const v = (step >= 1 && lastPieces[s.key] > 0) ? lastPieces[s.key] : 0;
      const y1 = y(acc + v), h = y(acc) - y(acc + v);
      rects.get(s.key).transition().duration(dur)
        .attr("y", y1).attr("height", h);
      labels.get(s.key).transition().duration(dur)
        .attr("y", y1 + h / 2 + 4).attr("opacity", v > 120 ? 1 : 0)
        .text(`${s.label} · ${(v / 1000).toFixed(1)} t`);
      acc += v;
    }
    totalLabel.transition().duration(dur)
      .attr("y", y(acc) - 10).attr("opacity", step >= 2 ? 1 : 0)
      .text((acc / 1000).toFixed(1) + " t");
    if (lastCmp) {
      cmpBars[0].rect.transition().duration(dur)
        .attr("y", y(lastCmp.ev)).attr("height", BOT - y(lastCmp.ev));
      cmpBars[0].val.transition().duration(dur).attr("y", y(lastCmp.ev) - 5)
        .text((lastCmp.ev / 1000).toFixed(1) + " t");
      cmpBars[1].rect.transition().duration(dur)
        .attr("y", y(lastCmp.petrol)).attr("height", BOT - y(lastCmp.petrol));
      cmpBars[1].val.transition().duration(dur).attr("y", y(lastCmp.petrol) - 5)
        .text((lastCmp.petrol / 1000).toFixed(1) + " t");
    }
    cmpG.transition().duration(400).attr("opacity", step === 4 ? 1 : 0);
    markerG.transition().duration(600).attr("opacity", step >= 8 ? 1 : 0);
    parisG.transition().duration(600).attr("opacity", step >= 9 ? 1 : 0);
  }

  return {
    onStep(s) { step = s; draw(700); },
    update(pieces, cmp) { lastPieces = pieces; lastCmp = cmp; draw(450); },
  };
}
