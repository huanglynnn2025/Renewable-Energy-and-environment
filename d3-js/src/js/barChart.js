export function createBarChart(data, aggAttribute, containerId) {
  console.log("Creating bar chart");
  // Set up the dimensions and margins of the graph
  const container = document.getElementById(containerId);
  const { width: containerWidth, height: containerHeight } =
    container.getBoundingClientRect();

  const margin = { top: 40, right: 0, bottom: 30, left: 60 }; // adjusted for better layout
  const widthBar = containerWidth - margin.left - margin.right;
  const heightBar = containerHeight - margin.top - margin.bottom;

  // Aggregate data by income groups
  const aggData = d3.rollups(
    data,
    (v) => d3.mean(v, (d) => d[aggAttribute]),
    (d) => d.IncomeGroup
  );

  data = aggData.map((d) => {
    return {
      IncomeGroup: d[0],
      [aggAttribute]: d[1],
    };
  });

  // Create scales
  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.IncomeGroup))
    .range([margin.left, widthBar - margin.right])
    .padding(0.1);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d[aggAttribute])])
    .range([heightBar - margin.bottom, margin.top]);

  const colorScale = d3
    .scaleOrdinal(["#9dcee6", "#9fdfc8", "#fae191"])
    .domain([...new Set(data.map((d) => d.IncomeGroup))]);

  // Create the SVG container
  const svg = d3
    .create("svg")
    .attr("width", containerWidth)
    .attr("height", containerHeight)
    .attr("class", "bar-chart_svg");

  // X-axis
  svg
    .append("g")
    .attr("transform", `translate(0,${heightBar - margin.bottom})`)
    .attr("class", "bar-chart_axis")
    .call(d3.axisBottom(x))
    .call((g) =>
      g
        .append("text")
        .attr("x", widthBar - margin.right - 15)
        .attr("y", 20)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(`Income Groups`)
    );

  // Y-axis
  svg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .attr("class", "bar-chart_axis")
    .call(d3.axisLeft(y))
    .call((g) =>
      g
        .append("text")
        .attr("x", 20 - margin.left)
        .attr("y", 25)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text(`↑ ${aggAttribute} Emission (Average Reduction)`)
    );
  // Tooltip for interactivity
  const tooltip = d3.select("#tooltip");

  // Drawing bars
  const bar = svg
    .selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "bar-chart_bar")
    .attr("x", (d) => x(d.IncomeGroup))
    .attr("y", y(0))
    .attr("width", x.bandwidth())
    .attr("height", 0)
    .attr("fill", (d) => colorScale(d.IncomeGroup))
    .on("mouseover", (event, d) => {
      d3.selectAll(".scatter-plot_dot").each(function (scatterData) {
        if (scatterData.IncomeGroup === d.IncomeGroup) {
          d3.select(this).attr("r", 6);
        }
      });

      tooltip
        .style("visibility", "visible")
        .html(
          `Income Group: ${d.IncomeGroup}<br/>${aggAttribute}: ${d[
            aggAttribute
          ].toFixed(2)}`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    })
    .on("mouseout", () => {
      d3.selectAll(".scatter-plot_dot")
        .attr("r", 3.5)
        .attr("fill", (d) => colorScale(d.IncomeGroup));
      tooltip.style("visibility", "hidden");
    });

  // Animation
  bar
    .transition()
    .duration(1000)
    .attr("y", (d) => y(d[aggAttribute]))
    .attr("height", (d) => y(0) - y(d[aggAttribute]));

  // Append the SVG to the container
  container.appendChild(svg.node());
}
