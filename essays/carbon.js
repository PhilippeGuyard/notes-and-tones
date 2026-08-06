/* ============================================================
   When Should I Run My Dishwasher? — interactive logic
   Pulls the National Grid regional carbon-intensity forecast
   (live, CORS-enabled) and, if that fails, a vendored snapshot.
   Three widgets:
     1) "right now" readout for Great Britain
     2) a region x time heatmap of the next ~48 hours (SVG)
     3) a planner: pick a region + appliance, find the greenest
        windows (local minima, scipy-style prominence) and the
        CO2 you save by waiting.
   Vanilla JS, no innerHTML, no dependencies.
   ============================================================ */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const SVGNS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs, text) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  };

  const API =
    "https://api.carbonintensity.org.uk/regional/intensity/{frm}/{to}";
  const SNAPSHOT = "carbon-snapshot.json";

  // Typical energy per use, kWh. Rough but honest household figures.
  const APPLIANCES = [
    { key: "dishwasher", label: "Dishwasher", kwh: 1.2, verb: "a cycle" },
    { key: "washing", label: "Washing machine (40°C)", kwh: 0.7, verb: "a wash" },
    { key: "dryer", label: "Tumble dryer", kwh: 2.5, verb: "a load" },
    { key: "oven", label: "Oven (1 hour)", kwh: 1.5, verb: "an hour" },
    { key: "ev", label: "EV charge (1 hour at 7 kW)", kwh: 7.0, verb: "an hour" },
  ];

  // Aggregate rows we keep out of the heatmap (they are sums of the rest).
  const AGG = new Set([15, 16, 17, 18]); // England, Scotland, Wales, GB
  const GB_ID = 18;

  const state = { regionId: 13, appliance: APPLIANCES[0] };
  let DATA = null; // { regions:[{id,name,series:[{t:Date,f,i}]}], generated, live }

  /* ---------- colour ramp: clean (green) -> dirty (rose) ---------- */
  const STOPS = [
    [0, [47, 143, 107]],
    [100, [123, 198, 164]],
    [175, [240, 200, 74]],
    [250, [239, 143, 74]],
    [350, [232, 98, 155]],
  ];
  function colour(v) {
    if (v <= STOPS[0][0]) return rgb(STOPS[0][1]);
    for (let i = 1; i < STOPS.length; i++) {
      if (v <= STOPS[i][0]) {
        const [a, ca] = STOPS[i - 1];
        const [b, cb] = STOPS[i];
        const t = (v - a) / (b - a);
        return rgb(ca.map((c, k) => Math.round(c + t * (cb[k] - c))));
      }
    }
    return rgb(STOPS[STOPS.length - 1][1]);
  }
  const rgb = (a) => `rgb(${a[0]},${a[1]},${a[2]})`;

  /* ---------- time helpers ---------- */
  const fmtDay = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
  const fmtTime = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const fmtFull = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const isMidnight = (d) => d.getHours() === 0 && d.getMinutes() === 0;

  /* =========================================================
     LOAD DATA — live first, vendored snapshot as fallback
     ========================================================= */
  function toDate(s) {
    return new Date(s); // API stamps are UTC ("...Z")
  }
  function ingest(raw, live) {
    const regions = raw.regions.map((r) => ({
      id: r.id,
      name: r.name,
      series: r.series.map((p) => ({ t: toDate(p.t), f: p.f, i: p.i })),
    }));
    return { regions, generated: toDate(raw.generated), live };
  }

  async function load() {
    const now = new Date();
    const frm = isoZ(now);
    const to = isoZ(new Date(now.getTime() + 48 * 3600 * 1000));
    try {
      const url = API.replace("{frm}", frm).replace("{to}", to);
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      return ingest(reshape(j), true);
    } catch (e) {
      const r = await fetch(SNAPSHOT);
      return ingest(await r.json(), false);
    }
  }

  // API stamp: YYYY-MM-DDTHH:MMZ, floored to the half hour
  function isoZ(d) {
    const u = new Date(d);
    u.setUTCSeconds(0, 0);
    u.setUTCMinutes(u.getUTCMinutes() < 30 ? 0 : 30);
    const p = (n) => String(n).padStart(2, "0");
    return (
      `${u.getUTCFullYear()}-${p(u.getUTCMonth() + 1)}-${p(u.getUTCDate())}` +
      `T${p(u.getUTCHours())}:${p(u.getUTCMinutes())}Z`
    );
  }

  // live API shape -> vendored shape { regions:[{id,name,series:[{t,f,i}]}] }
  function reshape(j) {
    const map = new Map();
    for (const iv of j.data) {
      for (const reg of iv.regions) {
        let r = map.get(reg.regionid);
        if (!r) {
          r = { id: reg.regionid, name: reg.shortname, series: [] };
          map.set(reg.regionid, r);
        }
        r.series.push({
          t: iv.from,
          f: reg.intensity.forecast,
          i: reg.intensity.index,
        });
      }
    }
    const regions = [...map.values()].sort((a, b) => a.id - b.id);
    return { generated: j.data[0].from, regions };
  }

  const region = (id) => DATA.regions.find((r) => r.id === id);

  /* =========================================================
     WIDGET 1 — right now, for Great Britain
     ========================================================= */
  function renderNow() {
    const gb = region(GB_ID);
    const p = gb.series[0];
    const box = $("now-box");
    box.replaceChildren();

    const big = document.createElement("div");
    big.className = "stat-big";
    big.style.color = colour(p.f);
    big.textContent = p.f + " g";
    const lab = document.createElement("span");
    lab.className = "stat-lab";
    lab.textContent = "CO₂ per kWh across GB now · " + p.i;

    // cleanest region right now
    const dnos = DATA.regions.filter((r) => !AGG.has(r.id));
    const best = dnos.reduce((a, b) => (b.series[0].f < a.series[0].f ? b : a));
    const sub = document.createElement("p");
    sub.className = "stat-sub";
    sub.textContent = `Cleanest region right now: ${best.name} at ${best.series[0].f} g.`;

    box.append(lab, big, sub);
  }

  /* =========================================================
     WIDGET 2 — heatmap of the next ~48 hours (SVG)
     ========================================================= */
  const HM = { W: 1000, rowH: 30, l: 180, r: 16, t: 30, b: 50 };
  let tip;

  function renderHeat() {
    const svg = $("heat-svg");
    svg.replaceChildren();
    const rows = DATA.regions.filter((r) => !AGG.has(r.id));
    const times = rows[0].series.map((p) => p.t);
    const n = times.length;
    const H = HM.t + rows.length * HM.rowH + HM.b;
    svg.setAttribute("viewBox", `0 0 ${HM.W} ${H}`);
    const cw = (HM.W - HM.l - HM.r) / n;

    // cells
    rows.forEach((r, ri) => {
      const y = HM.t + ri * HM.rowH;
      r.series.forEach((p, ci) => {
        const rect = svgEl("rect", {
          x: (HM.l + ci * cw).toFixed(1),
          y: y.toFixed(1),
          width: Math.ceil(cw) + "",
          height: HM.rowH - 1 + "",
          fill: colour(p.f),
        });
        rect.addEventListener("mousemove", (e) => showTip(e, r, p));
        rect.addEventListener("mouseleave", hideTip);
        svg.append(rect);
      });
      // region label
      svg.append(
        svgEl(
          "text",
          {
            x: HM.l - 8 + "",
            y: (y + HM.rowH / 2 + 3).toFixed(1),
            "text-anchor": "end",
            class: "hm-region",
          },
          r.name
        )
      );
    });

    // time axis (every 3 hours; bold at midnight)
    const yAxis = HM.t + rows.length * HM.rowH;
    times.forEach((t, ci) => {
      const mins = t.getHours() * 60 + t.getMinutes();
      if (mins % 180 !== 0) return;
      const x = HM.l + ci * cw;
      svg.append(
        svgEl("line", {
          x1: x.toFixed(1),
          y1: HM.t,
          x2: x.toFixed(1),
          y2: yAxis,
          class: "hm-grid",
        })
      );
      const mid = isMidnight(t);
      const lbl = svgEl(
        "text",
        {
          x: x.toFixed(1),
          y: yAxis + 16 + "",
          "text-anchor": "middle",
          class: "hm-tick" + (mid ? " hm-tick-day" : ""),
        },
        mid ? fmtDay.format(t) : fmtTime.format(t)
      );
      svg.append(lbl);
    });
  }

  function showTip(e, r, p) {
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "hm-tip";
      document.body.append(tip);
    }
    tip.replaceChildren();
    const a = document.createElement("strong");
    a.textContent = r.name;
    const b = document.createElement("span");
    b.textContent = `${fmtFull.format(p.t)} · ${p.f} g · ${p.i}`;
    tip.append(a, document.createElement("br"), b);
    tip.style.opacity = "1";
    tip.style.left = e.pageX + 14 + "px";
    tip.style.top = e.pageY - 10 + "px";
  }
  function hideTip() {
    if (tip) tip.style.opacity = "0";
  }

  /* =========================================================
     WIDGET 3 — the planner: greenest windows for an appliance
     ========================================================= */

  // The scipy prominence trick finds troughs, but a 48-hour regional
  // forecast is smooth enough that it often has only one. For a useful
  // planner we instead pick the cleanest half-hours that are spread out
  // in time: greedily take the lowest slot, exclude a few hours either
  // side, repeat. Guarantees a handful of realistic, distinct windows.
  const GAP = 8; // half-hour slots to keep windows apart (4 hours)
  function cleanWindows(vals, k) {
    const order = vals.map((_, i) => i).sort((a, b) => vals[a] - vals[b]);
    const picked = [];
    for (const i of order) {
      if (picked.every((j) => Math.abs(j - i) >= GAP)) {
        picked.push(i);
        if (picked.length >= k) break;
      }
    }
    return picked.sort((a, b) => a - b);
  }

  const PL = { W: 720, H: 240, l: 44, r: 14, t: 16, b: 40 };

  function renderPlan() {
    const r = region(state.regionId);
    const s = r.series;
    const vals = s.map((p) => p.f);
    const now = vals[0];
    const bestIdx = vals.indexOf(Math.min(...vals));
    const best = s[bestIdx];
    const kwh = state.appliance.kwh;

    // ---- readouts ----
    $("best-when").textContent = fmtFull.format(best.t);
    $("best-int").textContent = best.f + " g";
    $("best-int").style.color = colour(best.f);
    const cut = now > 0 ? Math.round((1 - best.f / now) * 100) : 0;
    $("best-cut").textContent = cut > 0 ? cut + "% cleaner than now" : "about the same as now";
    const saved = Math.max(0, (now - best.f) * kwh); // grams
    $("best-save").textContent =
      saved >= 1000
        ? (saved / 1000).toFixed(2) + " kg"
        : Math.round(saved) + " g";
    $("save-detail").textContent =
      `running ${state.appliance.verb} (${kwh} kWh) then instead of now`;

    // ---- chart ----
    const svg = $("plan-svg");
    svg.replaceChildren();
    const n = vals.length;
    const maxV = Math.max(...vals) * 1.08;
    const x = (i) => PL.l + (i / (n - 1)) * (PL.W - PL.l - PL.r);
    const y = (v) => PL.t + (1 - v / maxV) * (PL.H - PL.t - PL.b);

    // y grid + labels
    for (const gv of [0, Math.round(maxV / 2 / 50) * 50, Math.round(maxV / 50) * 50]) {
      svg.append(
        svgEl("line", { x1: PL.l, y1: y(gv), x2: PL.W - PL.r, y2: y(gv), class: "stat-axis" })
      );
      svg.append(
        svgEl("text", { x: PL.l - 8, y: y(gv) + 4, "text-anchor": "end", class: "stat-tick" }, gv + "")
      );
    }

    // area under the curve, coloured by a mid tone
    let dPath = `M ${x(0)} ${y(0)}`;
    s.forEach((p, i) => (dPath += ` L ${x(i).toFixed(1)} ${y(p.f).toFixed(1)}`));
    dPath += ` L ${x(n - 1)} ${y(0)} Z`;
    svg.append(svgEl("path", { d: dPath, class: "plan-area" }));

    // line
    let line = "";
    s.forEach((p, i) => (line += (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.f).toFixed(1) + " "));
    svg.append(svgEl("path", { d: line, class: "plan-line" }));

    // midnight ticks
    s.forEach((p, i) => {
      if (!isMidnight(p.t)) return;
      svg.append(svgEl("line", { x1: x(i), y1: PL.t, x2: x(i), y2: PL.H - PL.b, class: "hm-grid" }));
      svg.append(
        svgEl("text", { x: x(i), y: PL.H - PL.b + 16, "text-anchor": "middle", class: "hm-tick hm-tick-day" }, fmtDay.format(p.t))
      );
    });

    // cleanest well-separated windows
    const windows = cleanWindows(vals, 4);
    for (const i of windows) {
      svg.append(svgEl("circle", { cx: x(i), cy: y(vals[i]), r: 4, fill: colour(vals[i]), stroke: "#fff", "stroke-width": 1.5 }));
    }
    // best marker
    svg.append(svgEl("circle", { cx: x(bestIdx), cy: y(best.f), r: 6.5, fill: colour(best.f), stroke: "var(--ink)", "stroke-width": 2 }));
    svg.append(svgEl("text", { x: x(bestIdx), y: y(best.f) - 12, "text-anchor": "middle", class: "plan-best-lab" }, "greenest"));
    // now marker
    svg.append(svgEl("line", { x1: x(0), y1: PL.t, x2: x(0), y2: PL.H - PL.b, class: "plan-now" }));
    svg.append(svgEl("text", { x: x(0) + 4, y: PL.t + 10, "text-anchor": "start", class: "hm-tick" }, "now"));

    // ---- list of upcoming green windows ----
    const list = $("green-list");
    list.replaceChildren();
    windows.forEach((i) => {
      const li = document.createElement("li");
      const dot = document.createElement("span");
      dot.className = "green-dot";
      dot.style.background = colour(vals[i]);
      const txt = document.createElement("span");
      txt.textContent = `${fmtFull.format(s[i].t)} — ${vals[i]} g (${s[i].i})`;
      li.append(dot, txt);
      list.append(li);
    });
  }

  /* =========================================================
     CONTROLS + BANNER
     ========================================================= */
  function buildControls() {
    const rsel = $("region-sel");
    // DNO regions first, then a divider label for national
    const dnos = DATA.regions.filter((r) => !AGG.has(r.id));
    const gb = region(GB_ID);
    [...dnos, gb].forEach((r) => {
      const o = document.createElement("option");
      o.value = r.id;
      o.textContent = r.id === GB_ID ? "Great Britain (national)" : r.name;
      if (r.id === state.regionId) o.selected = true;
      rsel.append(o);
    });
    rsel.addEventListener("change", () => {
      state.regionId = +rsel.value;
      renderPlan();
    });

    const asel = $("appliance-sel");
    APPLIANCES.forEach((a) => {
      const o = document.createElement("option");
      o.value = a.key;
      o.textContent = `${a.label} — ${a.kwh} kWh`;
      asel.append(o);
    });
    asel.addEventListener("change", () => {
      state.appliance = APPLIANCES.find((a) => a.key === asel.value);
      renderPlan();
    });
  }

  function banner() {
    const el = $("data-note");
    el.replaceChildren();
    const dot = document.createElement("span");
    dot.className = "live-dot" + (DATA.live ? " on" : "");
    const txt = document.createElement("span");
    const when = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(DATA.generated);
    txt.textContent = DATA.live
      ? `Live forecast, fetched just now. Data begins ${when}.`
      : `Live API unavailable — showing a saved forecast from ${when}.`;
    el.append(dot, txt);
  }

  /* =========================================================
     INIT
     ========================================================= */
  (async function init() {
    try {
      DATA = await load();
    } catch (e) {
      $("data-note").textContent =
        "Could not load carbon-intensity data. Please try again later.";
      return;
    }
    banner();
    renderNow();
    renderHeat();
    buildControls();
    renderPlan();
  })();
})();
