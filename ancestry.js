/* ============================================================
   How Much Italian Are You? — interactive logic
   Two widgets:
     1) "Same spit, different verdict" — panel switcher
     2) "Your family tree explodes" — ancestor slots vs population
   ============================================================ */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  // small DOM helpers (avoid innerHTML entirely)
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  // build a node tree from ["text", ["b","bold"], ...] fragments into target
  const fill = (target, parts) => {
    target.replaceChildren();
    parts.forEach((p) => {
      if (typeof p === "string") target.append(document.createTextNode(p));
      else target.append(el(p[0], null, p[1]));
    });
  };

  /* ---------------------------------------------------------
     WIDGET 1 — same DNA, different reference panels
     Each "reader" splits ONE fixed genome differently.
     Every breakdown sums to 100. The "Italian" share is the
     hook: 12 → 34 → 21 with no change to the DNA.
     --------------------------------------------------------- */
  const PALETTE = ["--a", "--b", "--B", "--A", "#a86ce0", "--ink-soft"];
  const cvar = (v) => (v.startsWith("--") ? `var(${v})` : v);

  const LABS = {
    a: {
      sub: "Company X, 2013 reference panel",
      rows: [
        ["Broadly Southern European", 34],
        ["Greek & Balkan", 20],
        ["Broadly NW European", 17],
        ["Italian", 12],
        ["French & German", 9],
        ["Iberian", 8],
      ],
    },
    b: {
      sub: "Company X, 2019 reference panel, same customer re-scored",
      rows: [
        ["Italian", 34],
        ["Broadly Southern European", 22],
        ["French", 15],
        ["Broadly NW European", 12],
        ["Greek & Balkan", 11],
        ["Anatolian", 6],
      ],
    },
    c: {
      sub: "Company Y, today, a rival's panel entirely",
      rows: [
        ["Southern European", 28],
        ["Italian", 21],
        ["Broadly European", 15],
        ["Aegean", 14],
        ["French", 12],
        ["Iberian", 10],
      ],
    },
  };

  const list = $("verdict-list");

  function renderLab(key) {
    const lab = LABS[key] || LABS.a;
    list.replaceChildren();

    lab.rows.forEach((r, i) => {
      const [name, val] = r;
      const isIt = name === "Italian";
      const row = el("div", "vrow" + (isIt ? " is-italian" : ""));

      const label = el("span", "vlab", name);

      const track = el("div", "vtrack");
      const bar = el("div", "vfill");
      bar.style.width = "0%";
      bar.style.background = isIt ? "var(--rainbow)" : cvar(PALETTE[i % PALETTE.length]);
      track.append(bar);

      const num = el("span", "vval", val + "%");

      row.append(label, track, num);
      list.append(row);

      // animate width in after insert
      requestAnimationFrame(() => { bar.style.width = val + "%"; });
    });

    const italian = lab.rows.find((r) => r[0] === "Italian");
    $("italian-pct").textContent = italian ? italian[1] : 0;
    $("italian-sub").textContent = lab.sub;
  }

  document.querySelectorAll(".lab").forEach((btn) => {
    btn.addEventListener("click", () => {
      renderLab(btn.dataset.lab);
      document.querySelectorAll(".lab").forEach((b) =>
        b.setAttribute("aria-pressed", String(b === btn))
      );
    });
  });

  renderLab("a");

  /* ---------------------------------------------------------
     WIDGET 2 — pedigree explosion
     Ancestor slots = 2^g. Population estimated from historical
     anchors (world population, log-linear interpolation).
     Both drawn on a log scale so trillions and millions fit.
     --------------------------------------------------------- */
  const GEN_YEARS = 28;   // years per generation
  const NOW = 2026;

  // world population anchors: [years-before-present, people]
  const POP_ANCHORS = [
    [0, 8.0e9],
    [126, 1.65e9],   // ~1900
    [226, 1.0e9],    // ~1800
    [326, 0.63e9],   // ~1700
    [526, 0.46e9],   // ~1500
    [1026, 0.295e9], // ~1000 CE
    [2025, 0.23e9],  // ~1 CE
    [3026, 0.05e9],  // ~1000 BCE
    [5026, 0.014e9], // ~3000 BCE
    [12026, 4.0e6],  // deep prehistory floor
  ];

  function popAt(ybp) {
    const a = POP_ANCHORS;
    if (ybp <= a[0][0]) return a[0][1];
    for (let i = 1; i < a.length; i++) {
      if (ybp <= a[i][0]) {
        const [y0, p0] = a[i - 1];
        const [y1, p1] = a[i];
        const t = (ybp - y0) / (y1 - y0);
        // interpolate in log space (population grows ~exponentially)
        const lp = Math.log10(p0) + t * (Math.log10(p1) - Math.log10(p0));
        return Math.pow(10, lp);
      }
    }
    return a[a.length - 1][1];
  }

  function formatBig(n) {
    if (n < 1000) return Math.round(n).toLocaleString("en-US");
    const units = [
      [1e15, "quadrillion"],
      [1e12, "trillion"],
      [1e9, "billion"],
      [1e6, "million"],
      [1e3, "thousand"],
    ];
    for (const [scale, name] of units) {
      if (n >= scale) {
        const v = n / scale;
        const digits = v < 10 ? 1 : 0;
        return `${v.toFixed(digits)} ${name}`;
      }
    }
    return Math.round(n).toLocaleString("en-US");
  }

  const MAXLOG = 15.4; // log10 domain top (2^50 ≈ 1.1e15)
  const logW = (v) => `${clamp((Math.log10(Math.max(v, 1)) / MAXLOG) * 100, 0, 100)}%`;

  const gslider = $("genslider");

  function renderPedigree() {
    const g = parseInt(gslider.value, 10);
    const slots = Math.pow(2, g);
    const ybp = g * GEN_YEARS;
    const year = NOW - ybp;
    const pop = popAt(ybp);

    $("gen-count").textContent = g;
    $("gen-years").textContent = ybp.toLocaleString("en-US");
    $("gen-year").textContent = year < 0 ? `${Math.abs(year)} BCE` : year;

    $("slots-num").textContent = formatBig(slots);
    $("pop-num").textContent = formatBig(pop);

    $("bar-slots").style.width = logW(slots);
    $("bar-pop").style.width = logW(pop);

    const msg = $("ped-msg");
    if (slots <= pop) {
      fill(msg, [
        `Still room to breathe: your tree could, in principle, hold ${formatBig(slots)} `,
        `different people, and roughly ${formatBig(pop)} were alive. No paradox yet.`,
      ]);
    } else {
      const ratio = slots / pop;
      fill(msg, [
        "Your tree now demands ",
        ["b", formatBig(slots)],
        " ancestors, but only about ",
        ["b", formatBig(pop)],
        " people were alive, and most were strangers to your homeland. That's around ",
        ["b", formatBig(ratio) + "×"],
        " too many. The same people must sit in your tree over and over: ",
        ["b", "pedigree collapse"],
        ". Push the slider on and the net pulls in all of humanity.",
      ]);
    }
  }

  gslider.addEventListener("input", renderPedigree);
  renderPedigree();

  /* ---------------------------------------------------------
     Scroll reveal (shared behaviour with the sibling essay)
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
