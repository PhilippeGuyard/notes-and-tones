import { loadAll, scroller } from "./lib.js";
import { surgeChart } from "./charts/surge.js";
import { funnelChart } from "./charts/funnel.js";
import { genderChart } from "./charts/gender.js";
import { autismChart } from "./charts/autism.js";

const D = await loadAll([
  "prescribing", "funnel",
  "static/gender", "static/autism", "static/facts",
]);

const $ = id => document.getElementById(id);

/* scrolly sections */
scroller("surge", surgeChart($("chart-surge"), D.prescribing));
scroller("funnel", funnelChart($("chart-funnel"), D.funnel, D.gender));
scroller("gender", genderChart($("chart-gender"), D.gender));
scroller("autism", autismChart($("chart-autism"), D.autism));

/* ---- belief cards ---- */
{
  const F = D.facts.data;
  const cards = [
    ["myth", "+200%", "The number the documentary leads with: referrals for an ADHD assessment tripled between 2020 and 2025. Quoted alone, it sounds like an epidemic of labelling.", F.c4_referral_growth.source],
    ["fact", "1 in 3", "At most a third of the 2.49 million people the NHS estimates have ADHD are even in the assessment queue, and over 260,000 of those have waited more than two years.", F.queue_share.source],
    ["myth", "“a pill”", "The film's experts warn that Britain has swapped discipline for medication and is dosing a generation of schoolchildren.", F.c4_referral_growth.source],
    ["fact", "15-25%", "The share of people with ADHD in England who obtain medication, against the 70 to 90% trials suggest would benefit. Prescribing for ages 5 to 9 grew 0.6% in three years.", F.treated_share.source],
    ["myth", "+29.5%", "New referrals in March 2026 versus a year earlier, the sort of figure quoted as proof that demand has lost touch with reality.", F.queue_share.source],
    ["fact", "Feb 2025", "The month independent providers joined the NHS data collection. Part of every year-on-year rise since then is wider coverage of the count, not more people.", F.coverage_change.source],
  ];
  const wrap = $("beliefs-cards");
  for (const [kind, big, text, src] of cards) {
    const d = document.createElement("div");
    d.className = `belief-card card--${kind}`;
    const h = document.createElement("p");
    h.className = "big";
    h.textContent = big;
    const p = document.createElement("p");
    p.textContent = text;
    const s = document.createElement("span");
    s.className = "src";
    s.textContent = (kind === "myth" ? "the debate · " : "the queue · ") + src;
    d.append(h, p, s);
    wrap.appendChild(d);
  }
}

/* ---- sources list ---- */
{
  const list = $("sources-list");
  const seen = new Set();
  for (const v of Object.values(D)) {
    if (v.source && !seen.has(v.source)) {
      seen.add(v.source);
      const d = document.createElement("div");
      d.textContent = "· " + v.source + (v.retrieved ? ` (retrieved ${v.retrieved})` : "");
      list.appendChild(d);
    }
  }
}
