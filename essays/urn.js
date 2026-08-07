/* ============================================================
   How Many Draws Is Enough? — interactive logic
   Three widgets:
     1) Draw from a hidden box: running estimate + reveal funnel
     2) The wobble: distribution of estimates over many runs
     3) The price of precision: draws needed vs margin (log scale)
   No innerHTML anywhere.
   ============================================================ */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const SVGNS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const SQRT2PI = Math.sqrt(2 * Math.PI);
  const normpdf = (x) => Math.exp(-0.5 * x * x) / SQRT2PI;
  const fmtPct = (p) => (p * 100).toFixed(1) + "%";

  /* =========================================================
     WIDGET 1 — draw from a hidden box
     ========================================================= */
  const urnSvg = $("urn-svg");
  const U = { W: 680, H: 260, l: 44, r: 14, t: 12, b: 26 };
  const STRIP_MAX = 40;
  let urnP = 0;           // hidden true proportion of black
  let urnBlack = 0;
  let urnTotal = 0;
  let urnPath = [];       // running estimate after each draw
  let urnRevealed = false;

  function urnNewBox() {
    urnP = 0.08 + Math.random() * 0.84;
    urnBlack = 0;
    urnTotal = 0;
    urnPath = [];
    urnRevealed = false;
    $("urn-strip").replaceChildren();
    $("urn-truth").textContent = "?";
    $("urn-truth-sub").textContent = "hidden — reveal when ready";
    $("urn-reveal").textContent = "Reveal the truth";
    urnUpdate();
    drawUrn();
  }

  function urnDraw(k) {
    const strip = $("urn-strip");
    for (let j = 0; j < k; j++) {
      const black = Math.random() < urnP;
      if (black) urnBlack++;
      urnTotal++;
      urnPath.push(urnBlack / urnTotal);
      const dot = document.createElement("span");
      dot.className = "urn-ball " + (black ? "urn-ball-b" : "urn-ball-w");
      strip.append(dot);
    }
    while (strip.children.length > STRIP_MAX) strip.removeChild(strip.firstChild);
    urnUpdate();
    drawUrn();
  }

  function urnUpdate() {
    $("urn-est").textContent = urnTotal ? fmtPct(urnBlack / urnTotal) : "–";
    $("urn-frac").textContent = `${urnBlack.toLocaleString("en-GB")} black / ${urnTotal.toLocaleString("en-GB")} draws`;
  }

  function drawUrn() {
    urnSvg.replaceChildren();
    const plotH = U.H - U.t - U.b;
    const y0 = U.H - U.b;
    const xMax = Math.max(50, Math.ceil(urnTotal / 50) * 50);
    const uX = (n) => U.l + (n / xMax) * (U.W - U.l - U.r);
    const uY = (p) => y0 - p * plotH;

    // y grid + ticks (0..100%)
    [0, 0.25, 0.5, 0.75, 1].forEach((p) => {
      urnSvg.append(svgEl("line", { x1: U.l, y1: uY(p), x2: U.W - U.r, y2: uY(p), class: "urn-grid" }));
      const tx = svgEl("text", { x: U.l - 6, y: uY(p) + 3, class: "stat-tick", "text-anchor": "end" });
      tx.textContent = (p * 100).toFixed(0) + "%";
      urnSvg.append(tx);
    });
    // x axis + ticks
    urnSvg.append(svgEl("line", { x1: U.l, y1: y0, x2: U.W - U.r, y2: y0, class: "stat-axis" }));
    [xMax / 2, xMax].forEach((v) => {
      const tx = svgEl("text", { x: uX(v), y: y0 + 16, class: "stat-tick", "text-anchor": "middle" });
      tx.textContent = v.toLocaleString("en-GB") + (v === xMax ? " draws" : "");
      urnSvg.append(tx);
    });

    if (urnRevealed) {
      // funnel: truth ± 1.96 SE(k), clamped to [0,1]
      const top = [], bot = [];
      const kMax = Math.max(urnTotal, xMax);
      for (let px = 0; px <= 160; px++) {
        const k = Math.max(1, (px / 160) * kMax);
        const se = Math.sqrt((urnP * (1 - urnP)) / k);
        top.push(`${uX(k).toFixed(1)},${uY(clamp(urnP + 1.96 * se, 0, 1)).toFixed(1)}`);
        bot.push(`${uX(k).toFixed(1)},${uY(clamp(urnP - 1.96 * se, 0, 1)).toFixed(1)}`);
      }
      urnSvg.append(svgEl("polygon", { points: top.concat(bot.reverse()).join(" "), class: "urn-funnel" }));
      urnSvg.append(svgEl("line", { x1: U.l, y1: uY(urnP), x2: U.W - U.r, y2: uY(urnP), class: "mu-line" }));
    }

    // running estimate path
    if (urnTotal) {
      const pts = urnPath.map((p, i) => `${uX(i + 1).toFixed(1)},${uY(p).toFixed(1)}`);
      urnSvg.append(svgEl("polyline", { points: pts.join(" "), class: "urn-path" }));
      const last = urnPath[urnPath.length - 1];
      urnSvg.append(svgEl("circle", { cx: uX(urnTotal), cy: uY(last), r: 3, class: "urn-dot" }));
    }
  }

  if (urnSvg) {
    $("urn-draw1").addEventListener("click", () => urnDraw(1));
    $("urn-draw100").addEventListener("click", () => urnDraw(100));
    $("urn-new").addEventListener("click", urnNewBox);
    $("urn-reveal").addEventListener("click", () => {
      urnRevealed = true;
      $("urn-truth").textContent = fmtPct(urnP);
      $("urn-truth-sub").textContent = "black balls, truly";
      $("urn-reveal").textContent = "Truth revealed";
      drawUrn();
    });
    urnNewBox();
  }

  /* =========================================================
     WIDGET 2 — the wobble: many repeated experiments
     ========================================================= */
  const wobSvg = $("wob-svg");
  const WB = { W: 680, H: 240, l: 16, r: 16, t: 14, b: 26 };
  const WBINS = 50;
  const wBinW = 1 / WBINS;
  let wobP = 0.5;
  let wobN = 50;
  let wobCounts = new Array(WBINS).fill(0);
  let wobTotal = 0;

  const wobX = (p) => WB.l + p * (WB.W - WB.l - WB.r);
  const wobSE = () => Math.sqrt((wobP * (1 - wobP)) / wobN);

  function wobExperiment() {
    let black = 0;
    for (let i = 0; i < wobN; i++) if (Math.random() < wobP) black++;
    return black / wobN;
  }

  function drawWob() {
    wobSvg.replaceChildren();
    const se = wobSE();
    const plotH = WB.H - WB.t - WB.b;
    const y0 = WB.H - WB.b;

    const theoPeak = normpdf(0) / se;
    let barPeak = 0;
    for (let i = 0; i < WBINS; i++) {
      const dens = wobTotal ? wobCounts[i] / (wobTotal * wBinW) : 0;
      if (dens > barPeak) barPeak = dens;
    }
    const yMax = Math.max(theoPeak, barPeak) * 1.12 || 1;
    const yS = (d) => (d / yMax) * plotH;

    // histogram of estimates
    for (let i = 0; i < WBINS; i++) {
      if (!wobCounts[i]) continue;
      const dens = wobCounts[i] / (wobTotal * wBinW);
      wobSvg.append(svgEl("rect", {
        x: wobX(i * wBinW) + 0.5, y: y0 - yS(dens),
        width: (WB.W - WB.l - WB.r) / WBINS - 1, height: yS(dens),
        class: "hbar",
      }));
    }

    // theoretical curve N(p, se)
    const pts = [];
    for (let px = 0; px <= 200; px++) {
      const xv = px / 200;
      const d = normpdf((xv - wobP) / se) / se;
      pts.push(`${wobX(xv).toFixed(1)},${(y0 - yS(d)).toFixed(1)}`);
    }
    wobSvg.append(svgEl("polyline", { points: pts.join(" "), class: "theory-curve" }));

    // true proportion line + axis
    wobSvg.append(svgEl("line", { x1: wobX(wobP), y1: WB.t - 4, x2: wobX(wobP), y2: y0, class: "mu-line" }));
    wobSvg.append(svgEl("line", { x1: WB.l, y1: y0, x2: WB.W - WB.r, y2: y0, class: "stat-axis" }));
    [0, 0.25, 0.5, 0.75, 1].forEach((v) => {
      const tx = svgEl("text", { x: wobX(v), y: y0 + 16, class: "stat-tick", "text-anchor": "middle" });
      tx.textContent = (v * 100).toFixed(0) + "%";
      wobSvg.append(tx);
    });
  }

  function wobUpdate() {
    $("wob-n-val").textContent = wobN;
    $("wob-se").textContent = (wobSE() * 100).toFixed(1);
    $("wob-count").textContent = wobTotal.toLocaleString("en-GB");
  }
  function wobClear() {
    wobCounts = new Array(WBINS).fill(0);
    wobTotal = 0;
    wobUpdate();
    drawWob();
  }
  function wobRun(k) {
    for (let j = 0; j < k; j++) {
      const est = wobExperiment();
      const bin = Math.min(WBINS - 1, Math.floor(est / wBinW));
      wobCounts[bin]++;
      wobTotal++;
    }
    wobUpdate();
    drawWob();
  }

  if (wobSvg) {
    document.querySelectorAll(".pp").forEach((btn) => {
      btn.addEventListener("click", () => {
        wobP = parseFloat(btn.dataset.p);
        document.querySelectorAll(".pp").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        wobClear();
      });
    });
    $("wob-n").addEventListener("input", (e) => {
      wobN = parseInt(e.target.value, 10);
      wobClear();
    });
    $("wob-run1").addEventListener("click", () => wobRun(1));
    $("wob-run1k").addEventListener("click", () => wobRun(1000));
    $("wob-reset").addEventListener("click", wobClear);
    wobClear();
  }

  /* =========================================================
     WIDGET 3 — the price of precision
     ========================================================= */
  const costSvg = $("cost-svg");
  const C = { W: 680, H: 260, l: 60, r: 14, t: 12, b: 28 };
  const M_DOM = [0.5, 10];        // margin in points
  const N_DOM = [10, 200000];     // draws, log scale
  let costZ = 1.96;
  let costM = 3;

  const needN = (z, m, pq) => (z * z * pq) / ((m / 100) * (m / 100));
  const cX = (m) => C.l + ((m - M_DOM[0]) / (M_DOM[1] - M_DOM[0])) * (C.W - C.l - C.r);
  const cY = (n) => {
    const f = (Math.log10(n) - Math.log10(N_DOM[0])) / (Math.log10(N_DOM[1]) - Math.log10(N_DOM[0]));
    return C.H - C.b - f * (C.H - C.t - C.b);
  };

  function drawCost() {
    costSvg.replaceChildren();
    const y0 = C.H - C.b;

    // log gridlines: 10, 100, 1k, 10k, 100k
    [10, 100, 1000, 10000, 100000].forEach((n) => {
      costSvg.append(svgEl("line", { x1: C.l, y1: cY(n), x2: C.W - C.r, y2: cY(n), class: "urn-grid" }));
      const tx = svgEl("text", { x: C.l - 6, y: cY(n) + 3, class: "stat-tick", "text-anchor": "end" });
      tx.textContent = n.toLocaleString("en-GB");
      costSvg.append(tx);
    });
    // x axis + ticks
    costSvg.append(svgEl("line", { x1: C.l, y1: y0, x2: C.W - C.r, y2: y0, class: "stat-axis" }));
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach((m) => {
      const tx = svgEl("text", { x: cX(m), y: y0 + 17, class: "stat-tick", "text-anchor": "middle" });
      tx.textContent = "±" + m;
      costSvg.append(tx);
    });

    // cost curve, worst case p = 0.5
    const pts = [];
    for (let px = 0; px <= 200; px++) {
      const m = M_DOM[0] + (px / 200) * (M_DOM[1] - M_DOM[0]);
      pts.push(`${cX(m).toFixed(1)},${cY(needN(costZ, m, 0.25)).toFixed(1)}`);
    }
    costSvg.append(svgEl("polyline", { points: pts.join(" "), class: "urn-path" }));

    // marker at the current margin
    const n = needN(costZ, costM, 0.25);
    costSvg.append(svgEl("line", { x1: cX(costM), y1: cY(n), x2: cX(costM), y2: y0, class: "urn-marker" }));
    costSvg.append(svgEl("circle", { cx: cX(costM), cy: cY(n), r: 4.5, class: "urn-dot" }));
  }

  function costUpdate() {
    const fmt = (n) => Math.ceil(n).toLocaleString("en-GB");
    $("cost-m-val").textContent = String(costM);
    $("cost-n").textContent = fmt(needN(costZ, costM, 0.25));
    $("cost-n-lop").textContent = fmt(needN(costZ, costM, 0.09));
    drawCost();
  }

  if (costSvg) {
    document.querySelectorAll(".zc").forEach((btn) => {
      btn.addEventListener("click", () => {
        costZ = parseFloat(btn.dataset.z);
        document.querySelectorAll(".zc").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        costUpdate();
      });
    });
    $("cost-m").addEventListener("input", (e) => {
      costM = parseFloat(e.target.value);
      costUpdate();
    });
    costUpdate();
  }

  /* ---------------------------------------------------------
     Scroll reveal (shared behaviour with the sibling essays)
     --------------------------------------------------------- */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting || e.boundingClientRect.top < window.innerHeight) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -6% 0px" }
    );
    document.querySelectorAll(".prose > *, .widget").forEach((n, i) => {
      n.classList.add("reveal");
      n.style.setProperty("--d", `${(i % 6) * 40}ms`);
      io.observe(n);
    });
    const sweep = () => {
      const vh = window.innerHeight;
      document.querySelectorAll(".reveal:not(.in)").forEach((n) => {
        if (n.getBoundingClientRect().top < vh * 0.94) n.classList.add("in");
      });
    };
    window.addEventListener("scroll", sweep, { passive: true });
    window.addEventListener("load", () => setTimeout(sweep, 300));
    sweep();
  }
})();
