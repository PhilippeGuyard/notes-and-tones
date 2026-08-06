/* ============================================================
   The Genetics of Unicorns — interactive logic
   Two widgets:
     1) Hardy–Weinberg allele-frequency slider
     2) Live two-way ANOVA on horn length
   ============================================================ */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const pct = (x) => `${Math.round(x * 100)}%`;

  /* ---------------------------------------------------------
     WIDGET 1 — allele frequencies (Hardy–Weinberg)
     q = frequency of recessive a; p = 1 - q.
     Genotypes: AA = p², Aa = 2pq, aa = q² (unicorns).
     "Effect" figures match the essay's worked numbers:
        effect of a  = +q²   (25% at q=0.5, 1% at q=0.1)
        effect of A  = -pq   (-25% at q=0.5, -9% at q=0.1)
     They are frequency-dependent — that's the whole point.
     --------------------------------------------------------- */
  const slider = $("qslider");

  function renderAlleles() {
    const q = clamp01(parseFloat(slider.value));
    const p = 1 - q;

    const AA = p * p;
    const Aa = 2 * p * q;
    const aa = q * q;

    $("qval").textContent = q.toFixed(2);
    $("pval").textContent = p.toFixed(2);

    $("unicornpct").textContent = Math.round(aa * 100);

    // genotype bar widths (min slice so labels stay legible)
    $("seg-AA").style.width = pct(AA);
    $("seg-Aa").style.width = pct(Aa);
    $("seg-aa").style.width = pct(aa);
    $("seg-AA").querySelector(".seg-lab").style.opacity = AA > 0.08 ? 1 : 0;
    $("seg-Aa").querySelector(".seg-lab").style.opacity = Aa > 0.08 ? 1 : 0;
    $("seg-aa").querySelector(".seg-lab").style.opacity = aa > 0.08 ? 1 : 0;

    $("pAA").textContent = pct(AA);
    $("pAa").textContent = pct(Aa);
    $("paa").textContent = pct(aa);

    const effA = aa;        // +q²
    const effB = -(p * q);  // -pq
    $("effA").textContent = `+${Math.round(effA * 100)}%`;
    $("effB").textContent = `−${Math.round(Math.abs(effB) * 100)}%`;

    const cap = $("allele-caption");
    if (Math.abs(q - 0.5) < 0.02) {
      cap.textContent = "At q = 0.50 the two alleles look equally powerful. Slide toward the extremes and that symmetry collapses.";
    } else if (q < 0.5) {
      cap.textContent = `Recessive a is now rarer than A. Unicorns are scarce (${pct(aa)}), and a's apparent "effect" has shrunk — same allele, different story.`;
    } else {
      cap.textContent = `Recessive a is now common. Unicorns dominate the herd (${pct(aa)}), and it's the A allele whose apparent effect has faded.`;
    }
  }

  slider.addEventListener("input", renderAlleles);
  renderAlleles();

  /* ---------------------------------------------------------
     WIDGET 2 — two-way ANOVA on horn length
     Fixed weights (independent factors):
        habitat: woodland ½, cloud forest ½
        genotype: bb ¼, bB ½, BB ¼
     Cell weight = genotype weight × habitat weight.
     With product weights the decomposition is orthogonal:
        Var_total = Var_geno + Var_env + Var_interaction
     --------------------------------------------------------- */
  const GW = { bb: 0.25, bB: 0.5, BB: 0.25 }; // genotype weights
  const EW = 0.5;                              // each habitat weight

  const cells = {
    bb: { w: $("c-bb-w"), c: $("c-bb-c") },
    bB: { w: $("c-bB-w"), c: $("c-bB-c") },
    BB: { w: $("c-BB-w"), c: $("c-BB-c") },
  };

  const PRESETS = {
    interaction: { bb: [100, 70], bB: [140, 90], BB: [60, 110] },
    additive:    { bb: [95, 75],  bB: [125, 105], BB: [95, 75] },
  };
  const DEFAULT = "interaction";

  function readCells() {
    const v = {};
    for (const g of ["bb", "bB", "BB"]) {
      v[g] = {
        w: parseFloat(cells[g].w.value) || 0,
        c: parseFloat(cells[g].c.value) || 0,
      };
    }
    return v;
  }

  function computeAnova(v) {
    const genos = ["bb", "bB", "BB"];

    // grand mean
    let grand = 0;
    for (const g of genos) grand += GW[g] * EW * (v[g].w + v[g].c);

    // marginal means
    const rowMean = {};
    for (const g of genos) rowMean[g] = (v[g].w + v[g].c) / 2;

    let colW = 0, colC = 0;
    for (const g of genos) { colW += GW[g] * v[g].w; colC += GW[g] * v[g].c; }

    // variances
    let total = 0, geno = 0, env = 0;
    for (const g of genos) {
      total += GW[g] * EW * ((v[g].w - grand) ** 2 + (v[g].c - grand) ** 2);
      geno  += GW[g] * (rowMean[g] - grand) ** 2;
    }
    env = EW * ((colW - grand) ** 2 + (colC - grand) ** 2);
    const inter = Math.max(0, total - geno - env);

    return { grand, rowMean, colW, colC, total, geno, env, inter };
  }

  const r0 = (x) => Math.round(x);
  const r1 = (x) => (Math.round(x * 10) / 10);

  function renderAnova() {
    const v = readCells();
    const a = computeAnova(v);

    // table means
    $("m-bb").textContent = r1(a.rowMean.bb);
    $("m-bB").textContent = r1(a.rowMean.bB);
    $("m-BB").textContent = r1(a.rowMean.BB);
    $("m-w").textContent = r1(a.colW);
    $("m-c").textContent = r1(a.colC);
    $("m-all").textContent = r1(a.grand);

    // shares (guard against all-equal → zero total)
    const denom = a.total || 1;
    const sg = a.geno / denom;
    const se = a.env / denom;
    const si = a.inter / denom;

    $("fill-geno").style.width = pct(sg);
    $("fill-env").style.width = pct(se);
    $("fill-int").style.width = pct(si);
    $("val-geno").textContent = pct(sg);
    $("val-env").textContent = pct(se);
    $("val-int").textContent = pct(si);

    $("var-total").textContent = r0(a.total);
    $("var-geno").textContent = r0(a.geno);
    $("var-env").textContent = r0(a.env);
    $("var-int").textContent = r0(a.inter);

    // warn only when interaction is material
    const warn = $("interaction-warn");
    warn.classList.toggle("hide", si < 0.05);
  }

  function applyPreset(name) {
    const p = PRESETS[name] || PRESETS[DEFAULT];
    for (const g of ["bb", "bB", "BB"]) {
      cells[g].w.value = p[g][0];
      cells[g].c.value = p[g][1];
    }
    renderAnova();
  }

  // preset buttons
  document.querySelectorAll(".preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = btn.dataset.preset;
      const target = preset === "reset" ? DEFAULT : preset;
      applyPreset(target);
      document.querySelectorAll(".preset").forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.preset === target))
      );
    });
  });

  // live editing
  Object.values(cells).forEach(({ w, c }) => {
    w.addEventListener("input", () => { clearPresetState(); renderAnova(); });
    c.addEventListener("input", () => { clearPresetState(); renderAnova(); });
  });

  function clearPresetState() {
    // manual edits no longer match a named preset
    const v = readCells();
    let match = null;
    for (const [name, p] of Object.entries(PRESETS)) {
      const ok = ["bb", "bB", "BB"].every(
        (g) => v[g].w === p[g][0] && v[g].c === p[g][1]
      );
      if (ok) { match = name; break; }
    }
    document.querySelectorAll(".preset").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.preset === match))
    );
  }

  renderAnova();

  /* ---------------------------------------------------------
     Scroll reveal for prose sections & widgets
     --------------------------------------------------------- */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          // reveal on intersect OR if already scrolled past (fast scroll safety)
          if (e.isIntersecting || e.boundingClientRect.top < window.innerHeight) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -6% 0px" }
    );
    document.querySelectorAll(".prose > *, .widget").forEach((el, i) => {
      el.classList.add("reveal");
      el.style.setProperty("--d", `${(i % 6) * 40}ms`);
      io.observe(el);
    });
    // scroll safety net: reveal anything whose top has entered the viewport,
    // guaranteeing fast scrolls never leave blank sections.
    const sweep = () => {
      const vh = window.innerHeight;
      document.querySelectorAll(".reveal:not(.in)").forEach((el) => {
        if (el.getBoundingClientRect().top < vh * 0.94) el.classList.add("in");
      });
    };
    window.addEventListener("scroll", sweep, { passive: true });
    window.addEventListener("load", () => setTimeout(sweep, 300));
    sweep();
  }
})();
