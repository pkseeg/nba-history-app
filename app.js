const COLORS = { team1: "#e8e8e8", team2: "#f97316" };

let nbaData = null;
let teamNames = [];

async function init() {
  try {
    const res = await fetch("data/nba_data.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    nbaData = await res.json();
  } catch (err) {
    document.getElementById("loading").textContent =
      "failed to load data — run scraper.py first";
    return;
  }

  teamNames = Object.keys(nbaData).sort();
  document.getElementById("loading").style.display = "none";

  const sel1 = document.getElementById("team1");
  const sel2 = document.getElementById("team2");
  const bosIdx = teamNames.indexOf("Boston Celtics");
  const lalIdx = teamNames.indexOf("Los Angeles Lakers");

  teamNames.forEach((name, i) => {
    const o1 = new Option(name, name, i === bosIdx, i === bosIdx);
    const o2 = new Option(name, name, i === lalIdx, i === lalIdx);
    sel1.add(o1);
    sel2.add(o2);
  });

  sel1.addEventListener("change", render);
  sel2.addEventListener("change", render);
  render();
}

function mergeYears(s1, s2) {
  // Build year→value maps for both series
  const map1 = Object.fromEntries(s1.map((d) => [d.year, d.win_loss]));
  const map2 = Object.fromEntries(s2.map((d) => [d.year, d.win_loss]));

  const allYears = [...new Set([...Object.keys(map1), ...Object.keys(map2)])]
    .map(Number)
    .sort((a, b) => a - b);

  // For missing years, carry the last known value (or 0 if before franchise started)
  function fill(map, years) {
    const out = {};
    let last = 0;
    years.forEach((y) => {
      if (map[y] !== undefined) last = map[y];
      out[y] = last;
    });
    return out;
  }

  const filled1 = fill(map1, allYears);
  const filled2 = fill(map2, allYears);

  return allYears.map((y) => ({
    year: y,
    v1: filled1[y],
    v2: filled2[y],
  }));
}

function render() {
  const t1 = document.getElementById("team1").value;
  const t2 = document.getElementById("team2").value;
  const s1 = nbaData[t1];
  const s2 = nbaData[t2];
  const merged = mergeYears(s1, s2);

  const container = document.getElementById("chart");
  container.innerHTML = "";

  const margin = { top: 14, right: 14, bottom: 46, left: 56 };
  const totalWidth = container.clientWidth || 780;
  const width = totalWidth - margin.left - margin.right;
  const height = 340 - margin.top - margin.bottom;

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", totalWidth)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales
  const x = d3.scaleBand()
    .domain(merged.map((d) => d.year))
    .range([0, width])
    .padding(0.15);

  const allVals = merged.flatMap((d) => [d.v1, d.v2]);
  const vMin = Math.min(0, d3.min(allVals));
  const vMax = Math.max(0, d3.max(allVals));
  const pad = (vMax - vMin) * 0.06;

  const y = d3.scaleLinear()
    .domain([vMin - pad, vMax + pad])
    .range([height, 0]);

  const y0 = y(0);

  // Gridlines
  g.append("g")
    .attr("class", "gridlines")
    .selectAll("line")
    .data(y.ticks(6))
    .join("line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", (d) => y(d))
    .attr("y2", (d) => y(d))
    .attr("stroke", "#2a2a2a")
    .attr("stroke-width", 1);

  // Zero line
  g.append("line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", y0)
    .attr("y2", y0)
    .attr("stroke", "#444")
    .attr("stroke-width", 1.5);

  // Bars for team 2 (behind)
  g.selectAll(".bar2")
    .data(merged)
    .join("rect")
    .attr("class", "bar2")
    .attr("x", (d) => x(d.year))
    .attr("width", x.bandwidth())
    .attr("y", (d) => (d.v2 >= 0 ? y(d.v2) : y0))
    .attr("height", (d) => Math.abs(y(d.v2) - y0))
    .attr("fill", COLORS.team2)
    .attr("opacity", 0.45);

  // Bars for team 1 (front)
  g.selectAll(".bar1")
    .data(merged)
    .join("rect")
    .attr("class", "bar1")
    .attr("x", (d) => x(d.year))
    .attr("width", x.bandwidth())
    .attr("y", (d) => (d.v1 >= 0 ? y(d.v1) : y0))
    .attr("height", (d) => Math.abs(y(d.v1) - y0))
    .attr("fill", COLORS.team1)
    .attr("opacity", 0.85);

  // Invisible hover rects
  const tooltip = document.getElementById("tooltip");
  g.selectAll(".hover-rect")
    .data(merged)
    .join("rect")
    .attr("class", "hover-rect")
    .attr("x", (d) => x(d.year))
    .attr("width", x.bandwidth())
    .attr("y", 0)
    .attr("height", height)
    .attr("fill", "transparent")
    .on("mousemove", (event, d) => {
      const sign = (v) => (v >= 0 ? `+${v}` : `${v}`);
      tooltip.innerHTML =
        `<strong>${d.year - 1}–${String(d.year).slice(-2)}</strong><br>` +
        `<span style="color:${COLORS.team1}">${t1}</span>: ${sign(d.v1)}<br>` +
        `<span style="color:${COLORS.team2}">${t2}</span>: ${sign(d.v2)}`;
      tooltip.style.opacity = 1;
      tooltip.style.left = event.clientX + 14 + "px";
      tooltip.style.top = event.clientY - 10 + "px";
    })
    .on("mouseleave", () => {
      tooltip.style.opacity = 0;
    });

  // X-axis: only show every ~decade tick to avoid clutter
  const allYears = merged.map((d) => d.year);
  const tickStep = allYears.length > 50 ? 10 : 5;
  const xTicks = allYears.filter((y) => y % tickStep === 0);

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3
        .axisBottom(x)
        .tickValues(xTicks)
        .tickFormat((d) => `'${String(d).slice(-2)}`)
    )
    .call((ax) => ax.select(".domain").attr("stroke", "#333"))
    .call((ax) =>
      ax.selectAll("text")
        .attr("fill", "#888")
        .attr("font-size", "0.7rem")
    )
    .call((ax) => ax.selectAll(".tick line").attr("stroke", "#333"));

  // Y-axis
  g.append("g")
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("+,d")))
    .call((ax) => ax.select(".domain").remove())
    .call((ax) =>
      ax.selectAll("text")
        .attr("fill", "#888")
        .attr("font-size", "0.7rem")
    )
    .call((ax) => ax.selectAll(".tick line").attr("stroke", "#2a2a2a"));

  // Legend
  const legendEl = document.getElementById("legend");
  legendEl.innerHTML = `
    <div class="legend-item">
      <div class="legend-swatch" style="background:${COLORS.team1};opacity:0.85"></div>
      <span>${t1}</span>
    </div>
    <div class="legend-item">
      <div class="legend-swatch" style="background:${COLORS.team2};opacity:0.65"></div>
      <span>${t2}</span>
    </div>`;
}

init();
