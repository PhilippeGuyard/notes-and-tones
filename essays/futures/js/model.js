/* Pure warming model: no DOM, no d3, so it can be unit-checked in node.
   Warming(y) = warming_2025 + TCRE x cumulative CO₂ since 2026 - methane offset. */

export const POSITIONS = {
  coal: ["none", "2050", "2040"],
  road: ["none", "2040", "2035"],
  forest: ["none", "halt"],
  other: ["0", "25", "50"],
  methane: ["off", "on"],
  cdr: ["0", "5", "10"],
};

export const DEFAULTS = {
  coal: "none", road: "none", forest: "none",
  other: "0", methane: "off", cdr: "0",
};

/* linear phase-in of a wedge between y0 and y1 */
const ramp = (y, y0, y1, size) =>
  y <= y0 ? 0 : y >= y1 ? size : size * (y - y0) / (y1 - y0);

export function compute(M, s) {
  const W = M.wedges;
  const years = [], baseline = [], net = [], wedges = [];
  let cum = 0, peak = { t: -Infinity, year: M.start_year };

  for (let y = M.start_year; y <= M.end_year; y++) {
    const base = y <= M.baseline.flat_until ? M.baseline.level
      : M.baseline.level + (M.baseline.end_level - M.baseline.level)
        * (y - M.baseline.flat_until) / (M.end_year - M.baseline.flat_until);

    const w = {
      coal: s.coal === "none" ? 0 : ramp(y, W.coal.ramp_from, +s.coal, W.coal.size),
      road: s.road === "none" ? 0
        : ramp(y, W.road.ramp_from, +s.road + W.road.fleet_years, W.road.size),
      forest: s.forest === "none" ? 0 : ramp(y, W.forest.ramp_from, 2035, W.forest.size),
      other: s.other === "0" ? 0
        : ramp(y, W.other.ramp_from, W.other.done_by, W.other.size * (+s.other / 100)),
    };
    /* gross emissions cannot go below zero; a wedge cannot remove what is gone */
    const gross = Math.max(0, base - w.coal - w.road - w.forest - w.other);
    const cdr = s.cdr === "0" ? 0 : ramp(y, M.cdr.ramp_from, M.cdr.full_by, +s.cdr);
    const n = gross - cdr;

    if (y > M.start_year) cum += n; /* cumulative from 2026 */
    const methane = s.methane === "off" ? 0
      : ramp(y, M.methane.ramp_from, M.methane.full_by, M.methane.avoided_c);
    const t = M.warming_2025 + M.tcre * cum / 1000 - methane;
    if (t > peak.t) peak = { t, year: y };

    years.push(y); baseline.push(base); net.push(n); wedges.push(w);
  }

  const t2100 = M.warming_2025 + M.tcre * cum / 1000
    - (s.methane === "off" ? 0 : M.methane.avoided_c);
  return {
    years, baseline, net, wedges,
    cum,
    methane_c: s.methane === "off" ? 0 : M.methane.avoided_c,
    t2100,
    t2100_range: M.tcre_range.map(r => M.warming_2025 + r * cum / 1000
      - (s.methane === "off" ? 0 : M.methane.avoided_c)),
    peak: { t: peak.t, year: peak.year },
  };
}
