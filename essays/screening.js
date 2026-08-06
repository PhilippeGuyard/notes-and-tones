/* ============================================================
   You Tested Positive. Now What? — interactive logic
   Three widgets plus a quiz hook:
     0) Quiz — guess the answer before the maths
     1) The icon grid — 1,000 women sorted by test outcome
     2) Testing twice — Bayesian updating, posterior -> prior
     3) The policy dial — the screening trade-off by age
   All arithmetic runs off one set of constants. No innerHTML.
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

  /* ---------- the numbers, defined once ---------- */
  const SENS = 0.9;   // sensitivity — catches real cancers
  const SPEC = 0.91;  // specificity — clears healthy women
  const PREV = 0.01;  // base rate for the fixed scenario (quiz + chain)

  // age -> cancers present per 1,000 screened (stylised, ~SEER-shaped)
  const POLICY_PREV = { 40: 4, 45: 6, 50: 8, 55: 10, 60: 13, 65: 16, 70: 20 };

  // one positive test: posterior probability of illness
  const bayesPos = (p, sens = SENS, spec = SPEC) => {
    const num = sens * p;
    const den = num + (1 - spec) * (1 - p);
    return den > 0 ? num / den : 0;
  };
  // one negative test: posterior probability of illness
  const bayesNeg = (p, sens = SENS, spec = SPEC) => {
    const num = (1 - sens) * p;
    const den = num + spec * (1 - p);
    return den > 0 ? num / den : 0;
  };

  const pct = (x, dp = 1) => (x * 100).toFixed(dp) + "%";

  /* =========================================================
     QUIZ — guess before the maths
     ========================================================= */
  if ($("quiz-widget")) {
    const opts = ["quiz-90", "quiz-50", "quiz-10"];
    const reveals = {
      "quiz-90": "If you guessed nine in ten, you're in the majority — and wrong by a factor of ten. Most positives here are false alarms. Let's count it out.",
      "quiz-50": "A natural guess, and closer than most doctors manage — but still far too high. The real answer is nearer one in ten. Let's count it out.",
      "quiz-10": "Spot on, and you're in a small minority: the answer is about nine per cent. Here's why the test's ninety-per-cent accuracy doesn't carry over.",
    };
    opts.forEach((id) => {
      $(id).addEventListener("click", () => {
        opts.forEach((o) => {
          const b = $(o);
          b.setAttribute("aria-pressed", String(o === id));
          b.disabled = true;
        });
        $("quiz-reveal-text").textContent = reveals[id];
        $("quiz-reveal").hidden = false;
      });
    });
  }

  /* =========================================================
     WIDGET 1 — the icon grid of 1,000 women
     ========================================================= */
  const gridSvg = $("grid-svg");
  if (gridSvg) {
    const COLS = 40, ROWS = 25, N = COLS * ROWS; // 1,000
    const PITCH = 16, R = 5.4, X0 = 22, Y0 = 16;
    const dots = new Array(N);

    // build the dots once, row-major
    for (let i = 0; i < N; i++) {
      const row = Math.floor(i / COLS), col = i % COLS;
      const c = svgEl("circle", {
        cx: X0 + col * PITCH, cy: Y0 + row * PITCH, r: R, class: "dot dot-tn",
      });
      dots[i] = c;
      gridSvg.append(c);
    }

    let gPrev = 10, gSens = 90, gSpec = 91; // slider units (per-1000, %, %)

    function gridCounts() {
      const ill = Math.round(gPrev);                       // per 1,000
      const tp = Math.round((gSens / 100) * ill);
      const fn = ill - tp;
      const fp = Math.round((1 - gSpec / 100) * (N - ill));
      const tn = N - ill - fp;                             // remainder, keeps sum = 1,000
      return { ill, tp, fn, fp, tn };
    }

    function gridRecolour({ tp, fn, fp }) {
      // contiguous blocks: TP, then FN, then FP, then TN
      const b1 = tp, b2 = tp + fn, b3 = tp + fn + fp;
      for (let i = 0; i < N; i++) {
        let cls = "dot dot-tn";
        if (i < b1) cls = "dot dot-tp";
        else if (i < b2) cls = "dot dot-fn";
        else if (i < b3) cls = "dot dot-fp";
        dots[i].setAttribute("class", cls);
      }
    }

    function gridRender() {
      const c = gridCounts();
      gridRecolour(c);
      const pos = c.tp + c.fp;
      $("grid-prev-val").textContent = c.ill;
      $("grid-prev-pct").textContent = (gPrev / 10).toFixed(1);
      $("grid-sens-val").textContent = gSens;
      $("grid-spec-val").textContent = gSpec;
      $("grid-pos").textContent = pos;
      if (pos === 0) {
        $("grid-ppv").textContent = "–";
        $("grid-ppv-frac").textContent = "nobody tests positive";
      } else {
        $("grid-ppv").textContent = pct(c.tp / pos, 0);
        $("grid-ppv-frac").textContent = `${c.tp} true / ${pos} positives`;
      }
    }

    $("grid-prev").addEventListener("input", (e) => { gPrev = +e.target.value; gridRender(); });
    $("grid-sens").addEventListener("input", (e) => { gSens = +e.target.value; gridRender(); });
    $("grid-spec").addEventListener("input", (e) => { gSpec = +e.target.value; gridRender(); });
    gridRender();
  }

  /* =========================================================
     WIDGET 2 — testing twice (Bayesian updating)
     ========================================================= */
  if ($("chain-widget")) {
    let p = PREV;
    let trail = ["start"];

    function chainRender(detail) {
      $("chain-p").textContent = pct(p, p < 0.1 ? 1 : 0);
      $("chain-fill").style.width = clamp(p * 100, 0, 100) + "%";
      $("chain-steps").textContent = trail.slice(-6).join(" → ");
      $("chain-detail").textContent = detail;
    }

    function step(positive) {
      if (trail.length > 6) return; // probability has saturated; keep the display sane
      const prior = p;
      p = positive ? bayesPos(p) : bayesNeg(p);
      trail.push(positive ? "+" : "−");
      chainRender(`${pct(prior, prior < 0.1 ? 1 : 0)} → ${pct(p, p < 0.1 ? 1 : 0)}`);
    }

    $("chain-pos").addEventListener("click", () => step(true));
    $("chain-neg").addEventListener("click", () => step(false));
    $("chain-reset").addEventListener("click", () => {
      p = PREV; trail = ["start"];
      chainRender("the prior, before any test");
    });
    chainRender("the prior, before any test");
  }

  /* =========================================================
     WIDGET 3 — the policy dial
     ========================================================= */
  if ($("policy-widget")) {
    const N = 1000;

    function policyRender(age) {
      const ill = POLICY_PREV[age];
      const caught = Math.round(SENS * ill);
      const missed = ill - caught;
      const fp = Math.round((1 - SPEC) * (N - ill));
      const biopsy = Math.round(fp / 4);
      const pos = caught + fp;
      $("policy-age-val").textContent = age;
      $("policy-present-inline").textContent = ill;
      $("policy-present").textContent = ill;
      $("policy-caught").textContent = caught;
      $("policy-missed").textContent = missed;
      $("policy-fp").textContent = fp;
      $("policy-biopsy").textContent = biopsy;
      $("policy-ppv").textContent = pos > 0 ? pct(caught / pos, 0) : "–";
    }

    $("policy-age").addEventListener("input", (e) => policyRender(+e.target.value));
    policyRender(+$("policy-age").value);
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
