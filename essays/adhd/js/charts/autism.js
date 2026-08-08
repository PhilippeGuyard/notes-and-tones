/* The autism assessment queue as a 10x10 waffle: how much of it has blown
   past the NICE 13-week standard, and how few were seen in time. */
import { C, svgIn, fmt } from "../lib.js";

export function autismChart(el, autism) {
  const W = 720, H = 620;   /* grid ends at y 538; footer annotations need the extra room */
  const cell = 40, pad = 5, gx = 60, gy = 88;
  const svg = svgIn(el, W, H);
  const A = autism.data;

  svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26)
    .text("100 blocks of the autism assessment queue");
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46)
    .attr("fill", C.inkSoft)
    .text(`${fmt.n(A.open_referrals)} open referrals for suspected autism, England, March 2026`);

  /* 90 of 100 cells: open beyond 13 weeks (89.7%). Within those, 3.7% were
     seen in time: 3 cells, drawn in the queue colour at the grid's end. */
  const late = Math.round(A.open_13plus_weeks_pct);            // 90
  const seen = Math.round(late * A.first_appt_within_13w_pct / 100);  // 3
  const kind = i => i < 100 - late ? "fresh" : i >= 100 - seen ? "seen" : "late";
  const FILL = { fresh: "#e9dfc9", late: C.story, seen: C.data };

  const cells = svg.append("g").selectAll("rect").data(d3.range(100)).join("rect")
    .attr("x", i => gx + (i % 10) * (cell + pad))
    .attr("y", i => gy + Math.floor(i / 10) * (cell + pad))
    .attr("width", cell).attr("height", cell).attr("rx", 3)
    .attr("fill", "#e9dfc9").attr("stroke", C.rule);

  const legend = svg.append("g");
  const legX = gx + 10 * (cell + pad) + 14;
  const entries = [
    { key: "late", y: gy + 24, lines: [`${A.open_13plus_weeks_pct}% open`, "beyond 13 weeks"], fill: C.story },
    { key: "seen", y: gy + 96, lines: [`${A.first_appt_within_13w_pct}% of those`, "seen in time"], fill: C.data },
  ];
  const legendRows = entries.map(e => {
    const t = legend.append("text").attr("x", legX).attr("y", e.y)
      .attr("font-size", ".72rem").attr("opacity", 0);
    t.append("tspan").attr("font-weight", 700).attr("fill", e.fill).text(e.lines[0]);
    t.append("tspan").attr("x", legX).attr("dy", 16).text(e.lines[1]);
    return t;
  });

  const nice = svg.append("text").attr("class", "anno")
    .attr("x", gx).attr("y", gy + 10 * (cell + pad) + 24)
    .attr("fill", C.inkSoft).attr("opacity", 0)
    .text("NICE standard: first assessment appointment within 13 weeks of referral");

  const audhd = svg.append("text").attr("class", "anno").attr("font-weight", 700)
    .attr("x", gx).attr("y", gy + 10 * (cell + pad) + 48)
    .attr("fill", C.ink).attr("opacity", 0)
    .text("an AuDHD adult sits in this queue and the ADHD one, separately");

  function render(step) {
    const s = Math.max(0, Math.min(step, 3));
    cells.transition().duration(700)
      .attr("fill", i =>
        s === 0 ? FILL.fresh
        : s === 1 ? (kind(i) === "fresh" ? FILL.fresh : FILL.late)
        : FILL[kind(i)])
      .attr("opacity", s === 3 ? 0.35 : 1);
    legendRows[0].transition().duration(500).attr("opacity", s >= 1 && s < 3 ? 1 : 0.35 * (s === 3));
    legendRows[1].transition().duration(500).attr("opacity", s >= 2 && s < 3 ? 1 : 0.35 * (s === 3));
    nice.transition().duration(500).attr("opacity", s >= 1 ? 1 : 0);
    audhd.transition().duration(500).attr("opacity", s === 3 ? 1 : 0);
  }

  render(0);
  return { onStep: render };
}
