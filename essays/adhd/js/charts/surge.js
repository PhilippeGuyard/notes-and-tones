/* Growth in patients prescribed ADHD medication, 2019/20 to 2022/23:
   one bar for everyone, then by age band, then the 30-34 band by sex. */
import { C, svgIn, fmt } from "../lib.js";

export function surgeChart(el, presc) {
  const W = 720, H = 520, M = { t: 64, r: 96, b: 36, l: 86 };
  const svg = svgIn(el, W, H);
  const P = presc.data;

  svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26)
    .text("Patients prescribed ADHD medication, growth 2019/20 to 2022/23");
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46)
    .attr("fill", C.inkSoft)
    .text("England, identified patients, BNF 4.4 · NHSBSA");

  const x = d3.scaleLinear().domain([0, 200]).range([M.l, W - M.r]);
  const bands = P.bands;
  const y = d3.scaleBand().domain(bands.map(d => d.band))
    .range([M.t, H - M.b]).paddingInner(0.32);

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${H - M.b})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => "+" + d + "%"));

  /* --- step 0: a single all-ages bar, vertically centred --- */
  const allG = svg.append("g");
  const midY = (M.t + H - M.b) / 2;
  const allBar = allG.append("rect")
    .attr("x", x(0)).attr("y", midY - 26).attr("height", 52)
    .attr("width", 0).attr("fill", C.data).attr("rx", 2);
  allG.append("text").attr("class", "anno").attr("x", x(0)).attr("y", midY - 36)
    .text("all ages");
  const allLabel = allG.append("text")
    .attr("x", x(0) + 8).attr("y", midY + 6)
    .attr("font-size", "1.1rem").attr("font-weight", 600)
    .attr("fill", C.paper).attr("opacity", 0)
    .text(`+${Math.round(P.overall.growth_pct)}%  (${fmt.n(P.overall.from)} → ${fmt.n(P.overall.to)})`);

  /* --- steps 1-2: one bar per age band --- */
  const bandG = svg.append("g").attr("opacity", 0);
  const rows = bandG.selectAll("g").data(bands).join("g");
  rows.append("text").attr("class", "anno")
    .attr("x", M.l - 8).attr("y", d => y(d.band) + y.bandwidth() / 2 + 3)
    .attr("text-anchor", "end").text(d => d.band);
  const bars = rows.append("rect")
    .attr("x", x(0)).attr("y", d => y(d.band))
    .attr("height", y.bandwidth()).attr("width", 0).attr("rx", 1.5)
    .attr("fill", d => d.band === "30 to 34" ? C.data : C.dataSoft);
  const barLabels = rows.append("text").attr("class", "anno")
    .attr("x", d => x(Math.max(d.growth_pct, 0)) + 6)
    .attr("y", d => y(d.band) + y.bandwidth() / 2 + 3)
    .attr("opacity", 0)
    .attr("font-weight", d => d.band === "30 to 34" ? 700 : 400)
    .attr("fill", d => d.band === "30 to 34" ? C.data : C.inkSoft)
    .text(d => (d.growth_pct >= 0 ? "+" : "") + Math.round(d.growth_pct) + "%");

  /* --- step 2: the 30-34 row splits by sex --- */
  const row3034 = bands.find(d => d.band === "30 to 34");
  const gy = y(row3034.band), gh = y.bandwidth();
  const sexG = svg.append("g").attr("opacity", 0);
  const sexes = [
    { key: "women", v: P.gender_30_34.female, fill: C.story },
    { key: "men", v: P.gender_30_34.male, fill: C.storySoft },
  ];
  const sexBars = sexG.selectAll("rect").data(sexes).join("rect")
    .attr("x", x(0)).attr("y", (d, i) => gy + i * (gh / 2 + 1) - 1)
    .attr("height", gh / 2 - 1).attr("width", 0).attr("rx", 1.5)
    .attr("fill", d => d.fill);
  const sexLabels = sexG.selectAll("text").data(sexes).join("text")
    .attr("class", "anno")
    .attr("x", d => x(d.v.growth_pct) + 6)
    .attr("y", (d, i) => gy + i * (gh / 2 + 1) + gh / 4 + 2)
    .attr("font-weight", 700).attr("fill", d => d.fill === C.story ? C.story : C.inkSoft)
    .text(d => `${d.key} +${Math.round(d.v.growth_pct)}%`);

  function render(step) {
    const s = Math.max(0, Math.min(step, 2));
    /* single bar */
    allG.transition().duration(500).attr("opacity", s === 0 ? 1 : 0);
    allBar.transition().duration(900)
      .attr("width", s === 0 ? x(P.overall.growth_pct) - x(0) : 0);
    allLabel.transition().delay(s === 0 ? 500 : 0).duration(400)
      .attr("opacity", s === 0 ? 1 : 0);
    /* band bars */
    bandG.transition().duration(500).attr("opacity", s >= 1 ? 1 : 0);
    bars.transition().duration(900)
      .attr("width", d => s >= 1 ? x(Math.max(d.growth_pct, 0)) - x(0) : 0)
      .attr("opacity", d => s === 2 && d.band === "30 to 34" ? 0 : 1);
    barLabels.transition().duration(500)
      .attr("opacity", d => s >= 1 && !(s === 2 && d.band === "30 to 34") ? 1 : 0);
    /* sex split */
    sexG.transition().duration(500).attr("opacity", s === 2 ? 1 : 0);
    sexBars.transition().duration(900)
      .attr("width", d => s === 2 ? x(d.v.growth_pct) - x(0) : 0);
    sexLabels.transition().duration(500).attr("opacity", s === 2 ? 1 : 0);
  }

  render(0);
  return { onStep: render };
}
