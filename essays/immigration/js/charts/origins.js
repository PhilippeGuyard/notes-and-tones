/* Myth 3: where arrivals actually come from. Boat nationalities vs visa
   nationalities on a shared scale that rescales as the visa bars appear. */
import { C, svgIn, fmt, tooltip } from "../lib.js";

export function originsChart(el, origins) {
  const { year, boats, visas } = origins.data;
  const W = 720, H = 560, M = { l: 130, r: 76 };
  const rowH = 34, gap = 66;
  const boatsY = 96, visasY = boatsY + boats.top.length * rowH + gap;
  const svg = svgIn(el, W, H);
  const tip = tooltip();

  svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26)
    .text(`Top origin countries of people arriving in the UK, ${year}`);
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46)
    .attr("fill", C.inkSoft)
    .text("Home Office: small boat arrivals; work, study and family visas issued");

  const x = d3.scaleLinear().range([M.l, W - M.r]);

  function block(items, y0, color, kind) {
    const g = svg.append("g");
    const rows = g.selectAll("g").data(items).join("g")
      .attr("transform", (d, i) => `translate(0,${y0 + i * rowH})`);
    rows.append("text")
      .attr("x", M.l - 10).attr("y", rowH / 2 + 4)
      .attr("text-anchor", "end").attr("font-size", ".72rem")
      .text(d => d.nationality);
    rows.append("rect")
      .attr("class", "bar")
      .attr("x", M.l).attr("y", 6)
      .attr("height", rowH - 12).attr("rx", 2)
      .attr("fill", color)
      .on("mousemove", (ev, d) => tip.show(
        [d.nationality, `${fmt.n(d.value)} people`, kind], ev))
      .on("mouseleave", () => tip.hide());
    rows.append("text")
      .attr("class", "val")
      .attr("y", rowH / 2 + 4)
      .attr("font-size", ".68rem").attr("fill", C.inkSoft)
      .text(d => fmt.n(d.value));
    return { g, rows };
  }

  const boatsBlock = block(boats.top, boatsY, C.perception,
    `arrived by small boat in ${year}`);
  const visasBlock = block(visas.top, visasY, C.reality,
    `issued a work, study or family visa in ${year}`);

  const label = (y, lines, color) => {
    const t = svg.append("text")
      .attr("x", 8).attr("y", y).attr("font-size", ".7rem")
      .attr("font-weight", 600).attr("fill", color);
    lines.forEach((s, i) => t.append("tspan").attr("x", 8).attr("dy", i ? 14 : 0).text(s));
    return t;
  };
  label(boatsY - 14, [`Arrived by small boat: ${fmt.n(boats.total)} people in total`],
    C.perception);
  const visasLabel = label(visasY - 14,
    [`Issued a work, study or family visa: ${fmt.n(visas.total)}`], C.reality);

  function render(step) {
    const max = step === 0 ? d3.max(boats.top, d => d.value)
                           : d3.max(visas.top, d => d.value);
    x.domain([0, max]);
    const visasOn = step >= 1;
    const dim = d => step === 2 &&
      !["India", "United States"].includes(d.nationality) ? 0.35 : 1;

    for (const [blk, on] of [[boatsBlock, true], [visasBlock, visasOn]]) {
      blk.rows.selectAll(".bar").transition().duration(700)
        .attr("width", d => Math.max(x(d.value) - M.l, 2))
        .attr("opacity", d => on ? dim(d) : 0);
      blk.rows.selectAll(".val").transition().duration(700)
        .attr("x", d => x(d.value) + 6)
        .attr("opacity", d => on ? dim(d) : 0);
      blk.rows.selectAll("text").filter(function () {
        return !this.classList.contains("val");
      }).transition().duration(400).attr("opacity", on ? 1 : 0);
    }
    visasLabel.transition().duration(400).attr("opacity", visasOn ? 1 : 0);
  }

  render(0);
  return { onStep: render };
}
