/* Context: EU asylum applications, annotated with the two wars. */
import { C, svgIn, fmt, tooltip } from "../lib.js";

export function warsChart(el, euAsylum, facts) {
  const s = (euAsylum.data.EU27_2020 || []).filter(d => d.value != null);
  const W = 860, H = 520, M = { t: 130, r: 30, b: 44, l: 64 };
  const svg = svgIn(el, W, H);
  const tip = tooltip();

  svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26)
    .text("Asylum applications in the EU-27: a story of two wars");
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46)
    .attr("fill", C.inkSoft)
    .text("Eurostat, total applicants per year.");
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 62)
    .attr("fill", C.inkSoft)
    .text("Ukraine's 4.37M arrived via legal temporary protection, not asylum.");

  const x = d3.scaleBand().domain(s.map(d => d.year)).range([M.l, W - M.r]).padding(0.25);
  const y = d3.scaleLinear().domain([0, d3.max(s, d => d.value)]).nice()
    .range([H - M.b, M.t]);

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${H - M.b})`)
    .call(d3.axisBottom(x).tickValues(s.map(d => d.year).filter(v => v % 2 === 0)));
  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(${M.l},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(fmt.k));

  svg.selectAll(".bar").data(s).join("rect")
    .attr("x", d => x(d.year)).attr("y", d => y(d.value))
    .attr("width", x.bandwidth()).attr("height", d => y(0) - y(d.value))
    .attr("rx", 2).attr("fill", C.reality)
    .on("mousemove", (ev, d) => tip.show([`${d.year}`, `${fmt.n(d.value)} applicants`], ev))
    .on("mouseleave", () => tip.hide());

  // short label above the bar, longer detail in the tooltip; lift = stagger level
  const annos = [
    { yr: 2015, label: "Syrian war peak", detail: "1.3M cross via the Aegean", lift: 0 },
    { yr: 2016, label: "EU–Turkey statement", detail: "Aegean crossings collapse within weeks", lift: 1 },
    { yr: 2022, label: "Russia invades Ukraine", detail: "4.37M later hosted under temporary protection", lift: 1, anchor: "end" },
    { yr: 2024, label: "Assad falls", detail: "Syrian claims −72% the following year", lift: 0, anchor: "start" },
  ];
  annos.forEach(({ yr, label, detail, lift, anchor = "middle" }) => {
    const d = s.find(v => v.year === yr);
    if (!d) return;
    const cx = x(yr) + x.bandwidth() / 2;
    const ty = y(d.value) - 22 - lift * 26;
    svg.append("line")
      .attr("x1", cx).attr("x2", cx)
      .attr("y1", y(d.value) - 6).attr("y2", ty + 6)
      .attr("stroke", C.inkSoft);
    svg.append("text").attr("class", "anno")
      .attr("x", cx).attr("y", ty)
      .attr("text-anchor", anchor).attr("font-weight", 600)
      .style("cursor", "default")
      .on("mousemove", ev => tip.show([label, detail], ev))
      .on("mouseleave", () => tip.hide())
      .text(label);
  });

  return {};
}
