// Create line chart, multiple series: https://observablehq.com/@d3/multi-line-chart/2

export function createLineChart(data, containerId) {
  console.log("Creating line chart");
  // Set up the dimensions and margins of the graph
  const container = document.getElementById(containerId);
  const { width: containerWidth, height: containerHeight } =
    container.getBoundingClientRect();
  const lineMargin = { top: 40, right: 100, bottom: 30, left: 40 };
  const width = containerWidth;
  const height = containerHeight;

  // Aggregate data by year and country
  const aggregatedData = d3.rollups(
    data,
    (v) => d3.mean(v, (d) => d.renewable_energy_use),
    (d) => d.Year,
    (d) => d.CountryName
  );

  // Get data
  const years = Array.from(new Set(data.map((d) => d.Year)));
  const countries = Array.from(new Set(data.map((d) => d.CountryName)));

  const series = countries.map((country) => ({
    name: country,
    group: data.find((d) => d.CountryName === country).IncomeGroup,
    values: years.map((year) => {
      const yearData = aggregatedData.find((d) => d[0] === year);
      const countryData = yearData
        ? yearData[1].find((d) => d[0] === country)
        : null;
      const incomeGroup = data.find(
        (d) => d.CountryName === country && d.Year === year
      ).IncomeGroup;

      return {
        name: country,
        incomeGroup: incomeGroup,
        year: year,
        value: countryData ? countryData[1] : 0,
      };
    }),
  }));

  const tooltip = d3.select("#tooltip");

  // Create scales
  const x = d3
    .scaleLinear()
    .domain(d3.extent(years))
    .range([lineMargin.left, width - lineMargin.right]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(series, (s) => d3.max(s.values, (d) => d.value))])
    .nice()
    .range([height - lineMargin.bottom, lineMargin.top]);

  // Color scale for different income groups
  const colorScale = d3
    .scaleOrdinal(["#9dcee6", "#9fdfc8", "#fae191"])
    .domain([...new Set(data.map((d) => d.IncomeGroup))]);

  // Create line
  // Different types of curve: https://d3js.org/d3-shape/curve
  const line = d3
    .line()
    .x((d) => x(d.year))
    .y((d) => y(d.value))
    .curve(d3.curveCatmullRom.alpha(0.5));

  // Areas: https://d3js.org/d3-shape/area
  const area = d3
    .area()
    .x((d) => x(d.year))
    .y0(y(0))
    .y1((d) => y(d.value))
    .curve(d3.curveCatmullRom.alpha(0.5));

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("class", "line-chart_svg");

  // Add the horizontal axis
  svg
    .append("g")
    .attr("transform", `translate(0,${height - lineMargin.bottom})`)
    .attr("class", "line-chart_axis")
    .call(
      d3
        .axisBottom(x)
        .tickFormat(d3.format("d"))
        .ticks(width / 80)
        .tickSizeOuter(0)
    )
    .call((g) =>
      g
        .append("text")
        .attr("x", width -lineMargin.right + 15)
        .attr("y", 17)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text("Year")
    );

  // Add the vertical axis
  svg
    .append("g")
    .attr("transform", `translate(${lineMargin.left},0)`)
    .attr("class", "line-chart_axis")
    .call(d3.axisLeft(y))
    .call((g) => g.select(".domain").remove()) // remove y-axis line
    .call((g) =>
      g
        .selectAll(".tick line")
        .clone()
        .attr("x2", width - lineMargin.left - lineMargin.right)
        .attr("stroke-opacity", 0.1)
    )
    .call((g) =>
      g
        .append("text")
        .attr("x", -lineMargin.left)
        .attr("y", 15)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text("↑ Renewable Energy Use (%)")
    );

  // Define the gradients
  const defs = svg.append("defs");

  series.forEach((s) => {
    const gradient = defs
      .append("linearGradient")
      .attr("id", `gradient-${s.name.replace(/\s+/g, "-")}`)
      .attr("x1", "0%")
      .attr("x2", "0%")
      .attr("y1", "0%")
      .attr("y2", "100%");

    // Gradient starts
    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", colorScale(s.group))
      .attr("stop-opacity", 0.6);

    // Gradient ends
    gradient
      .append("stop")
      .attr("offset", "70%")
      .attr("stop-color", colorScale(s.group))
      .attr("stop-opacity", 0);
  });

  // Draw the areas
  svg
    .append("g")
    .selectAll("path")
    .data(series)
    .join("path")
    .attr("class", "line-chart_area")
    .attr("d", (d) => area(d.values))
    .attr("fill", (d) => `url(#gradient-${d.name.replace(/\s+/g, "-")})`);

  // Draw the lines
  const path = svg
    .append("g")
    .attr("fill", "none")
    .attr("stroke-width", 1.5)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .selectAll("path")
    .data(series)
    .join("path")
    .attr("class", "line-chart_line")
    .attr("d", (d) => line(d.values))
    .attr("stroke", (d) => colorScale(d.group))
    .attr("stroke-width", 3)
    .each(function (d) {
      d.values.sort((a, b) => b.year - a.year); // ensure the last value is for the latest year
      const lastValue = d.values[0]; // last value in the sorted array

      const length = this.getTotalLength();

      d3.select(this)
        .attr("stroke-dasharray", length + " " + length)
        .attr("stroke-dashoffset", length)
        .transition("draw") // animation
        .duration(2500)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);

      if (
        !["Brazil", "Sweden", "New Zealand", "Switzerland", "Canada"].includes(
          d.name
        )
      ) {
        return;
      }
      svg
        .append("text")
        .attr(
          "transform",
          `translate(${x(lastValue.year)},${y(lastValue.value)})`
        )
        .attr("x", 5) // offset a bit to the right
        .attr("dy", ".35em")
        .attr("text-anchor", "start")
        .attr("class", "text-xs")
        .text(d.name);
    });

  // Add an invisible layer for the interactive tip.
  const dot = svg.append("g").attr("display", "none");

  dot.append("circle").attr("r", 5).attr("class", "line-chart_dot");

  svg
    .on("pointerenter", pointerentered)
    .on("pointermove", pointermoved)
    .on("pointerleave", pointerleft)
    .on("touchstart", (event) => event.preventDefault());

  // Append the SVG to the container
  container.appendChild(svg.node());

  // Pointer move event handler
  function pointermoved(event) {
    const [xm, ym] = d3.pointer(event);
    const i = d3.leastIndex(
      series.flatMap((s) => s.values),
      (d) => Math.hypot(x(d.year) - xm, y(d.value) - ym)
    );

    const { year, value, name } = series.flatMap((s) => s.values)[i];
    // Highlight the lines
    path
      .attr("stroke-opacity", (d) => (d.name === name ? "1" : "0.2"))
      .filter((d) => d.name === name)
      .raise();

    // Tooltip for dots
    tooltip
      .style("visibility", "visible")
      .style("top", `${event.pageY - 20}px`)
      .style("left", `${event.pageX + 20}px`)
      .html(`<strong>${name}</strong><br>${year}: ${value.toFixed(2)}%`);

    dot.attr("transform", `translate(${x(year)},${y(value)})`);

    svg.property("value", { year, value, name });

    svg
      .selectAll(".line-chart_area")
      .attr("fill-opacity", (d) => (d.name === name ? 0.6 : 0.1));
  }

  // Pointer enter event handler
  function pointerentered() {
    path.attr("stroke-opacity", 0.2);
    dot.attr("display", null);
    svg.selectAll(".line-chart_area").attr("fill-opacity", 0.1);
  }

  // Pointer leave event handler
  function pointerleft() {
    path.transition().duration(300).attr("stroke-opacity", 1);
    dot.attr("display", "none");
    tooltip.style("visibility", "hidden");
    svg.node().value = null;
    svg.selectAll(".line-chart_area").attr("fill-opacity", 0.6);
  }
}
