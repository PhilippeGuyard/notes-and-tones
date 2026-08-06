# The Pull of the Equator — design

**Slug:** `bulge` · **Format:** 1 (single-file essay: `essays/bulge.html` + `essays/bulge.js`, shared `styles.css`)

## Idea

Remake of an old Flash animation: why air and oceans don't pile up at the equator.
Two mouse-driven canvas widgets, same layout/colours so they read as "same forces, different shape".

1. **Sphere** — at the mouse point P: gravity (thick, toward centre) and centrifugal
   (thick, away from the *axis*, ∝ cos φ). Thin dashed projection lines decompose the
   centrifugal vector into normal + tangential; the tangential part (rose) points
   equatorward and **nothing cancels it**. A "release the rain" button drops droplets
   that slide to the equator and pool into a visible bulge of water.
2. **Oblate earth** — surface tilts, so gravity picks up a poleward tangential
   component. Thin dashed projections drop **both** thick vectors onto the tangent:
   two thin opposite arrows of equal length (periwinkle vs marigold), tail-to-tail at
   P, with a "Σ∥ = 0 ✓" badge. Normal parts merge into one effective-gravity arrow,
   exactly perpendicular to the ground. Droplets stay put.

## Physics model (exact, toy)

Uniform-density interior model: gravity **linear in distance from centre**, g = −G·P.
Centrifugal c = ω²·(x, 0). On the ellipse P(θ) = (a cos θ, b sin θ):

- gravity·T = G(a² − b²) sin θ cos θ  (poleward)
- centrifugal·T = −ω² a² sin θ cos θ  (equatorward)
- **exact balance at every latitude when ω²/G = 1 − (b/a)²**

Constants: MU = ω²/G = 0.4 (centrifugal at equator = 40 % of g, ≈ 115× real),
flattening f = 1 − √(1 − MU) ≈ 0.225. Sphere widget = same model, f = 0.
Droplets integrate θ̈ = k·residual(θ) − damping·θ̇; on the ellipse the residual is
identically 0, so "they stay put" is the physics, not a special case.

## Essay structure

Sections: 01 a spinning planet (setup, exaggeration note) · 02 the sphere that can't
hold still (widget 1 + JS snippet of the decomposition) · 03 the planet fights back
(widget 2 + JS snippet of the balance condition) · 04 the real numbers (0.34 % of g,
21 km bulge, 1/298, Chimborazo; honesty note: toy model predicts ~half the real
bulge — the bulge's own gravity does the rest, Clairaut).

## Code architecture

`essays/bulge.js`, one IIFE, no innerHTML:
- `makeModel(f, mu)` — pure geometry/forces (point, tangent, normal, gravity,
  centrifugal, residual); console.assert self-test block (residual ≈ 0 on tuned
  ellipse at many latitudes, < 0 on sphere, N/S antisymmetry, max near 45°).
- `makeForceWidget(ids, {flattening, droplets: "drift"|"stay"})` — shared renderer:
  DPR-scaled canvas 900×520 (breaks out of the prose column via .chart-wide),
  pointer → nearest-θ, idle sweep until first pointer interaction, always-on rAF
  loop (Chrome suspends rAF itself when the window is hidden), arrow/projection
  helpers, droplet integrator + equatorial pools, readout line, rain/reset buttons.

Colours: gravity --A periwinkle, centrifugal --b marigold, unbalanced pull --a rose,
effective gravity --B teal, water teal. Bespoke CSS added to `styles.css`
(`.force-canvas`, legend swatches, hero motif). Canvas-unsupported → fallback text.
