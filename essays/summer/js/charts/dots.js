/* Summer calendar: 92 dots, June to August. Dots ignite as the era advances.
   Counts are annual (almost all such days fall in summer; see methodology). */
import { C, svgIn } from "../lib.js";

const ERAS = [
  { idx: 0, label: "1981–2000 · baseline" },
  { idx: 1, label: "2001–2020 · observed" },
  { idx: 2, label: "the 2050s · a 2°C world (RCP8.5, median)" },
  { idx: 2, label: "the 2050s · and the nights" },
  { idx: 3, label: "late century · a 4°C world" },
];

export function dotsChart(el) {
  const W = 720, H = 520;
  const COLS = 13, R = 9, GAP = 27;
  const GX = 100, GY = 110;
  const svg = svgIn(el, W, H);

  const title = svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26);
  const sub = svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46)
    .attr("fill", C.inkSoft);

  const dots = svg.append("g").selectAll("circle").data(d3.range(92)).join("circle")
    .attr("cx", i => GX + (i % COLS) * GAP)
    .attr("cy", i => GY + Math.floor(i / COLS) * GAP)
    .attr("r", R).attr("fill", "#e9dfc9").attr("stroke", C.rule);

  const legend = svg.append("g").attr("font-size", ".68rem");
  const leg = (i, color, txt) => {
    legend.append("circle").attr("cx", GX + 8).attr("cy", 330 + i * 24).attr("r", 7)
      .attr("fill", color).attr("stroke", color === "#e9dfc9" ? C.rule : "none");
    return legend.append("text").attr("x", GX + 24).attr("y", 330 + i * 24 + 4);
  };
  const legMild = leg(0, C.storySoft, "days over 25°C");
  const legHot = leg(1, C.story, "days over 28°C");

  const nightsG = svg.append("g").attr("opacity", 0);
  nightsG.append("text").attr("x", GX - 8).attr("y", 434).attr("font-size", ".68rem")
    .attr("font-weight", 600).text("tropical nights (min above 20°C):");
  const nightDots = nightsG.selectAll("circle").data(d3.range(20)).join("circle")
    .attr("cx", i => GX + 240 + (i % 20) * 21).attr("cy", 430).attr("r", 7)
    .attr("fill", "#2b2440").attr("opacity", 0);
  const nightLabel = nightsG.append("text").attr("x", GX - 8).attr("y", 460)
    .attr("font-size", ".66rem").attr("fill", C.inkSoft);

  let city = null, step = 0;

  function draw(dur) {
    if (!city) return;
    const era = ERAS[Math.max(0, Math.min(step, 4))];
    const h25 = city.hot25[era.idx], h28 = city.hot28[era.idx];
    const nightsIdx = step >= 4 ? 3 : 2;
    const n = city.nights[nightsIdx];
    title.text(`A summer in ${city.name}`);
    sub.text(era.label + (era.idx === 2 ? ` · range ${city.hot25_range2c} days over 25°C` : ""));
    dots.transition().duration(dur).delay((i) => i * 3)
      .attr("fill", i => i < h28 ? C.story : i < h25 ? C.storySoft : "#e9dfc9")
      .attr("stroke", i => i < h25 ? "none" : C.rule);
    legMild.text(`days over 25°C · ${h25}`);
    legHot.text(`days over 28°C · ${h28}`);
    nightsG.transition().duration(400).attr("opacity", step >= 3 ? 1 : 0);
    nightDots.transition().duration(dur).attr("opacity", i => i < Math.min(n, 20) ? 1 : 0.12);
    nightLabel.text(n === 0
      ? "median zero here, even at this warming level"
      : `about ${n} a year (${step >= 4 ? "4°C world" : "2°C world"})`);
  }

  return {
    onStep(s) { step = s; draw(600); },
    setCity(c) { city = c; draw(400); },
  };
}
