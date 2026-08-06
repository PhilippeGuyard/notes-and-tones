/* ============================================================
   Drawn by Circles — interactive logic
   Two widgets:
     1) Building a square wave from sine harmonics (SVG)
     2) The epicycle drawing machine: a discrete Fourier
        transform of an outline, redrawn by rotating vectors
        (canvas)
   The DFT is computed here in the browser; the essay shows the
   equivalent numpy alongside. No innerHTML anywhere.
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
  const TAU = Math.PI * 2;

  /* =========================================================
     WIDGET 1 — a square wave, one sine at a time
     ========================================================= */
  const sqSvg = $("sq-svg");
  const SQ = { W: 680, H: 260, l: 16, r: 16, t: 18, b: 18 };
  const PERIODS = 2;              // how many periods to show
  let sqH = 3;                    // number of odd harmonics

  const sqX = (u) => SQ.l + u * (SQ.W - SQ.l - SQ.r);          // u in [0,1]
  const sqY = (v) => {                                          // v in [-1.4, 1.4]
    const plotH = SQ.H - SQ.t - SQ.b;
    return SQ.t + (1 - (v + 1.4) / 2.8) * plotH;
  };

  // partial sum of the square-wave Fourier series at position x (in periods)
  function squarePartial(x, harmonics) {
    let s = 0;
    for (let i = 0; i < harmonics; i++) {
      const k = 2 * i + 1;                 // odd harmonics 1, 3, 5, ...
      s += Math.sin(TAU * k * x) / k;
    }
    return (4 / Math.PI) * s;
  }

  function drawSquare() {
    sqSvg.replaceChildren();

    // zero axis
    sqSvg.append(svgEl("line", { x1: SQ.l, y1: sqY(0), x2: SQ.W - SQ.r, y2: sqY(0), class: "stat-axis" }));

    // target square wave (faint step line)
    const target = [];
    const steps = 1200;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * PERIODS;
      const val = Math.sin(TAU * x) >= 0 ? 1 : -1;
      target.push(`${sqX(i / steps).toFixed(1)},${sqY(val).toFixed(1)}`);
    }
    sqSvg.append(svgEl("polyline", { points: target.join(" "), class: "sq-target" }));

    // the partial sum
    const sum = [];
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * PERIODS;
      sum.push(`${sqX(i / steps).toFixed(1)},${sqY(squarePartial(x, sqH)).toFixed(1)}`);
    }
    sqSvg.append(svgEl("polyline", { points: sum.join(" "), class: "sq-sum" }));
  }

  function sqRender() {
    $("sq-h-val").textContent = sqH;
    $("sq-top").textContent = 2 * sqH - 1;
    drawSquare();
  }

  if (sqSvg) {
    $("sq-h").addEventListener("input", (e) => {
      sqH = parseInt(e.target.value, 10);
      sqRender();
    });
    sqRender();
  }

  /* =========================================================
     WIDGET 2 — the epicycle drawing machine
     ========================================================= */
  const canvas = $("ep-canvas");
  const ctx = canvas ? canvas.getContext("2d") : null;
  const N = 256;                 // outline samples / number of circles
  let epShape = "heart";
  let epN = 24;                  // circles currently in use
  let playing = true;
  let phase = 0;                 // animation phase, 0..1 over one loop
  let comps = [];                // sorted rotating components for current shape
  let pathPts = [];              // full reconstructed outline for current epN
  let cssW = 680, cssH = 440, dpr = 1;

  /* ---- shape generators: N points around a closed outline ---- */
  const shapes = {
    heart: (i) => {
      const t = (i / N) * TAU;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      return [x, y];
    },
    infinity: (i) => {
      const t = (i / N) * TAU;                 // Gerono lemniscate (figure eight)
      return [16 * Math.cos(t), 16 * Math.sin(t) * Math.cos(t)];
    },
    star: (i) => {
      const pts = 5, verts = [];
      for (let k = 0; k < pts * 2; k++) {
        const r = k % 2 === 0 ? 16 : 6.4;
        const a = -Math.PI / 2 + (k / (pts * 2)) * TAU;
        verts.push([r * Math.cos(a), r * Math.sin(a)]);
      }
      // walk the polygon perimeter at constant index spacing
      const per = i / N * (pts * 2);
      const seg = Math.floor(per) % (pts * 2);
      const f = per - Math.floor(per);
      const a = verts[seg], b = verts[(seg + 1) % (pts * 2)];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    },
    wave: (i) => {
      // a closed loop whose top edge is a little sound wave, bottom edge flat
      const u = i / N;
      if (u < 0.5) {
        const x = -16 + (u / 0.5) * 32;                       // left to right
        const y = -4 - 4 * Math.sin(TAU * 3 * (u / 0.5)) - 3 * Math.sin(TAU * 5 * (u / 0.5));
        return [x, y];
      }
      const x = 16 - ((u - 0.5) / 0.5) * 32;                  // right back to left
      return [x, 8];
    },
  };

  /* ---- discrete Fourier transform of the complex outline ---- */
  function computeComponents(shapeName) {
    const gen = shapes[shapeName];
    const px = new Array(N), py = new Array(N);
    let cx = 0, cy = 0;
    for (let i = 0; i < N; i++) {
      const [x, y] = gen(i);
      px[i] = x; py[i] = y; cx += x; cy += y;
    }
    cx /= N; cy /= N;
    for (let i = 0; i < N; i++) { px[i] -= cx; py[i] -= cy; }   // centre the drawing

    const out = [];
    for (let k = 0; k < N; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < N; n++) {
        const a = (-TAU * k * n) / N;
        const c = Math.cos(a), s = Math.sin(a);
        re += px[n] * c - py[n] * s;
        im += px[n] * s + py[n] * c;
      }
      re /= N; im /= N;
      const freq = k <= N / 2 ? k : k - N;   // signed frequency
      out.push({ freq, amp: Math.hypot(re, im), ph: Math.atan2(im, re) });
    }
    out.sort((p, q) => q.amp - p.amp);        // biggest circles first
    return out;
  }

  // pen position (relative to centre) from the first m components at time t
  function penAt(t, m) {
    let x = 0, y = 0;
    const lim = Math.min(m, comps.length);
    for (let j = 0; j < lim; j++) {
      const c = comps[j];
      const a = TAU * c.freq * t + c.ph;
      x += c.amp * Math.cos(a);
      y += c.amp * Math.sin(a);
    }
    return [x, y];
  }

  // precompute the full closed outline the current circles produce
  function buildPath() {
    const steps = 600;
    pathPts = new Array(steps + 1);
    for (let i = 0; i <= steps; i++) pathPts[i] = penAt(i / steps, epN);
  }

  function fitScale() {
    let maxR = 1e-6;
    for (const p of pathPts) maxR = Math.max(maxR, Math.abs(p[0]), Math.abs(p[1]));
    return (0.4 * Math.min(cssW, cssH)) / (maxR || 1);
  }

  function resizeCanvas() {
    if (!canvas) return;
    dpr = window.devicePixelRatio || 1;
    cssW = canvas.clientWidth || 680;
    cssH = Math.round(cssW * (440 / 680));
    canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }

  function draw() {
    if (!ctx) return;
    const scale = fitScale();
    const ox = cssW / 2, oy = cssH / 2;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    // full traced outline (rainbow-ish: single warm stroke, kept simple)
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = "#e8629b";
    ctx.beginPath();
    for (let i = 0; i < pathPts.length; i++) {
      const p = pathPts[i];
      const X = ox + p[0] * scale, Y = oy + p[1] * scale;
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.stroke();

    // the rotating circles at the current phase, tip to tail
    let x = 0, y = 0;
    const lim = Math.min(epN, comps.length);
    ctx.lineWidth = 1;
    for (let j = 0; j < lim; j++) {
      const c = comps[j];
      const px = ox + x * scale, py = oy + y * scale;
      const rad = c.amp * scale;
      // circle outline
      if (rad > 0.8) {
        ctx.strokeStyle = "rgba(44,27,61,0.18)";
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, TAU);
        ctx.stroke();
      }
      // radius spoke
      const a = TAU * c.freq * phase + c.ph;
      const nx = x + c.amp * Math.cos(a), ny = y + c.amp * Math.sin(a);
      const npx = ox + nx * scale, npy = oy + ny * scale;
      ctx.strokeStyle = "rgba(44,27,61,0.32)";
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(npx, npy);
      ctx.stroke();
      x = nx; y = ny;
    }

    // the pen dot at the tip
    const penX = ox + x * scale, penY = oy + y * scale;
    ctx.fillStyle = "#6f7be6";
    ctx.beginPath();
    ctx.arc(penX, penY, 4, 0, TAU);
    ctx.fill();

    // a short bright lead of the trace, from start up to current phase
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#34b79a";
    ctx.beginPath();
    const upto = Math.floor(phase * (pathPts.length - 1));
    for (let i = 0; i <= upto; i++) {
      const p = pathPts[i];
      const X = ox + p[0] * scale, Y = oy + p[1] * scale;
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.stroke();
  }

  let raf = null;
  function tick() {
    if (playing) {
      phase += 0.0025;
      if (phase >= 1) phase -= 1;
      draw();
    }
    raf = requestAnimationFrame(tick);
  }

  function selectShape(name) {
    epShape = name;
    comps = computeComponents(name);
    buildPath();
    phase = 0;
    draw();
  }

  if (canvas && ctx) {
    $("ep-max").textContent = N;
    document.querySelectorAll(".shape").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".shape").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        selectShape(btn.dataset.shape);
      });
    });
    $("ep-n").addEventListener("input", (e) => {
      epN = parseInt(e.target.value, 10);
      $("ep-n-val").textContent = epN;
      buildPath();
      draw();
    });
    $("ep-play").addEventListener("click", () => {
      playing = !playing;
      $("ep-play").textContent = playing ? "❚❚ Pause" : "▶ Play";
    });
    $("ep-restart").addEventListener("click", () => {
      phase = 0;
      draw();
    });
    window.addEventListener("resize", () => { resizeCanvas(); draw(); });

    resizeCanvas();
    selectShape("heart");
    tick();
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
