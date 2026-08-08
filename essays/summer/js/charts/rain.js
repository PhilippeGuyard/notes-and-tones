/* Seasonal rain shift for the chosen city's region: range bands, not points. */
import { C, svgIn } from "../lib.js";

export function rainChart(el, regions) {
  const W = 720, H = 420, M = { l: 90, r: 60 };
  const AXIS_Y = 210;
  const svg = svgIn(el, W, H);
  const x = d3.scaleLinear().domain([-50, 40]).range([M.l, W - M.r]);

  const title = svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26);
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46).attr("fill", C.inkSoft)
    .text("seasonal rainfall change by the 2050s, % · UKCP18, RCP4.5 50th to RCP8.5 90th pct");

  const axis = svg.append("g").attr("class", "axis");
  for (let t = -50; t <= 40; t += 10) {
    axis.append("line").attr("x1", x(t)).attr("x2", x(t))
      .attr("y1", 80).attr("y2", 340).attr("stroke", C.rule)
      .attr("stroke-width", t === 0 ? 1.5 : 0.5);
    axis.append("text").attr("x", x(t)).attr("y", 358)
      .attr("text-anchor", "middle").attr("font-size", ".64rem").attr("fill", C.inkSoft)
      .text((t > 0 ? "+" : "") + t + "%");
  }

  function band(y, color) {
    const g = svg.append("g").attr("opacity", 0);
    const rect = g.append("rect").attr("y", y).attr("height", 44).attr("rx", 4)
      .attr("fill", color).attr("fill-opacity", 0.55).attr("stroke", color);
    const name = g.append("text").attr("x", M.l - 12).attr("y", y + 27)
      .attr("text-anchor", "end").attr("font-size", ".74rem").attr("font-weight", 700);
    const lab = g.append("text").attr("y", y + 27).attr("font-size", ".68rem")
      .attr("fill", C.inkSoft);
    return { g, rect, name, lab };
  }
  const summer = band(110, C.story);
  const winter = band(230, C.data);

  const tempNote = svg.append("text").attr("x", M.l).attr("y", 400)
    .attr("font-size", ".72rem").attr("fill", C.story).attr("font-weight", 600)
    .attr("opacity", 0);

  let region = null, step = 0;

  function setBand(b, name, range, dur) {
    const [a, z] = [Math.min(...range), Math.max(...range)];
    b.rect.transition().duration(dur).attr("x", x(a)).attr("width", x(z) - x(a));
    b.name.text(name);
    b.lab.transition().duration(dur).attr("x", x(z) + 10)
      .text(`${range[0] > 0 ? "+" : ""}${range[0]}% to ${range[1] > 0 ? "+" : ""}${range[1]}%`);
  }

  function draw(dur) {
    if (!region) return;
    title.text(`Rain in ${region.label}, 2050s`);
    setBand(summer, "summer", region.summer_pct, dur);
    setBand(winter, "winter", region.winter_pct, dur);
    summer.g.transition().duration(dur).attr("opacity", 1);
    winter.g.transition().duration(dur).attr("opacity", step >= 1 ? 1 : 0);
    tempNote.transition().duration(dur).attr("opacity", step >= 2 ? 1 : 0)
      .text(`summer afternoons also warm by +${region.summer_t[0]} to +${region.summer_t[1]}°C on average`);
  }

  return {
    onStep(s) { step = s; draw(600); },
    setRegion(r) { region = r; draw(400); },
  };
}
