/* Myth 3b: EU irregular crossings by route, monthly stacked area 2009–2026. */
import { C, svgIn, fmt, tooltip } from "../lib.js";

const ROUTE_COLORS = d3.scaleOrdinal()
  .range(["#14606a", "#a87b2d", "#c33d1c", "#5b7d4b", "#7a5c8f", "#8d8d7a", "#b0a48c"]);

export function frontexChart(el, frontex) {
  const W = 720, H = 520, M = { t: 64, r: 24, b: 40, l: 58 };
  const svg = svgIn(el, W, H);
  const tip = tooltip();
  const parse = d3.timeParse("%Y-%m");

  // keep the 5 biggest routes, lump the rest into "Other routes"
  const totals = d3.rollups(frontex.data.annual, v => d3.sum(v, d => d.value), d => d.route)
    .sort((a, b) => b[1] - a[1]);
  const top = totals.slice(0, 5).map(d => d[0]);
  const routeOf = r => top.includes(r) ? r : "Other routes";
  const routes = [...top, "Other routes"];
  ROUTE_COLORS.domain(routes);

  const monthsSet = new Set();
  const cell = new Map(); // month -> route -> v
  for (const [route, series] of Object.entries(frontex.data.monthly)) {
    for (const { m, v } of series) {
      monthsSet.add(m);
      const key = routeOf(route);
      if (!cell.has(m)) cell.set(m, {});
      cell.get(m)[key] = (cell.get(m)[key] || 0) + v;
    }
  }
  const months = [...monthsSet].sort();
  const wide = months.map(m => ({ date: parse(m), m, ...Object.fromEntries(routes.map(r => [r, cell.get(m)?.[r] || 0])) }));
  const stack = d3.stack().keys(routes)(wide);

  const x = d3.scaleTime().domain(d3.extent(wide, d => d.date)).range([M.l, W - M.r]);
  const y = d3.scaleLinear().domain([0, d3.max(wide, d => d3.sum(routes, r => d[r]))])
    .nice().range([H - M.b, M.t]);

  svg.append("text").attr("class", "chart-title").attr("x", 24).attr("y", 28)
    .text("Irregular crossings into the EU, by route");
  svg.append("text").attr("class", "anno").attr("x", 24).attr("y", 46)
    .attr("fill", C.inkSoft).text("Frontex monthly detections: detections, not unique people");

  const gx = svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${H - M.b})`);
  const gy = svg.append("g").attr("class", "axis")
    .attr("transform", `translate(${M.l},0)`);

  const areaGen = d3.area()
    .x(d => x(d.data.date)).y0(d => y(d[0])).y1(d => y(d[1]))
    .curve(d3.curveBasis);

  const layers = svg.append("g").selectAll("path").data(stack).join("path")
    .attr("fill", d => ROUTE_COLORS(d.key))
    .attr("opacity", .85)
    .on("mousemove", (ev, d) => {
      const [mx] = d3.pointer(ev, svg.node());
      const row = wide[d3.bisector(r => r.date).center(wide, x.invert(mx))];
      tip.show([d.key, `${row.m}: ${fmt.n(row[d.key])} detections`], ev);
    })
    .on("mouseleave", () => tip.hide());

  const legend = svg.append("g").attr("transform", `translate(${M.l + 8},${M.t + 4})`);
  routes.forEach((r, i) => {
    const g = legend.append("g").attr("transform", `translate(0,${i * 18})`);
    g.append("rect").attr("width", 11).attr("height", 11).attr("rx", 2)
      .attr("fill", ROUTE_COLORS(r));
    g.append("text").attr("x", 16).attr("y", 10).attr("font-size", ".64rem").text(r);
  });

  const assad = svg.append("g").attr("opacity", 0);

  function draw(domain) {
    x.domain(domain);
    const visible = wide.filter(d => d.date >= domain[0] && d.date <= domain[1]);
    y.domain([0, d3.max(visible, d => d3.sum(routes, r => d[r]))]).nice();
    gx.transition().duration(1000).call(d3.axisBottom(x).ticks(7));
    gy.transition().duration(1000).call(d3.axisLeft(y).ticks(6).tickFormat(fmt.k));
    layers.transition().duration(1000).attr("d", areaGen);
    assad.selectAll("*").remove();
    const ad = parse("2024-12");
    if (ad >= domain[0] && ad <= domain[1]) {
      assad.append("line").attr("x1", x(ad)).attr("x2", x(ad))
        .attr("y1", M.t + 80).attr("y2", H - M.b)
        .attr("stroke", C.ink).attr("stroke-dasharray", "4 4");
      assad.append("text").attr("class", "anno").attr("x", x(ad) - 6)
        .attr("y", M.t + 96).attr("text-anchor", "end").attr("font-weight", 600)
        .text("Assad falls");
    }
  }

  const full = d3.extent(wide, d => d.date);
  draw(full);

  return {
    onStep(i) {
      if (i === 0) { draw(full); assad.attr("opacity", 0); }
      else { draw([parse("2017-01"), full[1]]); assad.transition().duration(400).attr("opacity", 1); }
    },
  };
}
