/* Myth 2: waffle — how the UK's (then EU's) immigrants actually arrive. */
import { C, svgIn, tooltip } from "../lib.js";

const COLORS = {
  work_study_family: C.reality,
  asylum_other: C.gold,
  small_boats: C.perception,
  legal: C.reality,
  irregular: C.perception,
};

export function compositionChart(el, composition) {
  const W = 720, H = 640;
  const svg = svgIn(el, W, H);
  const tip = tooltip();

  const title = svg.append("text").attr("class", "chart-title").attr("x", 24).attr("y", 30);
  const sub = svg.append("text").attr("class", "anno").attr("x", 24).attr("y", 50)
    .attr("fill", C.inkSoft);

  const cell = 40, pad = 6, cols = 10;
  const gx = (W - cols * cell - (cols - 1) * pad) / 2;
  const gy = 84;

  function unitsOf(mode) {
    const seq = [];
    composition[mode].per_100.forEach(cat => {
      for (let i = 0; i < cat.value; i++) seq.push(cat);
    });
    return seq.slice(0, 100).map((cat, i) => ({ i, cat }));
  }

  let mode = "uk";
  const squares = svg.append("g").selectAll("rect")
    .data(unitsOf("uk"), d => d.i).join("rect")
    .attr("x", d => gx + (d.i % cols) * (cell + pad))
    .attr("y", d => gy + Math.floor(d.i / cols) * (cell + pad))
    .attr("width", cell).attr("height", cell)
    .attr("rx", 3)
    .attr("fill", d => COLORS[d.cat.key])
    .on("mousemove", (ev, d) => tip.show(
      [d.cat.label, `${d.cat.value} in every 100 arrivals`], ev))
    .on("mouseleave", () => tip.hide());

  const legend = svg.append("g").attr("transform", `translate(${gx},${gy + 10 * (cell + pad) + 16})`);

  function drawLegend() {
    const cats = composition[mode].per_100;
    legend.selectAll("*").remove();
    cats.forEach((cat, i) => {
      const g = legend.append("g").attr("transform", `translate(0,${i * 22})`);
      g.append("rect").attr("width", 14).attr("height", 14).attr("rx", 3)
        .attr("fill", COLORS[cat.key]);
      g.append("text").attr("x", 20).attr("y", 12).attr("font-size", ".7rem")
        .text(`${cat.label} — ${cat.value}%`);
    });
  }

  function render(newMode, highlight) {
    mode = newMode;
    const d = composition[mode];
    title.text(mode === "uk"
      ? `Every 100 people who moved to the UK, ${d.year}`
      : `Every 100 people who moved to the EU, ${d.year}`);
    sub.text(mode === "uk" ? "ONS · Home Office, 2025" : "Eurostat · Frontex, 2024");
    squares.data(unitsOf(mode), d => d.i)
      .transition().duration(700)
      .attr("fill", u => COLORS[u.cat.key])
      .attr("opacity", u => (highlight && u.cat.key !== highlight ? 0.22 : 1));
    drawLegend();
  }

  render("uk", null);

  return {
    onStep(i) {
      if (i === 0) render("uk", "work_study_family");
      else if (i === 1) render("uk", "asylum_other");
      else if (i === 2) render("uk", "small_boats");
      else if (i === 3) render("eu", "irregular");
    },
  };
}
