/* The climate line: your city's annual mean slides right to 2050, where the
   analog cities already live. Honest axis, no basemap theatrics. */
import { C, svgIn } from "../lib.js";

export function analogChart(el) {
  const W = 720, H = 420, M = { l: 60, r: 60 };
  const AXIS_Y = 240;
  const svg = svgIn(el, W, H);
  const x = d3.scaleLinear().domain([7, 16]).range([M.l, W - M.r]);

  const title = svg.append("text").attr("class", "chart-title").attr("x", 8).attr("y", 26);
  svg.append("text").attr("class", "anno").attr("x", 8).attr("y", 46).attr("fill", C.inkSoft)
    .text("annual mean temperature, °C · Bastin et al. (2019), RCP4.5, 2050");

  const axis = svg.append("g").attr("class", "axis");
  axis.append("line").attr("x1", M.l - 10).attr("x2", W - M.r + 10)
    .attr("y1", AXIS_Y).attr("y2", AXIS_Y).attr("stroke", C.rule).attr("stroke-width", 1.5);
  for (let t = 7; t <= 16; t++) {
    axis.append("line").attr("x1", x(t)).attr("x2", x(t))
      .attr("y1", AXIS_Y - 4).attr("y2", AXIS_Y + 4).attr("stroke", C.rule);
    axis.append("text").attr("x", x(t)).attr("y", AXIS_Y + 22)
      .attr("text-anchor", "middle").attr("font-size", ".64rem").attr("fill", C.inkSoft)
      .text(t + "°");
  }

  const arc = svg.append("path").attr("fill", "none")
    .attr("stroke", C.story).attr("stroke-width", 2).attr("stroke-dasharray", "5 4");
  const nowDot = svg.append("circle").attr("cy", AXIS_Y).attr("r", 9).attr("fill", C.data);
  const nowLabel = svg.append("text").attr("y", AXIS_Y - 62)
    .attr("text-anchor", "middle").attr("font-size", ".74rem").attr("font-weight", 700);
  const nowSub = svg.append("text").attr("y", AXIS_Y - 46)
    .attr("text-anchor", "middle").attr("font-size", ".66rem").attr("fill", C.inkSoft);
  const futDot = svg.append("circle").attr("cy", AXIS_Y).attr("r", 9)
    .attr("fill", C.story).attr("opacity", 0);
  const futLabel = svg.append("text").attr("y", AXIS_Y - 62)
    .attr("text-anchor", "middle").attr("font-size", ".74rem").attr("font-weight", 700)
    .attr("fill", C.story).attr("opacity", 0);
  const analogG = svg.append("g").attr("opacity", 0);
  const analogLines = [0, 1, 2].map(i => analogG.append("text")
    .attr("y", AXIS_Y + 64 + i * 22).attr("text-anchor", "middle")
    .attr("font-size", i ? ".68rem" : ".8rem")
    .attr("font-weight", i ? 400 : 700)
    .attr("fill", i ? C.inkSoft : C.ink));

  let city = null, step = 0;

  function draw(dur) {
    if (!city) return;
    const x0 = x(city.annual_t), x1 = x(city.annual_t_2050);
    title.text(`${city.name} on the climate line`);
    nowDot.transition().duration(dur).attr("cx", x0);
    nowLabel.transition().duration(dur).attr("x", x0).text(`${city.name} today`);
    nowSub.transition().duration(dur).attr("x", x0)
      .text(`${city.annual_t}° · warmest afternoons ${city.wmax}°`);
    const on = step >= 1;
    futDot.transition().duration(dur).attr("cx", x1).attr("opacity", on ? 1 : 0);
    futLabel.transition().duration(dur).attr("x", x1).attr("opacity", on ? 1 : 0)
      .text(`${city.name} 2050 · ${city.annual_t_2050}°`);
    arc.transition().duration(dur)
      .attr("d", `M ${x0} ${AXIS_Y - 12} Q ${(x0 + x1) / 2} ${AXIS_Y - 90}, ${x1} ${AXIS_Y - 12}`)
      .attr("opacity", on ? 1 : 0);
    analogG.transition().duration(dur).attr("opacity", step >= 2 ? (step === 3 ? 0.45 : 1) : 0);
    analogLines[0].attr("x", x1).text(`${city.analogs[0].city} today`);
    analogLines[1].attr("x", x1).text(`then ${city.analogs[1].city}, ${city.analogs[2].city}`);
    analogLines[2].attr("x", x1).text("(closest whole-climate matches)");
  }

  return {
    onStep(s) { step = s; draw(700); },
    setCity(c) { city = c; draw(500); },
  };
}
