/* Recorded ADHD diagnoses by sex, children and adults, against the band
   research prevalence expects. The gap is who the system used to miss. */
import { C, svgIn } from "../lib.js";

export function genderChart(el, gender) {
  const W = 720, H = 520, M = { t: 76, r: 36, b: 46, l: 56 };
  const svg = svgIn(el, W, H);
  const G = gender.data;

  svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26)
    .text("Recorded ADHD diagnoses vs research prevalence");
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46)
    .attr("fill", C.inkSoft)
    .text("Share of each group, England · Independent ADHD Taskforce");

  const groups = [
    { key: "children", label: "children", band: G.research_prevalence_pct.children,
      male: G.administrative_pct.children.male, female: G.administrative_pct.children.female },
    { key: "adults", label: "adults", band: G.research_prevalence_pct.adults,
      male: G.administrative_pct.adults.male, female: G.administrative_pct.adults.female },
  ];

  const x0 = d3.scaleBand().domain(groups.map(d => d.key))
    .range([M.l, W - M.r]).paddingInner(0.35).paddingOuter(0.15);
  const x1 = d3.scaleBand().domain(["male", "female"])
    .range([0, x0.bandwidth()]).padding(0.18);
  const y = d3.scaleLinear().domain([0, 5.4]).range([H - M.b, M.t]);

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(${M.l},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "%"));
  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${H - M.b})`)
    .call(d3.axisBottom(x0).tickFormat(k => groups.find(d => d.key === k).label));

  /* research-prevalence bands, one per group */
  const bands = svg.append("g").selectAll("rect").data(groups).join("rect")
    .attr("x", d => x0(d.key)).attr("width", x0.bandwidth())
    .attr("y", d => y(d.band[1]))
    .attr("height", d => y(d.band[0]) - y(d.band[1]))
    .attr("fill", C.rule).attr("opacity", 0);
  const bandLabels = svg.append("g").selectAll("text").data(groups).join("text")
    .attr("class", "anno")
    .attr("x", d => x0(d.key) + x0.bandwidth() / 2)
    .attr("y", d => y(d.band[1]) - 8)
    .attr("text-anchor", "middle").attr("fill", C.inkSoft).attr("opacity", 0)
    .text(d => `research estimate: ${d.band[0]} to ${d.band[1]}%`);

  /* diagnosed bars */
  const flat = groups.flatMap(d =>
    ["male", "female"].map(sex => ({ group: d.key, sex, v: d[sex] })));
  const bars = svg.append("g").selectAll("rect").data(flat).join("rect")
    .attr("x", d => x0(d.group) + x1(d.sex))
    .attr("width", x1.bandwidth())
    .attr("y", y(0)).attr("height", 0)
    .attr("fill", d => d.sex === "male" ? C.data : C.dataSoft);
  const barLabels = svg.append("g").selectAll("text").data(flat).join("text")
    .attr("class", "anno").attr("font-weight", 700)
    .attr("x", d => x0(d.group) + x1(d.sex) + x1.bandwidth() / 2)
    .attr("y", d => y(d.v) - 6)
    .attr("text-anchor", "middle").attr("opacity", 0)
    .attr("fill", d => d.sex === "male" ? C.data : C.inkSoft)
    .text(d => d.v + "%");
  const sexLabels = svg.append("g").selectAll("text").data(flat).join("text")
    .attr("class", "anno")
    .attr("x", d => x0(d.group) + x1(d.sex) + x1.bandwidth() / 2)
    .attr("y", H - M.b + 30)
    .attr("text-anchor", "middle").attr("fill", C.inkSoft).attr("opacity", 0)
    .text(d => d.sex === "male" ? "M" : "F");

  const gapNote = svg.append("text").attr("class", "anno").attr("font-weight", 700)
    .attr("x", W - M.r).attr("y", M.t - 10)
    .attr("text-anchor", "end").attr("fill", C.story).attr("opacity", 0)
    .text("the missing diagnoses are mostly female");

  const shown = d => d.group === "children" ? 1 : 2;

  function render(step) {
    const s = Math.max(0, Math.min(step, 3));
    bands.transition().duration(600).attr("opacity", 0.55);
    bandLabels.transition().duration(600).attr("opacity", 1);
    bars.transition().duration(800)
      .attr("y", d => s >= shown(d) ? y(d.v) : y(0))
      .attr("height", d => s >= shown(d) ? y(0) - y(d.v) : 0)
      .attr("fill", d => d.sex === "male" ? C.data
        : (s === 3 ? C.story : C.dataSoft));
    barLabels.transition().duration(500)
      .attr("opacity", d => s >= shown(d) ? 1 : 0)
      .attr("fill", d => d.sex === "male" ? C.data : (s === 3 ? C.story : C.inkSoft));
    sexLabels.transition().duration(500).attr("opacity", d => s >= shown(d) ? 1 : 0);
    gapNote.transition().duration(500).attr("opacity", s === 3 ? 1 : 0);
  }

  render(0);
  return { onStep: render };
}
