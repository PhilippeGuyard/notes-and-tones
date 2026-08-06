/* The cost: one dot = ten lives lost or missing in the Mediterranean. Canvas. */
import { C, onVisible } from "../lib.js";

export function deathsChart(el, medDeaths) {
  const yrs = medDeaths.data.mediterranean.filter(d => d.year >= 2014);
  const perDot = 10;
  const cols = 14;                       // dots per row within a year column
  const dotR = 2.2, gap = 7;

  const colW = cols * gap + 26;
  const W = yrs.length * colW + 40;
  const maxRows = Math.ceil(d3.max(yrs, d => d.value) / perDot / cols);
  const H = maxRows * gap + 110;

  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = W * scale; canvas.height = H * scale;
  canvas.style.width = "100%";
  el.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  const total = d3.sum(yrs, d => d.value);
  const label = document.createElement("p");
  label.style.fontFamily = "var(--mono)";
  label.style.fontSize = ".78rem";
  label.style.color = "#9a8f7d";
  label.textContent =
    `${d3.format(",")(total)} people dead or missing, 2014–2026 · one dot = ${perDot} lives · IOM Missing Migrants`;
  el.appendChild(label);

  // precompute dot positions: columns per year, filling upward from baseline
  const dots = [];
  yrs.forEach((d, i) => {
    const n = Math.round(d.value / perDot);
    const x0 = 20 + i * colW;
    for (let k = 0; k < n; k++) {
      const row = Math.floor(k / cols), col = k % cols;
      dots.push({ x: x0 + col * gap, y: H - 70 - row * gap, yr: d.year });
    }
  });

  function drawUpTo(count) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#efe6d2";
    ctx.font = "10px 'IBM Plex Mono', monospace";
    yrs.forEach((d, i) => {
      ctx.fillText(String(d.year), 20 + i * colW, H - 46);
      ctx.fillText(d3.format(",")(d.value), 20 + i * colW, H - 30);
    });
    ctx.fillStyle = C.perception;
    for (let i = 0; i < count; i++) {
      ctx.beginPath();
      ctx.arc(dots[i].x, dots[i].y, dotR, 0, 7);
      ctx.fill();
    }
  }

  drawUpTo(0);
  onVisible(el, () => {
    const t0 = performance.now(), dur = 3500;
    (function tick(now) {
      const p = Math.min(1, (now - t0) / dur);
      drawUpTo(Math.floor(d3.easeCubicOut(p) * dots.length));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  });
}
