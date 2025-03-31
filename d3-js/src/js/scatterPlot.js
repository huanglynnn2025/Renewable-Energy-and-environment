// Create scatter plot: https://ncoughlin.com/posts/d3-scatter-plot-visualization

export function createScatterPlot(data, containerId) {
  console.log("Creating scatter plot");
  // Set up the dimensions and margins of the graph
  const container = document.getElementById(containerId);
  const { width: containerWidth, height: containerHeight } =
    container.getBoundingClientRect();

  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;

  // Start with a linear scale
  let x = d3
    .scaleLinear()
    .range([margin.left, width - margin.right])
    .domain([0, d3.max(data, (d) => d.gdp)]);

  const y = d3
    .scaleLinear()
    .range([height - margin.bottom, margin.top])
    .domain([0, d3.max(data, (d) => d.CO2)]);

  const colorScatter = d3
    .scaleOrdinal(["#9dcee6", "#9fdfc8", "#fae191"])
    .domain([...new Set(data.map((d) => d.IncomeGroup))]);

  const opacityScatter = d3
    .scaleLinear()
    .range([0.2, 1])
    .domain(d3.extent(data, (d) => d.Year));

  const svg = d3
    .create("svg")
    .attr("width", containerWidth)
    .attr("height", containerHeight)
    .attr("class", "scatter-plot_svg")
    .attr("viewBox", [0, 0, width, height]);

  const tooltip = d3.select("#tooltip");

  const gXAxis = svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .attr("class", "scatter-plot_axis")
    .call(d3.axisBottom(x).ticks(10, "~s"))
    .call((g) =>
      g
        .append("text")
        .attr("class", "axis-label")
        .attr("x", width - margin.right)
        .attr("y", 40)
        .attr("fill", "currentColor")
        .attr("text-anchor", "end")
        .text("GDP per capita (USD) - Scale: Linear")
    );

  const gYAxis = svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .attr("class", "scatter-plot_axis")
    .call(d3.axisLeft(y))
    .call((g) =>
      g
        .append("text")
        .attr("x", 20 - margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text("↑ CO2 Emissions (per capita)")
    );

  const dots = svg
    .selectAll(".dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "scatter-plot_dot")
    .attr("r", 0)
    .attr("cx", (d) => x(d.gdp))
    .attr("cy", (d) => y(d.CO2))
    .attr("fill", (d) => colorScatter(d.IncomeGroup))
    .attr("opacity", (d) => opacityScatter(d.Year))
    .on("mouseover", (event, d) => {
      d3.select(event.target).transition().attr("r", 6);
      tooltip
        .style("visibility", "visible")
        .style("left", event.pageX - 100 + "px")
        .style("top", event.pageY - 80 + "px")
        .html(
          `<strong>${d.CountryName}</strong> in ${d.Year}<br>CO2 Emissions: ${d.CO2}<br>GDP per capita (USD): ${d.gdp}`
        );
    })
    .on("mouseout", () => {
      d3.selectAll(".scatter-plot_dot").attr("r", 3.5);
      tooltip.style("visibility", "hidden");
    });

  dots
    .transition()
    .delay((d, i) => (d.Year - 1990) * 40)
    .duration(1000)
    .attr("r", 3.5);

  const hurdle = 16000;

  const scaleLine = svg
    .append("line")
    .attr("x1", x(hurdle))
    .attr("y1", margin.top)
    .attr("x2", x(hurdle))
    .attr("y2", height - margin.bottom)
    .attr("stroke", "gray")
    .attr("stroke-dasharray", "5,5");

  // Shift left and right: https://observablehq.com/@d3/multitouch
  let lastSide = "right"; // starting on the right

  svg.on("mousemove", function (event) {
    const mousePosition = d3.pointer(event);
    const currentSide = mousePosition[0] < x(hurdle) ? "left" : "right";

    if (currentSide !== lastSide) {
      lastSide = currentSide;
      x =
        currentSide === "right"
          ? d3
              .scaleLinear()
              .range([margin.left, width - margin.right])
              .domain([0, d3.max(data, (d) => d.gdp)])
          : d3
              .scaleLog()
              .range([margin.left, width - margin.right])
              .domain([400, d3.max(data, (d) => d.gdp)])
              .clamp(true);

      gXAxis
        .transition("x-axis-transition")
        .duration(500)
        .call(d3.axisBottom(x).ticks(10, currentSide === "right" ? "~s" : "s"));

      dots
        .transition("dots-transition")
        .duration(500)
        .attr("cx", (d) => x(d.gdp));

      scaleLine
        .transition("scale-line-transition")
        .duration(500)
        .attr("x1", x(hurdle))
        .attr("x2", x(hurdle));

      // svg.selectAll(".scatter-plot_line").remove();

      svg
        .select(".axis-label")
        .text(
          `GDP per capita (USD) - Scale: ${
            currentSide === "right" ? "Linear" : "Logarithmic"
          }`
        );
    }
  });

  // Append the SVG to the container
  container.appendChild(svg.node());
}
