/* ============================================================
   Signal or Noise? — interactive logic for the ANOVA essay
   Three widgets:
     1) Many pairwise t-tests inflate false positives
     2) Between-group signal against within-group noise (F)
     3) The F-distribution and its 5% critical value
   Shares a small numeric library (log-gamma, incomplete beta,
   the t and F distributions). No innerHTML anywhere.
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

  /* ---------- numeric library ---------- */
  function logGamma(z) {
    const c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    z -= 1;
    let x = c[0];
    for (let i = 1; i < 9; i++) x += c[i] / (z + i);
    const t = z + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  function betacf(x, a, b) {
    const MAXIT = 200, EPS = 3e-12, FPMIN = 1e-300;
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - (qab * x) / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m;
      let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  function ibeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const front = Math.exp(
      logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
    );
    if (x < (a + 1) / (a + b + 2)) return (front * betacf(x, a, b)) / a;
    return 1 - (front * betacf(1 - x, b, a)) / b;
  }
  // two-tailed p from |t|
  function tSF2(t, df) {
    const x = df / (df + t * t);
    return ibeta(x, df / 2, 0.5); // = 2 * P(T > |t|)
  }
  function fcdf(x, d1, d2) {
    if (x <= 0) return 0;
    return ibeta((d1 * x) / (d1 * x + d2), d1 / 2, d2 / 2);
  }
  function fppf(p, d1, d2) {
    let lo = 0, hi = 2000;
    for (let i = 0; i < 100; i++) {
      const m = (lo + hi) / 2;
      if (fcdf(m, d1, d2) < p) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  }
  function fpdf(x, d1, d2) {
    if (x <= 0) return 0;
    const lb = logGamma((d1 + d2) / 2) - logGamma(d1 / 2) - logGamma(d2 / 2);
    const lf = lb + (d1 / 2) * Math.log(d1 / d2) + (d1 / 2 - 1) * Math.log(x)
      - ((d1 + d2) / 2) * Math.log(1 + (d1 * x) / d2);
    return Math.exp(lf);
  }

  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  // seeded generator for the reproducible sandbox
  const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  function seededZ(seed, count) {
    const r = mulberry32(seed);
    const out = [];
    for (let i = 0; i < count; i++) {
      let u = 0, v = 0;
      while (u === 0) u = r();
      while (v === 0) v = r();
      out.push(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
    }
    return out;
  }

  /* pooled two-sample t-test p-value */
  function ttestP(a, b) {
    const n1 = a.length, n2 = b.length;
    const m1 = a.reduce((s, x) => s + x, 0) / n1;
    const m2 = b.reduce((s, x) => s + x, 0) / n2;
    let s1 = 0, s2 = 0;
    for (const x of a) s1 += (x - m1) * (x - m1);
    for (const x of b) s2 += (x - m2) * (x - m2);
    const df = n1 + n2 - 2;
    const sp2 = (s1 + s2) / df;
    const se = Math.sqrt(sp2 * (1 / n1 + 1 / n2));
    if (se === 0) return 1;
    const t = (m1 - m2) / se;
    return tSF2(Math.abs(t), df);
  }

  /* =========================================================
     WIDGET 1 — many pairwise tests, all groups identical
     ========================================================= */
  const mcSvg = $("mc-svg");
  const MC = { W: 680, H: 240 };
  const MC_N = 8;        // measurements per group
  let mcK = 6;
  let mcRunsWithFP = 0, mcRuns = 0;
  let mcLast = [];       // last experiment's significant pairs [i,j]

  function mcDrawExperiment() {
    // draw k identical groups, test every pair, return list of significant pairs
    const groups = [];
    for (let g = 0; g < mcK; g++) {
      const arr = [];
      for (let i = 0; i < MC_N; i++) arr.push(50 + 10 * randn());
      groups.push(arr);
    }
    const sig = [];
    for (let i = 0; i < mcK; i++)
      for (let j = i + 1; j < mcK; j++)
        if (ttestP(groups[i], groups[j]) < 0.05) sig.push([i, j]);
    return sig;
  }

  function mcRenderGrid() {
    mcSvg.replaceChildren();
    const cell = Math.min(30, (MC.H - 30) / mcK, (MC.W - 60) / mcK);
    const gx = (MC.W - cell * mcK) / 2 + 10;
    const gy = 16;
    const sigSet = new Set(mcLast.map(([i, j]) => i + "," + j));
    for (let i = 0; i < mcK; i++) {
      for (let j = 0; j < mcK; j++) {
        if (j <= i) continue; // upper triangle of pairs
        const x = gx + j * cell, y = gy + i * cell;
        const on = sigSet.has(i + "," + j);
        mcSvg.append(svgEl("rect", {
          x: x + 1.5, y: y + 1.5, width: cell - 3, height: cell - 3, rx: 3,
          class: "mc-cell " + (on ? "mc-fp" : "mc-ok"),
        }));
      }
    }
  }

  function mcUpdate() {
    $("mc-k-val").textContent = mcK;
    const pairs = (mcK * (mcK - 1)) / 2;
    $("mc-pairs").textContent = pairs;
    $("mc-fwe").textContent = mcRuns ? ((mcRunsWithFP / mcRuns) * 100).toFixed(0) + "%" : "–";
    $("mc-fwe-frac").textContent = `${mcRunsWithFP} / ${mcRuns}`;
  }
  function mcReset() {
    mcRunsWithFP = 0; mcRuns = 0; mcLast = [];
    mcUpdate();
    mcRenderGrid();
  }
  function mcRun(times) {
    for (let t = 0; t < times; t++) {
      const sig = mcDrawExperiment();
      mcLast = sig;
      mcRuns++;
      if (sig.length) mcRunsWithFP++;
    }
    mcUpdate();
    mcRenderGrid();
  }

  if (mcSvg) {
    $("mc-k").addEventListener("input", (e) => { mcK = parseInt(e.target.value, 10); mcReset(); });
    $("mc-run").addEventListener("click", () => mcRun(100));
    $("mc-reset").addEventListener("click", mcReset);
    mcReset();
  }

  /* =========================================================
     WIDGET 2 — signal vs noise sandbox
     Fixed seeded shape; sliders scale gap and within-scatter.
     ========================================================= */
  const avSvg = $("av-svg");
  const AV = { W: 680, H: 260, l: 20, r: 20, t: 16, b: 26 };
  const K = 3, NG = 14;
  const MU = 50;
  const OFFS = [-1, 0, 1];
  const GCOL = ["var(--a)", "var(--B)", "var(--A)"];
  // one fixed cloud of standardised points per group, and a fixed jitter
  const baseZ = OFFS.map((_, g) => seededZ(1000 + g * 97, NG));
  const jit = OFFS.map((_, g) => seededZ(4000 + g * 53, NG).map((z) => clamp(z, -1.6, 1.6)));
  let avSep = 8, avNoise = 5;

  function avCompute() {
    const groups = OFFS.map((off, g) => baseZ[g].map((z) => MU + avSep * off + avNoise * z));
    const gMeans = groups.map((a) => a.reduce((s, x) => s + x, 0) / NG);
    const grand = gMeans.reduce((s, x) => s + x, 0) / K;
    let ssB = 0, ssW = 0;
    for (let g = 0; g < K; g++) {
      ssB += NG * (gMeans[g] - grand) ** 2;
      for (const x of groups[g]) ssW += (x - gMeans[g]) ** 2;
    }
    const dfB = K - 1, dfW = K * NG - K;
    const msB = ssB / dfB, msW = ssW / dfW;
    const F = msW > 0 ? msB / msW : 0;
    const p = 1 - fcdf(F, dfB, dfW);
    return { groups, gMeans, grand, msB, msW, F, p, dfB, dfW };
  }

  function avRender() {
    const st = avCompute();
    avSvg.replaceChildren();
    const plotH = AV.H - AV.t - AV.b;
    const y0 = AV.H - AV.b;
    // adaptive y-domain
    const half = avSep + avNoise * 2.4 + 5;
    const dom = [MU - half, MU + half];
    const yOf = (v) => y0 - ((v - dom[0]) / (dom[1] - dom[0])) * plotH;
    const colW = (AV.W - AV.l - AV.r) / K;

    // grand mean line
    const gmY = yOf(st.grand);
    avSvg.append(svgEl("line", { x1: AV.l, y1: gmY, x2: AV.W - AV.r, y2: gmY, class: "grand-line" }));
    const gt = svgEl("text", { x: AV.W - AV.r, y: gmY - 6, class: "stat-tick", "text-anchor": "end" });
    gt.textContent = "grand mean";
    avSvg.append(gt);

    for (let g = 0; g < K; g++) {
      const cx = AV.l + colW * (g + 0.5);
      // points
      st.groups[g].forEach((v, i) => {
        avSvg.append(svgEl("circle", {
          cx: cx + jit[g][i] * (colW * 0.28), cy: yOf(clamp(v, dom[0], dom[1])), r: 4,
          class: "av-dot", style: `fill:${GCOL[g]}`,
        }));
      });
      // group mean bar
      const my = yOf(st.gMeans[g]);
      avSvg.append(svgEl("line", {
        x1: cx - colW * 0.34, y1: my, x2: cx + colW * 0.34, y2: my,
        class: "av-mean", style: `stroke:${GCOL[g]}`,
      }));
      const lab = svgEl("text", { x: cx, y: y0 + 16, class: "stat-tick", "text-anchor": "middle" });
      lab.textContent = "Group " + String.fromCharCode(65 + g);
      avSvg.append(lab);
    }
    return st;
  }

  function avUpdate() {
    const st = avRender();
    const maxMS = Math.max(st.msB, st.msW, 1);
    $("bar-msb").style.width = clamp((st.msB / maxMS) * 100, 0, 100) + "%";
    $("bar-msw").style.width = clamp((st.msW / maxMS) * 100, 0, 100) + "%";
    $("av-msb").textContent = st.msB.toFixed(1);
    $("av-msw").textContent = st.msW.toFixed(1);
    $("av-f").textContent = st.F.toFixed(2);
    const v = $("av-verdict");
    if (st.p < 0.05) {
      v.textContent = `p = ${st.p < 0.001 ? "<0.001" : st.p.toFixed(3)} · the gaps stand out from the noise`;
      v.className = "f-verdict verdict-signal";
    } else {
      v.textContent = `p = ${st.p.toFixed(3)} · the gaps are lost in the noise`;
      v.className = "f-verdict verdict-noise";
    }
  }

  if (avSvg) {
    $("av-sep").addEventListener("input", (e) => { avSep = parseFloat(e.target.value); avUpdate(); });
    $("av-noise").addEventListener("input", (e) => { avNoise = parseFloat(e.target.value); avUpdate(); });
    avUpdate();
  }

  /* =========================================================
     WIDGET 3 — the F-distribution and its 5% critical value
     ========================================================= */
  const fdSvg = $("fd-svg");
  const FD = { W: 680, H: 250, l: 16, r: 16, t: 14, b: 26 };
  let fdK = 3, fdN = 12;

  function fdRender() {
    const d1 = fdK - 1;
    const d2 = fdK * fdN - fdK;
    const crit = fppf(0.95, d1, d2);
    const xMax = Math.max(5, crit * 1.7);
    const fx = (x) => FD.l + (x / xMax) * (FD.W - FD.l - FD.r);
    const plotH = FD.H - FD.t - FD.b;
    const y0 = FD.H - FD.b;

    // sample the pdf, find peak for scaling
    const N = 240;
    const xs = [], ys = [];
    let yMax = 0;
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * xMax;
      const y = fpdf(x, d1, d2);
      xs.push(x); ys.push(y);
      if (isFinite(y) && y > yMax) yMax = y;
    }
    yMax = yMax * 1.12 || 1;
    const yOf = (y) => y0 - (Math.min(y, yMax) / yMax) * plotH;

    fdSvg.replaceChildren();

    // shaded 5% tail (x >= crit)
    const tail = [`${fx(crit).toFixed(1)},${y0.toFixed(1)}`];
    for (let i = 0; i <= N; i++) {
      if (xs[i] >= crit) tail.push(`${fx(xs[i]).toFixed(1)},${yOf(ys[i]).toFixed(1)}`);
    }
    tail.push(`${fx(xMax).toFixed(1)},${y0.toFixed(1)}`);
    fdSvg.append(svgEl("polygon", { points: tail.join(" "), class: "fd-tail" }));

    // full curve
    const curve = xs.map((x, i) => `${fx(x).toFixed(1)},${yOf(ys[i]).toFixed(1)}`).join(" ");
    fdSvg.append(svgEl("polyline", { points: curve, class: "fd-curve" }));

    // axis + critical marker
    fdSvg.append(svgEl("line", { x1: FD.l, y1: y0, x2: FD.W - FD.r, y2: y0, class: "stat-axis" }));
    for (let t = 0; t <= Math.floor(xMax); t++) {
      const tx = svgEl("text", { x: fx(t), y: y0 + 16, class: "stat-tick", "text-anchor": "middle" });
      tx.textContent = String(t);
      fdSvg.append(tx);
    }
    fdSvg.append(svgEl("line", { x1: fx(crit), y1: yOf(fpdf(crit, d1, d2)), x2: fx(crit), y2: y0, class: "fd-crit" }));
    const ct = svgEl("text", { x: fx(crit), y: FD.t + 4, class: "fd-crit-lab", "text-anchor": "middle" });
    ct.textContent = "F* = " + crit.toFixed(2);
    fdSvg.append(ct);

    $("fd-k-val").textContent = fdK;
    $("fd-n-val").textContent = fdN;
    $("fd-df").textContent = `${d1}, ${d2}`;
    $("fd-crit").textContent = crit.toFixed(2);
  }

  if (fdSvg) {
    $("fd-k").addEventListener("input", (e) => { fdK = parseInt(e.target.value, 10); fdRender(); });
    $("fd-n").addEventListener("input", (e) => { fdN = parseInt(e.target.value, 10); fdRender(); });
    fdRender();
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
