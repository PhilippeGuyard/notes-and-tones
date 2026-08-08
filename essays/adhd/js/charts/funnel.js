/* The treatment funnel: estimated prevalence, the referral queue, how long
   the queue has waited, and how few end up treated. One shared people-scale. */
import { C, svgIn, fmt } from "../lib.js";

export function funnelChart(el, funnel, gender) {
  const W = 720, H = 560, M = { t: 64, r: 24, l: 24 };
  const svg = svgIn(el, W, H);
  const F = funnel.data, G = gender.data;
  const total = F.estimated_prevalence;
  const x = v => M.l + (v / total) * (W - M.l - M.r);

  svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26)
    .text("From estimated ADHD to treated ADHD, England");
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46)
    .attr("fill", C.inkSoft)
    .text("March 2026 · bar widths share one scale: the full width is 2.49m people");

  const BAR_H = 46;
  const rowY = i => M.t + 40 + i * 108;

  /* everything except the closing cost annotation lives in this group,
     so the final step can dim it all at once */
  const g = svg.append("g");

  /* waiting bands inside the queue bar (MHSDS + CHS combined) */
  const w = F.mhsds.waited, wc = F.chs_estimated.waited;
  const waitBands = [
    { key: "under 13w", v: w.lt13w + wc.lt12w, fill: C.dataSoft },
    { key: "13w to 1y", v: w.w13to52 + wc.w12to52, fill: "#7d9cba" },
    { key: "1y to 2y", v: w.w52to104 + wc.w52to104, fill: "#4f7096" },
    { key: "over 2y", v: w.over104w + wc.over104w, fill: C.story },
  ];

  const treatLo = G.treated_share_pct[0] / 100 * total;
  const treatHi = G.treated_share_pct[1] / 100 * total;

  const stages = [
    { label: "estimated to have ADHD, diagnosed or not", value: total },
    { label: "in the assessment queue", value: F.open_referrals_total },
    { label: "the same queue, by time already waited", value: F.open_referrals_total },
    { label: "obtain medication", value: treatHi },
  ];

  /* faint outlines so the funnel's shape is visible before each stage fills */
  g.append("g").selectAll("rect").data(stages).join("rect")
    .attr("x", M.l).attr("y", (d, i) => rowY(i))
    .attr("width", d => x(d.value) - M.l).attr("height", BAR_H)
    .attr("fill", "none").attr("stroke", C.rule).attr("stroke-dasharray", "3 3");

  const stageLabels = g.append("g").selectAll("text").data(stages).join("text")
    .attr("class", "anno").attr("x", M.l).attr("y", (d, i) => rowY(i) - 8)
    .attr("opacity", 0.35)
    .text(d => d.label);

  /* stage 0 and 1: plain bars */
  const bar0 = g.append("rect").attr("x", M.l).attr("y", rowY(0))
    .attr("height", BAR_H).attr("width", 0).attr("fill", C.dataSoft);
  const bar1 = g.append("rect").attr("x", M.l).attr("y", rowY(1))
    .attr("height", BAR_H).attr("width", 0).attr("fill", C.data);
  const n0 = g.append("text").attr("class", "anno").attr("font-weight", 700)
    .attr("x", M.l + 8).attr("y", rowY(0) + BAR_H / 2 + 4).attr("opacity", 0)
    .text(fmt.n(total) + " people");
  const n1 = g.append("text").attr("class", "anno").attr("font-weight", 700)
    .attr("x", M.l + 8).attr("y", rowY(1) + BAR_H / 2 + 4)
    .attr("fill", C.paper).attr("opacity", 0)
    .text(fmt.n(F.open_referrals_total) + "  ·  about 1 in 3");

  /* stage 2: the queue restacked into waiting bands */
  let acc = 0;
  const waitData = waitBands.map(d => {
    const seg = { ...d, x0: acc }; acc += d.v; return seg;
  });
  const segs = g.append("g").selectAll("rect").data(waitData).join("rect")
    .attr("x", d => x(d.x0)).attr("y", rowY(2))
    .attr("height", BAR_H).attr("width", 0).attr("fill", d => d.fill);
  const segLabel = g.append("text").attr("class", "anno").attr("font-weight", 700)
    .attr("x", x(waitData[3].x0)).attr("y", rowY(2) + BAR_H + 16)
    .attr("fill", C.story).attr("opacity", 0)
    .text(fmt.n(F.over_2y_total) + " waiting over 2 years");

  /* stage 3: treated range 15-25%, dashed 70-90% would-benefit outline */
  const bar3hi = g.append("rect").attr("x", M.l).attr("y", rowY(3))
    .attr("height", BAR_H).attr("width", 0).attr("fill", C.dataSoft);
  const bar3lo = g.append("rect").attr("x", M.l).attr("y", rowY(3))
    .attr("height", BAR_H).attr("width", 0).attr("fill", C.data);
  const treatedLabel = g.append("text").attr("class", "anno").attr("font-weight", 700)
    .attr("x", x(treatHi) + 8).attr("y", rowY(3) + BAR_H / 2 + 4)
    .attr("opacity", 0)
    .text("15 to 25% of the 2.49m");
  const benefitG = g.append("g").attr("opacity", 0);
  benefitG.append("rect")
    .attr("x", x(G.benefit_share_pct[0] / 100 * total)).attr("y", rowY(3))
    .attr("height", BAR_H)
    .attr("width", x(G.benefit_share_pct[1] / 100 * total) - x(G.benefit_share_pct[0] / 100 * total))
    .attr("fill", "none").attr("stroke", C.story).attr("stroke-dasharray", "5 4");
  benefitG.append("text").attr("class", "anno")
    .attr("x", x(G.benefit_share_pct[1] / 100 * total))
    .attr("y", rowY(3) + BAR_H + 16)
    .attr("text-anchor", "end").attr("fill", C.story)
    .text("70 to 90% would likely benefit");

  /* step 4: the cost */
  /* placed in the empty right half, clear of the bars and their labels */
  const costG = svg.append("g").attr("opacity", 0);
  costG.append("text").attr("x", 480).attr("y", rowY(2) + 10)
    .attr("text-anchor", "middle").attr("class", "chart-title")
    .attr("font-size", "1.5rem").attr("fill", C.story)
    .text("untreated ADHD:");
  costG.append("text").attr("x", 480).attr("y", rowY(2) + 44)
    .attr("text-anchor", "middle").attr("class", "chart-title")
    .attr("font-size", "1.5rem").attr("fill", C.story)
    .text("about £17bn a year");
  costG.append("text").attr("x", 480).attr("y", rowY(2) + 96)
    .attr("text-anchor", "middle").attr("class", "anno")
    .text("lost work, extra NHS use, education and justice · ADHD Taskforce");

  function render(step) {
    const s = Math.max(0, Math.min(step, 4));
    bar0.transition().duration(900).attr("width", x(total) - M.l);
    n0.transition().duration(500).attr("opacity", 1);
    bar1.transition().duration(900)
      .attr("width", s >= 1 ? x(F.open_referrals_total) - M.l : 0);
    n1.transition().duration(500).attr("opacity", s >= 1 ? 1 : 0);
    segs.transition().duration(900)
      .attr("width", d => s >= 2 ? (d.v / total) * (W - M.l - M.r) : 0);
    segLabel.transition().duration(500).attr("opacity", s >= 2 ? 1 : 0);
    bar3hi.transition().duration(900).attr("width", s >= 3 ? x(treatHi) - M.l : 0);
    bar3lo.transition().duration(900).attr("width", s >= 3 ? x(treatLo) - M.l : 0);
    treatedLabel.transition().duration(500).attr("opacity", s >= 3 ? 1 : 0);
    benefitG.transition().duration(500).attr("opacity", s >= 3 ? 1 : 0);
    stageLabels.transition().duration(500)
      .attr("opacity", (d, i) => s >= Math.min(i, 3) ? 1 : 0.35);
    g.transition().duration(600).attr("opacity", s === 4 ? 0.22 : 1);
    costG.transition().duration(600).attr("opacity", s === 4 ? 1 : 0);
  }

  render(0);
  return { onStep: render };
}
