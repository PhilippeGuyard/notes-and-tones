/* Shared helpers: data loading, scroll orchestration, tooltip, formatting. */

export const C = {
  story: "#8f2f52",      /* mulberry: the debate */
  storySoft: "#ddafc0",
  data: "#23527c",       /* prussian blue: the queue */
  dataSoft: "#a9c1d6",
  ink: "#191410",
  inkSoft: "#4a4238",
  gold: "#a87b2d",
  rule: "#d8ccb4",
  paper: "#f7f1e5",
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
    /* lines: array of strings; first line rendered bold */
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
  si: d3.format("~s"),
  n: d3.format(","),
  t1: d3.format(".1f"),
  k: v => (v >= 1e6 ? (v / 1e6).toFixed(1) + " Gt" : v >= 1e3 ? (v / 1e3).toFixed(1) + " Gt" : Math.round(v) + " Mt"),
};

export function svgIn(el, w = 720, h = 520) {
  return d3.select(el).append("svg")
    .attr("viewBox", `0 0 ${w} ${h}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
}
