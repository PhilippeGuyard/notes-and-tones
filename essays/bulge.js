/* ============================================================
   The Pull of the Equator — interactive logic
   Two canvas widgets sharing one renderer:
     1) spinning sphere: the tangential part of the centrifugal
        force is unbalanced → droplets drain to the equator
     2) bulged (oblate) earth: the tangential parts of gravity
        and the centrifugal force cancel exactly → droplets stay
   Toy model with an exact equilibrium: gravity linear in
   distance from the centre (uniform-density interior),
   g = -G·P ; centrifugal c = ω²·(x, 0).  On the ellipse
   (a cosθ, b sinθ) the two tangential projections cancel at
   every θ when ω²/G = 1 - (b/a)².  No innerHTML anywhere.
   ============================================================ */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  /* ---------- exaggerated constants (real Earth: MU ≈ 0.0034) ---------- */
  const MU = 0.45;                         // centrifugal / gravity at the equator
  const FLAT = 1 - Math.sqrt(1 - MU);      // flattening that balances MU exactly

  /* ---------- palette (mirrors styles.css) ---------- */
  const C = {
    ink: "#2c1b3d", soft: "#5b4a67", line: "#e2d2be",
    grav: "#6f7be6", spin: "#f0a63a", resid: "#e8629b",
    eff: "#34b79a", water: "#3aa7c9", ground: "#f4e7d6",
  };

  /* =========================================================
     Physics — pure, unit equatorial radius, g ≈ 1 at surface
     ========================================================= */
  function makeModel(f, mu) {
    const b = 1 - f;
    const unit = (v) => {
      const L = Math.hypot(v.x, v.y) || 1;
      return { x: v.x / L, y: v.y / L };
    };
    return {
      b,
      point: (th) => ({ x: Math.cos(th), y: b * Math.sin(th) }),
      tangent: (th) => unit({ x: -Math.sin(th), y: b * Math.cos(th) }), // poleward in the NE quadrant
      normal: (th) => unit({ x: Math.cos(th), y: Math.sin(th) / b }),   // outward
      gravity: (th) => ({ x: -Math.cos(th), y: -b * Math.sin(th) }),    // -G·P, G = 1
      centrifugal: (th) => ({ x: mu * Math.cos(th), y: 0 }),            // away from the axis
      // net force along the (unit) tangent — the "downhill" a droplet feels
      residual(th) {
        const g = this.gravity(th), c = this.centrifugal(th), t = this.tangent(th);
        return (g.x + c.x) * t.x + (g.y + c.y) * t.y;
      },
    };
  }

  /* ---------- self-test: the maths the essay claims ---------- */
  (function selfTest() {
    const sphere = makeModel(0, MU);
    const oblate = makeModel(FLAT, MU);
    for (let d = 5; d <= 175; d += 10) {
      console.assert(Math.abs(oblate.residual(d * DEG)) < 1e-12,
        "bulge: residual should vanish at every latitude (θ=" + d + "°)");
    }
    console.assert(sphere.residual(45 * DEG) < -1e-3,
      "sphere: residual should point equatorward in the NE quadrant");
    console.assert(Math.abs(sphere.residual(30 * DEG) + sphere.residual(-30 * DEG)) < 1e-12,
      "sphere: residual should be antisymmetric N/S");
    console.assert(
      Math.abs(sphere.residual(45 * DEG)) > Math.abs(sphere.residual(25 * DEG)) &&
      Math.abs(sphere.residual(45 * DEG)) > Math.abs(sphere.residual(65 * DEG)),
      "sphere: residual should peak near 45°");
  })();

  /* =========================================================
     Shared widget renderer
     ========================================================= */
  const W = 900, H = 520, CX = 450, CY = 260, R = 195, VEC = 150;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function makeForceWidget(ids, opts) {
    const canvas = $(ids.canvas);
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const readout = $(ids.readout);
    const model = makeModel(opts.flattening, MU);
    const drift = opts.droplets === "drift";

    const sx = (p) => CX + p.x * R;
    const sy = (p) => CY - p.y * R;

    let th = 45 * DEG;         // current point on the surface (parametric angle)
    let interacted = false;    // mouse/finger has taken over from the idle sweep
    let droplets = [];         // { th, om, alt }
    let pools = { right: 0, left: 0 };
    let rafId = null, lastT = 0;

    /* ---------- crisp canvas at any width ---------- */
    function fit() {
      const cssW = canvas.clientWidth || W;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssW * (H / W) * dpr);
      draw(lastT);
    }

    /* ---------- drawing helpers ---------- */
    function line(x1, y1, x2, y2, color, width, dash) {
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.setLineDash(dash || []);
      ctx.stroke(); ctx.setLineDash([]);
    }
    function arrow(x1, y1, x2, y2, color, width) {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
      if (L < 3) return;
      const hx = dx / L, hy = dy / L, head = Math.min(10, 4 + L * 0.08);
      line(x1, y1, x2 - hx * head * 0.6, y2 - hy * head * 0.6, color, width);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - hx * head - hy * head * 0.45, y2 - hy * head + hx * head * 0.45);
      ctx.lineTo(x2 - hx * head + hy * head * 0.45, y2 - hy * head - hx * head * 0.45);
      ctx.closePath();
      ctx.fillStyle = color; ctx.fill();
    }
    function label(text, x, y, color, align) {
      ctx.font = "700 12px 'Space Mono', monospace";
      ctx.fillStyle = color; ctx.textAlign = align || "left"; ctx.textBaseline = "middle";
      ctx.fillText(text, x, y);
    }

    /* ---------- droplets ---------- */
    function rain() {
      droplets = []; pools = { right: 0, left: 0 };
      for (let i = 0; i < 6; i++) {
        const lat = (16 + i * 12) * DEG;                    // 16° … 76°
        for (const q of [lat, Math.PI - lat, -lat, -Math.PI + lat]) {
          droplets.push({ th: q, om: 0, alt: 7 + ((i * 7) % 4) * 3 });
        }
      }
    }
    function stepDroplets(dt) {
      const K = 6, DAMP = 3.6;           // ≈ critically damped near the equator
      for (let i = droplets.length - 1; i >= 0; i--) {
        const d = droplets[i];
        d.om += (K * model.residual(d.th) - DAMP * d.om) * dt;
        d.th += d.om * dt;
        if (!drift) continue;
        // reached the equator, slowly → absorb into the pooled bulge
        for (const target of [0, Math.PI, -Math.PI]) {
          if (Math.abs(d.th - target) < 0.09 && Math.abs(d.om) < 0.5) {
            pools[target === 0 ? "right" : "left"]++;
            droplets.splice(i, 1);
            break;
          }
        }
      }
    }
    function drawPool(side, count) {
      if (!count) return;
      const hMax = Math.min(20, 5 + count * 1.4), spread = 0.55;
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const u = -spread + (i / 30) * 2 * spread;          // angle around (±R, 0)
        const rr = R + hMax * Math.cos((u / spread) * Math.PI / 2);
        const ang = side === "right" ? u : Math.PI - u;
        const x = CX + rr * Math.cos(ang), y = CY - rr * Math.sin(ang) * model.b;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(58,167,201,.55)"; ctx.fill();
    }

    /* ---------- the frame ---------- */
    function draw(t) {
      const scale = canvas.width / W;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // planet
      ctx.beginPath();
      ctx.ellipse(CX, CY, R, R * model.b, 0, 0, TAU);
      ctx.fillStyle = C.ground; ctx.fill();
      ctx.strokeStyle = C.soft; ctx.lineWidth = 1.6; ctx.stroke();

      // spin axis + equator
      line(CX, CY - R * model.b - 30, CX, CY + R * model.b + 30, C.soft, 1.2, [5, 5]);
      line(CX - R, CY, CX + R, CY, C.soft, 1, [3, 5]);
      label("N", CX + 8, CY - R * model.b - 24, C.soft);
      // ω arc around the north pole
      ctx.beginPath();
      ctx.ellipse(CX, CY - R * model.b - 12, 26, 8, 0, Math.PI * 0.15, Math.PI * 1.6);
      ctx.strokeStyle = C.soft; ctx.lineWidth = 1.4; ctx.stroke();
      const wx = CX + 26 * Math.cos(Math.PI * 0.15), wy = CY - R * model.b - 12 - 8 * Math.sin(Math.PI * 0.15);
      arrow(wx - 1, wy + 4, wx + 2, wy - 3, C.soft, 1.4);
      label("ω", CX - 44, CY - R * model.b - 12, C.soft);

      // water
      drawPool("right", pools.right);
      drawPool("left", pools.left);
      for (let i = 0; i < droplets.length; i++) {
        const d = droplets[i];
        const n = model.normal(d.th), p = model.point(d.th);
        const bob = drift || reduceMotion ? 0 : Math.sin(t * 2 + i) * 1.3;
        ctx.beginPath();
        ctx.arc(sx(p) + n.x * (d.alt + bob), sy(p) - n.y * (d.alt + bob), 4.2, 0, TAU);
        ctx.fillStyle = C.water; ctx.fill();
      }

      // ---- forces at the surface point P ----
      const p = model.point(th), tHat = model.tangent(th), nHat = model.normal(th);
      const g = model.gravity(th), c = model.centrifugal(th);
      const px = sx(p), py = sy(p);
      const toScreen = (v, k) => [px + v.x * VEC * k, py - v.y * VEC * k];

      // the local ground line
      line(px - tHat.x * 82, py + tHat.y * 82, px + tHat.x * 82, py - tHat.y * 82,
        "rgba(91,74,103,.55)", 1.4);

      // spin radius: P to the axis
      line(px, py, CX, py, "rgba(240,166,58,.55)", 1.1, [3, 4]);

      const gT = g.x * tHat.x + g.y * tHat.y;             // gravity along the ground
      const cT = c.x * tHat.x + c.y * tHat.y;             // centrifugal along the ground
      const cN = c.x * nHat.x + c.y * nHat.y;
      const [gx, gy] = toScreen(g, 1);
      const [cx2, cy2] = toScreen(c, 1);

      // thick parent vectors
      arrow(px, py, gx, gy, C.grav, 4);
      arrow(px, py, cx2, cy2, C.spin, 4);
      label("gravity", gx - nHat.x * 14, gy + nHat.y * 14 + 10, C.grav, "center");
      if (Math.abs(c.x) * VEC > 14) label("centrifugal", cx2 + 8, cy2 - 12, C.spin);

      if (drift) {
        // decompose the centrifugal force: dashed projections, components from P
        const tTipX = px + tHat.x * VEC * cT, tTipY = py - tHat.y * VEC * cT;
        const nTipX = px + nHat.x * VEC * cN, nTipY = py - nHat.y * VEC * cN;
        line(cx2, cy2, tTipX, tTipY, "rgba(240,166,58,.6)", 1.1, [4, 4]);
        line(cx2, cy2, nTipX, nTipY, "rgba(240,166,58,.6)", 1.1, [4, 4]);
        arrow(px, py, nTipX, nTipY, "rgba(240,166,58,.75)", 2.2);
        arrow(px, py, tTipX, tTipY, C.resid, 3.5);
        if (Math.abs(cT) * VEC > 10) {
          const s = Math.sign(cT);
          label("nothing cancels this",
            tTipX + tHat.x * s * 14, tTipY - tHat.y * s * 14, C.resid,
            tHat.x * s >= 0 ? "left" : "right");
        }
      } else {
        // both tangential projections: equal, opposite, tail-to-tail at P
        const gTipX = px + tHat.x * VEC * gT, gTipY = py - tHat.y * VEC * gT;
        const cTipX = px + tHat.x * VEC * cT, cTipY = py - tHat.y * VEC * cT;
        line(gx, gy, gTipX, gTipY, "rgba(111,123,230,.6)", 1.1, [4, 4]);
        line(cx2, cy2, cTipX, cTipY, "rgba(240,166,58,.6)", 1.1, [4, 4]);
        arrow(px, py, gTipX, gTipY, C.grav, 3.5);
        arrow(px, py, cTipX, cTipY, C.spin, 3.5);
        // effective gravity = g + c, perpendicular to the ground
        const e = { x: g.x + c.x, y: g.y + c.y };
        arrow(px, py, px + e.x * VEC, py - e.y * VEC, C.eff, 4);
        if (Math.abs(gT) * VEC > 9) {
          label("Σ along ground = 0 ✓",
            px + tHat.x * 100, py - tHat.y * 100, C.eff, "center");
        }
      }

      // the point itself
      ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU);
      ctx.fillStyle = "#fff"; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.fill(); ctx.stroke();

      // readout
      if (readout) {
        const lat = Math.atan2(Math.sin(th), model.b * Math.cos(th)) / DEG; // geodetic-ish
        const latTxt = Math.round(Math.abs(lat) > 90 ? 180 - Math.abs(lat) : Math.abs(lat)) +
          "°" + (lat >= 0 ? "N" : "S");
        const pct = Math.abs(cT) * 100;
        readout.textContent = drift
          ? "lat " + latTxt + " · sideways pull " + pct.toFixed(0) + "% of g, toward the equator"
          : "lat " + latTxt + " · poleward " + (Math.abs(gT) * 100).toFixed(0) +
            "% ⇆ equatorward " + pct.toFixed(0) + "% · net 0";
      }
    }

    /* ---------- animation loop (rAF self-throttles in hidden tabs) ---------- */
    function frame(ms) {
      const t = ms / 1000;
      const dt = Math.min(0.032, t - lastT || 0.016);
      lastT = t;
      if (!interacted && !reduceMotion) th = (45 + 26 * Math.sin(t * 0.5)) * DEG;
      stepDroplets(dt);
      draw(t);
      rafId = requestAnimationFrame(frame);
    }
    function start() { if (!rafId) rafId = requestAnimationFrame(frame); }

    /* ---------- input ---------- */
    function onPointer(e) {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const my = (e.clientY - rect.top) * (H / rect.height);
      const ux = (mx - CX) / R, uy = (CY - my) / R;
      if (Math.hypot(ux, uy) < 0.12) return;              // dead zone at the centre
      th = Math.atan2(uy / model.b, ux);
      interacted = true;
    }
    canvas.addEventListener("pointermove", onPointer);
    canvas.addEventListener("pointerdown", onPointer);

    $(ids.rain).addEventListener("click", () => { rain(); start(); });
    $(ids.reset).addEventListener("click", () => {
      droplets = []; pools = { right: 0, left: 0 };
      interacted = false;
      draw(lastT);
    });

    window.addEventListener("resize", fit);
    fit();
    start();
  }

  makeForceWidget(
    { canvas: "sphere-canvas", readout: "sphere-readout", rain: "sphere-rain", reset: "sphere-reset" },
    { flattening: 0, droplets: "drift" }
  );
  makeForceWidget(
    { canvas: "ellipse-canvas", readout: "ellipse-readout", rain: "ellipse-rain", reset: "ellipse-reset" },
    { flattening: FLAT, droplets: "stay" }
  );
})();
