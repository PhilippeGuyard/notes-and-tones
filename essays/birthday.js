/* ============================================================
   Twenty-Three People, One Birthday — interactive logic
   Two widgets:
     1) The party — P(shared birthday) as a room fills (N = 365)
     2) The collision engine — the same curve for any space N,
        on a log axis of draws, landing on UUIDv4 (N = 2^122)
   The birthday case is computed exactly; the general case uses
   the collision approximation 1 - exp(-k(k-1)/2N). No innerHTML.
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

  /* ---------- probability helpers ---------- */
  // exact: chance that some two of n people share one of 365 days
  function pBirthday(n) {
    if (n < 2) return 0;
    if (n > 365) return 1;
    let p = 1;
    for (let i = 0; i < n; i++) p *= (365 - i) / 365;
    return 1 - p;
  }
  const pairs = (n) => (n * (n - 1)) / 2;

  // general: chance of a collision drawing k times from N boxes
  function pCollision(k, N) {
    if (k < 2 || N <= 0) return 0;
    return 1 - Math.exp(-(k * (k - 1)) / (2 * N));
  }
  const evenOdds = (N) => 1.177410 * Math.sqrt(N); // draws for ~50%

  /* ---------- formatting ---------- */
  const UNITS = [
    [1e21, "sextillion"], [1e18, "quintillion"], [1e15, "quadrillion"],
    [1e12, "trillion"], [1e9, "billion"], [1e6, "million"],
  ];
  function fmtBig(x) {
    if (x < 1e4) return Math.round(x).toLocaleString("en-GB");
    for (const [v, name] of UNITS) {
      if (x >= v) return (x / v).toPrecision(3).replace(/\.?0+$/, "") + " " + name;
    }
    return Math.round(x).toLocaleString("en-GB");
  }
  const fmtPct = (p) => {
    if (p >= 0.9999 && p < 1) return "99.99%";
    if (p >= 0.1) return (p * 100).toFixed(1) + "%";
    if (p <= 0) return "0%";
    return (p * 100).toFixed(2) + "%";
  };

  /* =========================================================
     WIDGET 1 — the party (N = 365, exact, linear axis)
     ========================================================= */
  const partySvg = $("party-svg");
  if (partySvg) {
    const W = 680, H = 300, L = 44, R = 16, T = 16, B = 30;
    const NMAX = 75;
    const px = (n) => L + (n / NMAX) * (W - L - R);
    const py = (p) => (H - B) - p * (H - T - B);
    let pn = 23;

    function drawParty() {
      partySvg.replaceChildren();
      const y0 = H - B;

      // axes
      partySvg.append(svgEl("line", { x1: L, y1: y0, x2: W - R, y2: y0, class: "stat-axis" }));
      partySvg.append(svgEl("line", { x1: L, y1: T, x2: L, y2: y0, class: "stat-axis" }));
      [0, 25, 50, 75, 100].forEach((v) => {
        const y = py(v / 100);
        const tx = svgEl("text", { x: L - 8, y: y + 3, class: "stat-tick", "text-anchor": "end" });
        tx.textContent = v + "%";
        partySvg.append(tx);
      });
      [0, 15, 30, 45, 60, 75].forEach((v) => {
        const tx = svgEl("text", { x: px(v), y: y0 + 18, class: "stat-tick", "text-anchor": "middle" });
        tx.textContent = String(v);
        partySvg.append(tx);
      });

      // 50% reference + the "23" landmark
      partySvg.append(svgEl("line", { x1: L, y1: py(0.5), x2: W - R, y2: py(0.5), class: "bday-ref" }));
      partySvg.append(svgEl("line", { x1: px(23), y1: py(0.5), x2: px(23), y2: y0, class: "bday-ref" }));

      // the probability curve
      const pts = [];
      for (let n = 1; n <= NMAX; n++) pts.push(`${px(n).toFixed(1)},${py(pBirthday(n)).toFixed(1)}`);
      partySvg.append(svgEl("polyline", { points: pts.join(" "), class: "bday-curve" }));

      // current-n marker
      partySvg.append(svgEl("line", { x1: px(pn), y1: py(pBirthday(pn)), x2: px(pn), y2: y0, class: "bday-now" }));
      partySvg.append(svgEl("circle", { cx: px(pn), cy: py(pBirthday(pn)), r: 4.5, class: "bday-dot" }));
    }

    function renderParty() {
      const p = pBirthday(pn);
      $("party-n-val").textContent = pn;
      $("party-p").textContent = fmtPct(p);
      $("party-pairs").textContent = pairs(pn).toLocaleString("en-GB");
      const sub =
        p < 0.5 ? "still against you" :
        p < 0.9 ? "the bet pays off" :
        p < 0.999 ? "all but certain" : "a virtual certainty";
      $("party-p-sub").textContent = sub;
      drawParty();
    }

    $("party-n").addEventListener("input", (e) => { pn = +e.target.value; renderParty(); });
    renderParty();
  }

  /* =========================================================
     WIDGET 2 — the collision engine (any N, log axis of draws)
     ========================================================= */
  const engSvg = $("engine-svg");
  if (engSvg) {
    const W = 680, H = 300, L = 44, R = 16, T = 16, B = 30;
    const SMAX = 75; // log2 of the largest draw count on the axis
    const UUID_N = Math.pow(2, 122);
    const px = (s) => L + (s / SMAX) * (W - L - R);
    const py = (p) => (H - B) - p * (H - T - B);

    let N = 365;
    let sK = 4.5; // slider is log2(draws)

    // superscript tick labels: 2^0, 2^15, ...
    const SUP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷" };
    const sup = (n) => String(n).split("").map((d) => SUP[d]).join("");

    function drawEngine() {
      engSvg.replaceChildren();
      const y0 = H - B;

      // axes
      engSvg.append(svgEl("line", { x1: L, y1: y0, x2: W - R, y2: y0, class: "stat-axis" }));
      engSvg.append(svgEl("line", { x1: L, y1: T, x2: L, y2: y0, class: "stat-axis" }));
      [0, 25, 50, 75, 100].forEach((v) => {
        const y = py(v / 100);
        const tx = svgEl("text", { x: L - 8, y: y + 3, class: "stat-tick", "text-anchor": "end" });
        tx.textContent = v + "%";
        engSvg.append(tx);
      });
      [0, 15, 30, 45, 60, 75].forEach((s) => {
        const tx = svgEl("text", { x: px(s), y: y0 + 18, class: "stat-tick", "text-anchor": "middle" });
        tx.textContent = "2" + sup(s);
        engSvg.append(tx);
      });

      // 50% reference
      engSvg.append(svgEl("line", { x1: L, y1: py(0.5), x2: W - R, y2: py(0.5), class: "bday-ref" }));

      // even-odds landmark (log2 of ~1.2*sqrt(N))
      const sEven = clamp(Math.log2(evenOdds(N)), 0, SMAX);
      engSvg.append(svgEl("line", { x1: px(sEven), y1: py(0.5), x2: px(sEven), y2: y0, class: "bday-ref" }));

      // the collision curve for this N
      const pts = [];
      for (let s = 0; s <= SMAX; s += 0.5) {
        pts.push(`${px(s).toFixed(1)},${py(pCollision(Math.pow(2, s), N)).toFixed(1)}`);
      }
      engSvg.append(svgEl("polyline", { points: pts.join(" "), class: "bday-curve" }));

      // current draw marker
      const pNow = pCollision(Math.pow(2, sK), N);
      engSvg.append(svgEl("line", { x1: px(sK), y1: py(pNow), x2: px(sK), y2: y0, class: "bday-now" }));
      engSvg.append(svgEl("circle", { cx: px(sK), cy: py(pNow), r: 4.5, class: "bday-dot" }));
    }

    function renderEngine() {
      const k = Math.pow(2, sK);
      $("engine-k-val").textContent = fmtBig(k);
      $("engine-n-val").textContent = N === UUID_N ? "2¹²²" : fmtBig(N);
      $("engine-p").textContent = fmtPct(pCollision(k, N));
      $("engine-even").textContent = fmtBig(evenOdds(N));
      drawEngine();
    }

    document.querySelectorAll(".space").forEach((btn) => {
      btn.addEventListener("click", () => {
        N = btn.dataset.n === "uuid" ? UUID_N : +btn.dataset.n;
        document.querySelectorAll(".space").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        renderEngine();
      });
    });
    $("engine-k").addEventListener("input", (e) => { sK = +e.target.value; renderEngine(); });
    renderEngine();
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
