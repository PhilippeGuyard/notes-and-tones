/* Myth 5: who hosts the world's refugees. EU members greyed vs the rest. */
import { C, svgIn, fmt, tooltip } from "../lib.js";

const EU_ISO = new Set(["AUT","BEL","BGR","HRV","CYP","CZE","DNK","EST","FIN","FRA",
  "DEU","GRC","HUN","IRL","ITA","LVA","LTU","LUX","MLT","NLD","POL","PRT","ROU",
  "SVK","SVN","ESP","SWE"]);

const SHORT_NAMES = {
  "Iran (Islamic Rep. of)": "Iran",
  "Venezuela (Bolivarian Republic of)": "Venezuela",
  "Dem. Rep. of the Congo": "DR Congo",
  "United States of America": "United States",
  "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",
};

export function hostsChart(el, hosts) {
  const data = hosts.data.slice(0, 14)
    .map(d => ({ ...d, country: SHORT_NAMES[d.country] || d.country,
                 total: d.refugees + d.oip, eu: EU_ISO.has(d.iso) || d.iso === "GBR" }));
  const W = 860, H = 30 * data.length + 130, M = { t: 84, r: 70, b: 26, l: 150 };
  const svg = svgIn(el, W, H);
  const tip = tooltip();

  svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26)
    .text("Where the world's refugees actually live, 2024");
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46)
    .attr("fill", C.inkSoft)
    .text("UNHCR: refugees + others in need of international protection, by host country");

  const x = d3.scaleLinear().domain([0, d3.max(data, d => d.total)])
    .range([M.l, W - M.r]);
  const y = d3.scaleBand().domain(data.map(d => d.iso))
    .range([M.t, H - M.b]).padding(0.3);

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${M.t - 8})`)
    .call(d3.axisTop(x).ticks(6).tickFormat(fmt.k));

  const g = svg.selectAll(".host").data(data).join("g");
  g.append("rect")
    .attr("x", M.l).attr("y", d => y(d.iso))
    .attr("width", d => x(d.total) - M.l).attr("height", y.bandwidth()).attr("rx", 2)
    .attr("fill", d => d.eu ? C.realitySoft : C.perception)
    .on("mousemove", (ev, d) => tip.show(
      [d.country, `${fmt.n(d.total)} refugees hosted`,
       d.eu ? "EU / rich-world host" : "outside the EU"], ev))
    .on("mouseleave", () => tip.hide());
  g.append("text")
    .attr("x", M.l - 10).attr("y", d => y(d.iso) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "end").attr("font-size", ".72rem")
    .attr("font-weight", d => d.eu ? 400 : 600)
    .text(d => d.country);
  g.append("text")
    .attr("x", d => x(d.total) + 6).attr("y", d => y(d.iso) + y.bandwidth() / 2 + 4)
    .attr("font-size", ".68rem").attr("fill", C.inkSoft)
    .text(d => fmt.k(d.total));

  const note = svg.append("g")
    .attr("transform", `translate(${W - 300},${H - 118})`);
  note.append("rect").attr("width", 236).attr("height", 92).attr("fill", "none")
    .attr("stroke", C.rule);
  note.append("text").attr("x", 14).attr("y", 30).attr("font-size", "1.5rem")
    .attr("font-weight", 700).attr("fill", C.perception).text("68%");
  note.append("text").attr("x", 14).attr("y", 50).attr("font-size", ".66rem")
    .text("hosted by low/middle-income countries");
  note.append("text").attr("x", 14).attr("y", 70).attr("font-size", ".66rem")
    .text("66% stay next door to their own country");

  return {};
}
