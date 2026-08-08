/* Hook: the public pound as 100 pennies, one cell per 1% of spending,
   with the big blocks, debt interest and aid singled out step by step. */
import { C, svgIn, tooltip } from "../lib.js";

/* Integer pennies per category via largest remainder, so cells sum to 100. */
function pennies(categories) {
  const raw = categories.map(c => ({ ...c, exact: c.share }));
  const floored = raw.map(c => ({ ...c, n: Math.floor(c.exact) }));
  let left = 100 - floored.reduce((a, c) => a + c.n, 0);
  const order = [...floored].sort((a, b) => (b.exact - b.n) - (a.exact - a.n));
  for (let i = 0; left > 0; i = (i + 1) % order.length, left--) order[i].n += 1;
  const cells = [];
  for (const c of floored) for (let i = 0; i < c.n; i++) cells.push(c);
  return cells.slice(0, 100).map((cat, i) => ({ i, cat }));
}

const STEP_COLORS = {
  welfare: C.blue,
  pensions: C.orange,
  health: C.reality,
  debt_interest: C.red,
  defence: C.inkSoft,
  overseas_aid: C.perception,
};

export function hookChart(el, spending) {
  const W = 720, H = 620;
  const svg = svgIn(el, W, H);
  const tip = tooltip();

  svg.append("text").attr("class", "chart-title").attr("x", 24).attr("y", 30)
    .text(`Every pound the government spends, ${spending.year}`);
  const sub = svg.append("text").attr("class", "anno").attr("x", 24).attr("y", 50)
    .attr("fill", C.inkSoft)
    .text(`one penny per cell · £${Math.round(spending.total_bn).toLocaleString("en-GB")}bn in total`);

  const cell = 40, pad = 6, cols = 10;
  const gx = (W - cols * cell - (cols - 1) * pad) / 2;
  const gy = 84;

  const cells = pennies(spending.categories);

  const squares = svg.append("g").selectAll("rect").data(cells, d => d.i).join("rect")
    .attr("x", d => gx + (d.i % cols) * (cell + pad))
    .attr("y", d => gy + Math.floor(d.i / cols) * (cell + pad))
    .attr("width", cell).attr("height", cell).attr("rx", 3)
    .attr("fill", C.realitySoft).attr("opacity", 0)
    .on("mousemove", (ev, d) => tip.show(
      [d.cat.label, `${d.cat.share}p in every £1 · £${Math.round(d.cat.bn)}bn`], ev))
    .on("mouseleave", () => tip.hide());

  const caption = svg.append("text").attr("class", "anno")
    .attr("x", W / 2).attr("y", gy + 10 * (cell + pad) + 24)
    .attr("text-anchor", "middle").attr("fill", C.inkSoft).attr("font-size", ".78rem");

  let drawn = false;
  function appear() {
    if (drawn) return; drawn = true;
    // named: highlight() transitions the same rects and would cancel this
    squares.transition("appear").duration(700).delay((d, i) => i * 8).attr("opacity", 1);
  }

  function highlight(keys, text) {
    // fill-opacity, not opacity: appear() owns the opacity attribute
    squares.transition().duration(600)
      .attr("fill", d => keys.includes(d.cat.key)
        ? (STEP_COLORS[d.cat.key] ?? C.reality)
        : C.realitySoft)
      .attr("fill-opacity", d => keys.length && !keys.includes(d.cat.key) ? 0.35 : 1);
    caption.text(text);
  }

  return {
    onStep(i) {
      appear();
      if (i === 0) highlight([], "");
      else if (i === 1) highlight(["welfare", "pensions", "health"],
        "welfare (blue) · state pensions (amber) · health (green)");
      else if (i === 2) highlight(["debt_interest", "defence"],
        "debt interest (red) next to defence (grey)");
      else if (i >= 3) highlight(["overseas_aid"], "overseas aid: the brass penny");
    },
  };
}
