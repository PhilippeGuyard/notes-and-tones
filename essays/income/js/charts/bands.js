/* "Comfortable" for whom? The OECD-style bands, all relative to the median,
   shown as one 100%-wide stack that re-splits as we move between age groups. */
import { C, svgIn, cumBelow } from "../lib.js";

const BANDS = [
  { key: "poverty", label: "In poverty", color: C.poverty, lo: -Infinity, hi: 0.60 },
  { key: "squeezed", label: "Squeezed", color: C.squeezed, lo: 0.60, hi: 0.75 },
  { key: "comfortable", label: "Middle / comfortable", color: C.comfortable, lo: 0.75, hi: 2.00 },
  { key: "welloff", label: "Well-off", color: C.welloff, lo: 2.00, hi: Infinity },
];

export function bandsChart(el, dist, stats) {
  const W = 720, H = 360, M = { t: 60, r: 20, b: 30, l: 20 };
  const svg = svgIn(el, W, H);
  const x = d3.scaleLinear().domain([0, 100]).range([M.l, W - M.r]);

  const title = svg.append("text").attr("class", "chart-title").attr("x", M.l).attr("y", 28);
  const sub = svg.append("text").attr("class", "anno").attr("x", M.l).attr("y", 48).attr("fill", C.inkSoft);
  const barY = M.t + 10, barH = 74;
  const segG = svg.append("g");
  const legG = svg.append("g").attr("transform", `translate(${M.l},${barY + barH + 40})`);

  function shares(group, housing) {
    const series = dist.data[group][housing];
    const median = stats.data[housing].median;
    return BANDS.map(b => {
      const below = b.lo === -Infinity ? 0 : cumBelow(series, b.lo * median);
      const above = b.hi === Infinity ? 100 : cumBelow(series, b.hi * median);
      return { ...b, value: Math.max(0, above - below) };
    });
  }

  let painted = false;
  function render(group, housing, highlight) {
    const data = shares(group, housing);
    let acc = 0;
    const laid = data.map(d => { const x0 = acc; acc += d.value; return { ...d, x0, x1: acc }; });

    title.text(`Income bands: ${group}, ${housing}`);
    sub.text("share of the group in each band, relative to the median");

    const segs = segG.selectAll("g.seg").data(laid, d => d.key).join(
      enter => {
        const g = enter.append("g").attr("class", "seg");
        g.append("rect").attr("y", barY).attr("height", barH);
        g.append("text").attr("class", "pct").attr("y", barY + barH / 2 + 5)
          .attr("text-anchor", "middle").attr("font-weight", 700).attr("font-size", ".8rem");
        return g;
      });
    // first paint is immediate (robust even in a background tab); later steps animate
    const rSel = painted ? segs.select("rect").transition().duration(700) : segs.select("rect");
    rSel.attr("x", d => x(d.x0)).attr("width", d => x(d.x1) - x(d.x0))
      .attr("fill", d => d.color)
      .attr("opacity", d => highlight && d.key !== highlight ? 0.3 : 1);
    if (painted) {
      segs.select("text.pct").transition().duration(700)
        .attr("x", d => (x(d.x0) + x(d.x1)) / 2)
        .attr("fill", "#fff").attr("opacity", d => (x(d.x1) - x(d.x0)) > 34 ? 1 : 0)
        .tween("t", function (d) {
          const node = this; const cur = +(node.textContent.replace("%", "")) || 0;
          const iv = d3.interpolateNumber(cur, d.value);
          return t => node.textContent = Math.round(iv(t)) + "%";
        });
    } else {
      segs.select("text.pct")
        .attr("x", d => (x(d.x0) + x(d.x1)) / 2)
        .attr("fill", "#fff").attr("opacity", d => (x(d.x1) - x(d.x0)) > 34 ? 1 : 0)
        .text(d => Math.round(d.value) + "%");
    }
    painted = true;

    const leg = legG.selectAll("g.leg").data(laid, d => d.key).join(
      enter => {
        const g = enter.append("g").attr("class", "leg");
        g.append("rect").attr("width", 13).attr("height", 13).attr("rx", 2);
        g.append("text").attr("x", 19).attr("y", 11).attr("font-size", ".72rem").attr("fill", C.ink);
        return g;
      });
    let ly = 0;
    leg.attr("transform", (d, i) => `translate(0,${i * 22})`);
    leg.select("rect").attr("fill", d => d.color);
    leg.select("text").text(d => `${d.label}: ${Math.round(d.value)}%`);
  }

  render("All", "AHC", null);
  return {
    onStep(i) {
      if (i === 0) render("All", "AHC", null);
      else if (i === 1) render("All", "AHC", "comfortable");
      else if (i === 2) render("Children", "AHC", "poverty");
      else if (i === 3) render("Pensioners", "AHC", "poverty");
    },
  };
}
