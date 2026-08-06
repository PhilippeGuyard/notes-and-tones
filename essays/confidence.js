/* ============================================================
   What "95% Confident" Really Means — interactive logic
   Three widgets:
     1) Sampling distribution / central limit theorem
     2) The dance of the confidence intervals (coverage)
     3) The t-distribution against the normal
   A small numeric library (log-gamma, incomplete beta, the t
   CDF and its inverse) lets us draw real t-curves and pick
   real critical values in the browser. No innerHTML anywhere.
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
  const SQRT2PI = Math.sqrt(2 * Math.PI);

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
    const t = z + 7 + 0.5;
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

  // regularised incomplete beta I_x(a,b)
  function ibeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const front = Math.exp(
      logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
    );
    if (x < (a + 1) / (a + b + 2)) return (front * betacf(x, a, b)) / a;
    return 1 - (front * betacf(1 - x, b, a)) / b;
  }

  function tcdf(t, df) {
    const x = df / (df + t * t);
    const ib = 0.5 * ibeta(x, df / 2, 0.5);
    return t > 0 ? 1 - ib : ib;
  }

  // inverse t CDF by bisection (plenty accurate for our purposes)
  function tppf(p, df) {
    let lo = -300, hi = 300;
    for (let i = 0; i < 120; i++) {
      const mid = (lo + hi) / 2;
      if (tcdf(mid, df) < p) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  function tpdf(x, df) {
    const lg = logGamma((df + 1) / 2) - logGamma(df / 2);
    return Math.exp(lg - 0.5 * Math.log(df * Math.PI) - ((df + 1) / 2) * Math.log(1 + (x * x) / df));
  }

  const normpdf = (x) => Math.exp(-0.5 * x * x) / SQRT2PI;

  // standard normal deviate (Box-Muller)
  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* population: mean MU, sd SIGMA, three shapes, all sd = SIGMA */
  const MU = 50, SIGMA = 10;
  const samplers = {
    normal: () => MU + SIGMA * randn(),
    // right-skewed: exp(1) has mean 1, sd 1 -> shift & scale to MU, SIGMA
    skewed: () => MU + SIGMA * (-Math.log(Math.random()) - 1),
    // two humps at MU ± 0.9σ with noise sd 0.436σ -> total sd = σ
    bimodal: () => (Math.random() < 0.5 ? MU - 0.9 * SIGMA : MU + 0.9 * SIGMA) + 0.436 * SIGMA * randn(),
  };
  // population density for the pale overlay in widget 1
  function popPdf(shape, x) {
    if (shape === "normal") return normpdf((x - MU) / SIGMA) / SIGMA;
    if (shape === "skewed") {
      const z = (x - MU) / SIGMA + 1; // exp variable
      return z > 0 ? Math.exp(-z) / SIGMA : 0;
    }
    // bimodal: mixture of two normals sd 0.436σ
    const s = 0.436 * SIGMA;
    return 0.5 * (normpdf((x - (MU - 0.9 * SIGMA)) / s) + normpdf((x - (MU + 0.9 * SIGMA)) / s)) / s;
  }

  function sampleMean(shape, n) {
    let s = 0;
    const f = samplers[shape];
    for (let i = 0; i < n; i++) s += f();
    return s / n;
  }
  function sampleMeanSd(shape, n) {
    const f = samplers[shape];
    let s = 0;
    const xs = new Array(n);
    for (let i = 0; i < n; i++) { xs[i] = f(); s += xs[i]; }
    const m = s / n;
    let ss = 0;
    for (let i = 0; i < n; i++) ss += (xs[i] - m) * (xs[i] - m);
    return [m, Math.sqrt(ss / (n - 1))];
  }

  /* =========================================================
     WIDGET 1 — sampling distribution / CLT
     ========================================================= */
  const cltSvg = $("clt-svg");
  const CLT = { W: 680, H: 240, l: 16, r: 16, t: 14, b: 26 };
  const DOM = [20, 80];          // x domain (MU ± 3σ)
  const BINS = 60;
  const binW = (DOM[1] - DOM[0]) / BINS;
  let cltShape = "normal";
  let cltN = 5;
  let cltCounts = new Array(BINS).fill(0);
  let cltTotal = 0;

  const cltX = (v) => CLT.l + ((v - DOM[0]) / (DOM[1] - DOM[0])) * (CLT.W - CLT.l - CLT.r);

  function cltSE() { return SIGMA / Math.sqrt(cltN); }

  function drawClt() {
    cltSvg.replaceChildren();
    const se = cltSE();
    const plotH = CLT.H - CLT.t - CLT.b;
    const y0 = CLT.H - CLT.b;

    // peak density to scale against: theoretical sampling-dist peak, or tallest bar
    const theoPeak = 1 / (se * SQRT2PI);
    let barPeak = 0;
    for (let i = 0; i < BINS; i++) {
      const dens = cltTotal ? cltCounts[i] / (cltTotal * binW) : 0;
      if (dens > barPeak) barPeak = dens;
    }
    const yMax = Math.max(theoPeak, barPeak) * 1.12 || 1;
    const yScale = (d) => (d / yMax) * plotH;

    // pale population curve
    const popPts = [];
    for (let px = 0; px <= 120; px++) {
      const xv = DOM[0] + (px / 120) * (DOM[1] - DOM[0]);
      popPts.push(`${cltX(xv).toFixed(1)},${(y0 - yScale(popPdf(cltShape, xv))).toFixed(1)}`);
    }
    cltSvg.append(svgEl("polyline", { points: popPts.join(" "), class: "pop-curve" }));

    // histogram bars of sample means
    for (let i = 0; i < BINS; i++) {
      if (!cltCounts[i]) continue;
      const dens = cltCounts[i] / (cltTotal * binW);
      const h = yScale(dens);
      const x = cltX(DOM[0] + i * binW);
      cltSvg.append(svgEl("rect", {
        x: x + 0.5, y: y0 - h, width: (CLT.W - CLT.l - CLT.r) / BINS - 1, height: Math.max(h, 0),
        class: "hbar",
      }));
    }

    // theoretical sampling distribution N(MU, se)
    const theoPts = [];
    for (let px = 0; px <= 160; px++) {
      const xv = DOM[0] + (px / 160) * (DOM[1] - DOM[0]);
      const d = normpdf((xv - MU) / se) / se;
      theoPts.push(`${cltX(xv).toFixed(1)},${(y0 - yScale(d)).toFixed(1)}`);
    }
    cltSvg.append(svgEl("polyline", { points: theoPts.join(" "), class: "theory-curve" }));

    // true mean line
    cltSvg.append(svgEl("line", { x1: cltX(MU), y1: CLT.t - 4, x2: cltX(MU), y2: y0, class: "mu-line" }));
    // axis
    cltSvg.append(svgEl("line", { x1: CLT.l, y1: y0, x2: CLT.W - CLT.r, y2: y0, class: "stat-axis" }));
    [30, 40, 50, 60, 70].forEach((v) => {
      const tx = svgEl("text", { x: cltX(v), y: y0 + 16, class: "stat-tick", "text-anchor": "middle" });
      tx.textContent = String(v);
      cltSvg.append(tx);
    });
  }

  function cltUpdateVals() {
    $("clt-n-val").textContent = cltN;
    $("clt-se").textContent = cltSE().toFixed(2);
    $("clt-count").textContent = cltTotal.toLocaleString("en-GB");
  }
  function cltClear() {
    cltCounts = new Array(BINS).fill(0);
    cltTotal = 0;
    cltUpdateVals();
    drawClt();
  }
  function cltAdd(k) {
    for (let j = 0; j < k; j++) {
      const m = sampleMean(cltShape, cltN);
      const bin = Math.floor((m - DOM[0]) / binW);
      if (bin >= 0 && bin < BINS) cltCounts[bin]++;
      cltTotal++;
    }
    cltUpdateVals();
    drawClt();
  }

  if (cltSvg) {
    document.querySelectorAll(".pop").forEach((btn) => {
      btn.addEventListener("click", () => {
        cltShape = btn.dataset.pop;
        document.querySelectorAll(".pop").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        cltClear();
      });
    });
    $("clt-n").addEventListener("input", (e) => {
      cltN = parseInt(e.target.value, 10);
      cltClear();
    });
    $("clt-draw1").addEventListener("click", () => cltAdd(1));
    $("clt-draw1k").addEventListener("click", () => cltAdd(1000));
    $("clt-reset").addEventListener("click", cltClear);
    cltUpdateVals();
    drawClt();
  }

  /* =========================================================
     WIDGET 2 — the dance of the confidence intervals
     ========================================================= */
  const ciSvg = $("ci-svg");
  const CI = { W: 680, H: 300, l: 42, r: 12, t: 12, b: 16 };
  const CI_MAX = 192;
  let ciCL = 95;
  let ciN = 30;
  let ciCrit = 1.96;
  let ciList = [];   // {mean, lo, hi, cover}
  let ciCover = 0;

  function ciSetCrit() {
    const p = 1 - (1 - ciCL / 100) / 2;   // e.g. 0.975 for 95%
    ciCrit = tppf(p, ciN - 1);
  }
  function ciYRange() {
    const half = 4.4 * (SIGMA / Math.sqrt(ciN));
    return [MU - half, MU + half];
  }
  const ciY = (v, dom, y0, h) => y0 - ((v - dom[0]) / (dom[1] - dom[0])) * h;

  function drawCi() {
    ciSvg.replaceChildren();
    const dom = ciYRange();
    const plotH = CI.H - CI.t - CI.b;
    const y0 = CI.H - CI.b;
    const n = Math.max(ciList.length, 1);
    const xAt = (i) => CI.l + ((i + 0.5) / Math.max(n, 24)) * (CI.W - CI.l - CI.r);

    // y ticks
    [dom[0], MU, dom[1]].forEach((v) => {
      const y = ciY(v, dom, y0, plotH);
      const tx = svgEl("text", { x: CI.l - 6, y: y + 3, class: "stat-tick", "text-anchor": "end" });
      tx.textContent = v === MU ? "μ=" + MU : v.toFixed(0);
      ciSvg.append(tx);
    });

    // true mean line
    const muY = ciY(MU, dom, y0, plotH);
    ciSvg.append(svgEl("line", { x1: CI.l, y1: muY, x2: CI.W - CI.r, y2: muY, class: "ci-mu" }));

    // intervals
    ciList.forEach((iv, i) => {
      const x = xAt(i);
      ciSvg.append(svgEl("line", {
        x1: x, y1: ciY(clamp(iv.lo, dom[0], dom[1]), dom, y0, plotH),
        x2: x, y2: ciY(clamp(iv.hi, dom[0], dom[1]), dom, y0, plotH),
        class: "ci " + (iv.cover ? "ci-cover" : "ci-miss"),
      }));
      ciSvg.append(svgEl("circle", {
        cx: x, cy: ciY(clamp(iv.mean, dom[0], dom[1]), dom, y0, plotH), r: 1.6,
        class: "ci-dot " + (iv.cover ? "ci-cover" : "ci-miss"),
      }));
    });
  }

  function ciUpdate() {
    const t = ciList.length;
    $("ci-cover-pct").textContent = t ? ((ciCover / t) * 100).toFixed(1) + "%" : "–";
    $("ci-cover-frac").textContent = `${ciCover} / ${t}`;
    $("ci-target").textContent = ciCL + "%";
  }
  function ciClear() {
    ciList = [];
    ciCover = 0;
    ciSetCrit();
    ciUpdate();
    drawCi();
  }
  function ciRun(k) {
    if (ciList.length + k > CI_MAX) ciClear();
    for (let j = 0; j < k; j++) {
      const [m, s] = sampleMeanSd("normal", ciN);
      const se = s / Math.sqrt(ciN);
      const lo = m - ciCrit * se, hi = m + ciCrit * se;
      const cover = lo <= MU && MU <= hi;
      if (cover) ciCover++;
      ciList.push({ mean: m, lo, hi, cover });
    }
    ciUpdate();
    drawCi();
  }

  if (ciSvg) {
    document.querySelectorAll(".cl").forEach((btn) => {
      btn.addEventListener("click", () => {
        ciCL = parseInt(btn.dataset.cl, 10);
        document.querySelectorAll(".cl").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        ciClear();
      });
    });
    $("ci-n").addEventListener("input", (e) => {
      ciN = parseInt(e.target.value, 10);
      $("ci-n-val").textContent = ciN;
      ciClear();
    });
    $("ci-run").addEventListener("click", () => ciRun(24));
    $("ci-reset").addEventListener("click", ciClear);
    ciClear();
  }

  /* =========================================================
     WIDGET 3 — the t-distribution against the normal
     ========================================================= */
  const tSvg = $("t-svg");
  const T = { W: 680, H: 260, l: 16, r: 16, t: 14, b: 26 };
  const TDOM = [-4.2, 4.2];
  let tN = 4;

  const tX = (x) => T.l + ((x - TDOM[0]) / (TDOM[1] - TDOM[0])) * (T.W - T.l - T.r);

  function drawT() {
    tSvg.replaceChildren();
    const df = tN - 1;
    const plotH = T.H - T.t - T.b;
    const y0 = T.H - T.b;
    const yMax = normpdf(0) * 1.1;
    const yS = (d) => (d / yMax) * plotH;

    // axis
    tSvg.append(svgEl("line", { x1: T.l, y1: y0, x2: T.W - T.r, y2: y0, class: "stat-axis" }));
    [-4, -2, 0, 2, 4].forEach((v) => {
      const tx = svgEl("text", { x: tX(v), y: y0 + 16, class: "stat-tick", "text-anchor": "middle" });
      tx.textContent = String(v);
      tSvg.append(tx);
    });

    // normal curve (dashed)
    const nPts = [], tPts = [];
    for (let px = 0; px <= 200; px++) {
      const xv = TDOM[0] + (px / 200) * (TDOM[1] - TDOM[0]);
      nPts.push(`${tX(xv).toFixed(1)},${(y0 - yS(normpdf(xv))).toFixed(1)}`);
      tPts.push(`${tX(xv).toFixed(1)},${(y0 - yS(tpdf(xv, df))).toFixed(1)}`);
    }
    tSvg.append(svgEl("polyline", { points: nPts.join(" "), class: "t-normal" }));
    tSvg.append(svgEl("polyline", { points: tPts.join(" "), class: "t-curve" }));

    // critical value markers for the t-curve (two-tailed 95%)
    const crit = tppf(0.975, df);
    [-crit, crit].forEach((c) => {
      tSvg.append(svgEl("line", { x1: tX(c), y1: y0 - yS(tpdf(c, df)), x2: tX(c), y2: y0, class: "t-crit-line" }));
    });
    // 1.96 references
    [-1.96, 1.96].forEach((c) => {
      tSvg.append(svgEl("line", { x1: tX(c), y1: y0 - yS(normpdf(c)), x2: tX(c), y2: y0, class: "t-ref-line" }));
    });
    return crit;
  }

  function tRender() {
    const df = tN - 1;
    const crit = drawT();
    $("t-n-val").textContent = tN;
    $("t-df").textContent = df;
    $("t-crit").textContent = crit.toFixed(2);
    const cap = $("t-cap");
    const wider = ((crit / 1.96 - 1) * 100);
    if (tN >= 30) {
      cap.textContent = "With this many observations the t-curve and the normal are all but identical; ±1.96 is fine.";
    } else {
      cap.textContent =
        `Solid t-curve, dashed normal. Not knowing σ widens the 95% reach to ±${crit.toFixed(2)} standard errors, about ${wider.toFixed(0)}% more than the ±1.96 you would use if you did.`;
    }
  }

  if (tSvg) {
    $("t-n").addEventListener("input", (e) => {
      tN = parseInt(e.target.value, 10);
      tRender();
    });
    tRender();
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
