/* Shared helpers: data loading, scroll orchestration, tooltip, formatting. */

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
  red: "#b23b3b",
  blue: "#3a6f9c",
  orange: "#d98b30",
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
  gbp2: v => "£" + d3.format(",.2f")(v),
  bn: v => "£" + d3.format(",.0f")(v) + "bn",
  pct: v => d3.format(".0f")(v) + "%",
  pct1: v => d3.format(".1f")(v) + "%",
  n: d3.format(","),
};

export function svgIn(el, w = 720, h = 520) {
  return d3.select(el).append("svg")
    .attr("viewBox", `0 0 ${w} ${h}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
}
