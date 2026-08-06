/* Shared helpers: data loading, scroll orchestration, tooltip, formatting,
   and the HBAI equivalisation used by the "where do you sit" calculator. */

export const C = {
  perception: "#a6791f",   /* brass — what we assume */
  perceptionSoft: "#e2c689",
  reality: "#2f6f4f",      /* green — what is measured */
  realitySoft: "#a9ccb8",
  ink: "#191410",
  inkSoft: "#4a4238",
  gold: "#a6791f",
  rule: "#d8ccb4",
  paper: "#f7f1e5",
  /* OECD-style bands, muted for print */
  poverty: "#b23b3b",
  squeezed: "#d98b30",
  comfortable: "#3f8f6b",
  welloff: "#3a6f9c",
};

export async function loadAll(names) {
  const out = {};
  await Promise.all(names.map(async n => {
    const r = await fetch(`data/${n}.json`);
    if (!r.ok) throw new Error(`missing data/${n}.json`);
    out[n.replace("static/", "")] = await r.json();
  }));
  return out;
}

/* Sticky scrolly: watches .step elements inside `section`, toggles .active,
   calls chart.onStep(index) when a step crosses the middle of the viewport. */
export function scroller(sectionId, chart) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  const steps = [...section.querySelectorAll(".step")];
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) {
        steps.forEach(s => s.classList.toggle("active", s === e.target));
        chart?.onStep?.(+e.target.dataset.step);
      }
    }
  }, { rootMargin: "-45% 0px -45% 0px" });
  steps.forEach(s => io.observe(s));
}

/* Fire once when an element first scrolls into view. */
export function onVisible(el, fn) {
  const io = new IntersectionObserver(es => {
    if (es.some(e => e.isIntersecting)) { fn(); io.disconnect(); }
  }, { threshold: 0.3 });
  io.observe(el);
}

let tipEl;
export function tooltip() {
  if (!tipEl) {
    tipEl = document.createElement("div");
    tipEl.className = "tooltip";
    document.body.appendChild(tipEl);
  }
  return {
    show(lines, ev) {
      tipEl.replaceChildren(...lines.map((t, i) => {
        const d = document.createElement("div");
        d.textContent = t;
        if (i === 0) d.style.fontWeight = "600";
        return d;
      }));
      tipEl.style.opacity = 1;
      tipEl.style.left = Math.min(ev.clientX + 14, innerWidth - 260) + "px";
      tipEl.style.top = (ev.clientY + 14) + "px";
    },
    hide() { tipEl.style.opacity = 0; },
  };
}

export const fmt = {
  gbp: v => "£" + d3.format(",")(Math.round(v)),
  gbp0: d3.format("$,.0f"),
  pct: v => d3.format(".0f")(v) + "%",
  n: d3.format(","),
  wk: v => "£" + d3.format(",")(Math.round(v)),
};

export function svgIn(el, w = 720, h = 520) {
  return d3.select(el).append("svg")
    .attr("viewBox", `0 0 ${w} ${h}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
}

/* ---- HBAI equivalisation ----
   OECD-modified "companion" scale, rescaled so a couple with no children = 1,
   which is exactly how HBAI expresses equivalised income. Scales differ before
   and after housing costs. Presets keep the reader out of the weeds. */
export const HOUSEHOLDS = [
  { key: "single",       label: "One adult",                 bhc: 0.67, ahc: 0.58 },
  { key: "couple",       label: "Couple, no children",       bhc: 1.00, ahc: 1.00 },
  { key: "lone2",        label: "One adult, 2 young kids",   bhc: 1.07, ahc: 0.98 },
  { key: "couple2",      label: "Couple, 2 young children",  bhc: 1.40, ahc: 1.40 },
  { key: "couple2teen",  label: "Couple, 2 teenagers",       bhc: 1.66, ahc: 1.84 },
];

/* Equivalise a real household income to the couple-no-children yardstick. */
export function equivalise(householdWeekly, hh, housing) {
  const factor = housing === "AHC" ? hh.ahc : hh.bhc;
  return householdWeekly / factor;
}

/* Share (%) below a threshold using the published band convention (a band
   counts if its lower edge is below the threshold). Matches HBAI's own
   headline rates, so the charts agree with the government figures. */
export function cumBelow(series, threshold) {
  return series.reduce((a, d) => a + (d.band < threshold ? d.share : 0), 0);
}

/* Share (%) of the population living on less than an equivalised weekly income,
   by linear interpolation of the cumulative distribution. Used by the
   calculator, where an arbitrary income needs a smooth percentile. */
export function percentileBelow(series, eqWeekly) {
  if (eqWeekly <= series[0].band) return 0;
  const last = series[series.length - 1];
  if (eqWeekly >= last.band) return last.cum;
  for (let i = 1; i < series.length; i++) {
    if (eqWeekly < series[i].band) {
      const a = series[i - 1], b = series[i];
      const t = (eqWeekly - a.band) / (b.band - a.band);
      return a.cum + t * (b.cum - a.cum);
    }
  }
  return last.cum;
}
