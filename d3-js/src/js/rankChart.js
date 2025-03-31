export function createRankChart(data,containerId,
  defaultRankType = "rank_renewable_energy_use") {
  console.log("Creating rank chart");
  // Set up the dimensions and margins of the graph
  const container = document.getElementById(containerId);
  const { width: containerWidth, height: containerHeight } =
    container.getBoundingClientRect();
  const margin = { top: 50, right: 120, bottom: 50, left: 30 };
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;

  // Create scales
  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.Year))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear().range([height - margin.bottom, margin.top]);
  
  // Create color scale for different income groups
  const colorScale = d3
    .scaleOrdinal(["#9dcee6", "#9fdfc8", "#fae191"])
    .domain([...new Set(data.map((d) => d.IncomeGroup))]);

  // Create symbol scale for differnet energy types
  const symbolScale = d3
    .scaleOrdinal()
    .domain([
      "rank_fossil_fuel_use",
      "rank_alter_energy_use",
      "rank_renewable_energy_use",
    ])
    .range([d3.symbolTriangle, d3.symbolCircle, d3.symbolSquare]);

  // Create the SVG container
  const svg = d3
    .create("svg")
    .attr("width", containerWidth)
    .attr("height", containerHeight)
    .attr("viewBox", [0, 0, width, height])
    .attr("class", "rank-chart_svg");

  // Append x-axis without domain
  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .attr("class", "rank-chart_axis x-axis")
    .call(
      d3
        .axisBottom(x)
        .tickFormat(d3.format("d"))
        .ticks(width / 80)
        .tickSizeOuter(0)
    )
    .call((g) => g.select(".domain").remove()); // remove the domain line

  // Append y-axis without domain
  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .attr("class", "rank-chart_axis y-axis")
    .call(d3.axisLeft(y))
    .call((g) => g.select(".domain").remove()) // remove the domain line
    .call((g) =>
      g
        .selectAll(".tick line")
        .clone()
        .attr("x2", width - margin.left - margin.right)
        .attr("stroke-opacity", 0.1)
    )
    .call((g) =>
      g
        .append("text")
        .attr("x", -margin.left)
        .attr("y", margin.top - 20)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .text("↑ Rank")
    );

  const line = d3
    .line()
    .x((d) => x(d.Year))
    .y((d) => y(d.rank))
    .curve(d3.curveMonotoneX);

  const ranks = [
    "rank_alter_energy_use",
    "rank_fossil_fuel_use",
    "rank_renewable_energy_use",
  ];
  const labels = [
    "Alter Energy Use Rank",
    "Fossil Fuel Use Rank",
    "Renewable Energy Use Rank",
  ];

  const tooltip = d3.select("#tooltip");

  // Dropdown select groups: https://d3-graph-gallery.com/graph/line_select.html
  function updateChart(rankType) {
    const countryData = d3
      .groups(data, (d) => d.CountryName)
      .map(([country, values]) => ({
        country,
        values: values.map((d) => ({
          IncomeGroup: d.IncomeGroup,
          Year: d.Year,
          rank: d[rankType],
        })),
      }));

    // Update y-domain based on the new rankType
    y.domain([d3.max(data, (d) => d[rankType]), 1]);

    svg
      .select(".y-axis")
      .call(d3.axisLeft(y))
      .call((g) => g.select(".domain").remove());

    // Define symbols and sizes
    const symbol = d3
      .symbol()
      .type((d) => symbolScale(rankType))
      .size(64); 

    const dots = svg
      .selectAll(".rank-chart_dot")
      .data(
        data,
        (d) => `${d.CountryName}-${d.Year}-${rankType}-${d[rankType]}`
      );

    dots
      .enter()
      .append("path")
      .attr("class", "rank-chart_dot")
      .attr("d", symbol)
      .attr("fill", (d) => colorScale(d.IncomeGroup))
      .attr("stroke", (d) => colorScale(d.IncomeGroup))
      .attr("stroke-width", 0)
      .attr("transform", (d) => `translate(${x(d.Year)}, ${y(d[rankType])})`)
      .merge(dots)
      .attr("d", symbol)
      .on("mouseover", function (event, d) {
        tooltip
          .html(
            `${labels[ranks.indexOf(rankType)]}: ${d[rankType]}<br>Country: ${
              d.CountryName
            }<br>Year: ${d.Year}`
          )
          .style("visibility", "visible")
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");

        // Highlight the dot animatedly
        d3.select(this)
          .raise()
          .transition()
          .duration(300)
          .attr("stroke-width", 2);
      })
      .on("mouseout", function () {
        tooltip.style("visibility", "hidden");

        // Unhighlight the dot animatedly
        svg
          .selectAll(".rank-chart_dot")
          .transition()
          .duration(300)
          .attr("stroke-width", 1);
      })
      .transition()
      .duration(500)
      .attr("transform", (d) => `translate(${x(d.Year)}, ${y(d[rankType])})`);

    dots.exit().remove();

    const lines = svg
      .selectAll(".rank-chart_line")
      .data(countryData, (d) => d.country);

    console.log(countryData);

    const enterlines = lines
      .enter()
      .append("path")
      .attr("class", "rank-chart_line")
      .on("mouseover", mouseoverHandler)
      .on("mouseout", mouseoutHandler)
      .attr("stroke", (d) => colorScale(d.values[0].IncomeGroup))
      .attr("stroke-width", 3)
      .attr("fill", "none")
      .attr("d", (d) => line(d.values))
      .each(function (d) {
        d.totalLength = this.getTotalLength();
        d3.select(this)
          .attr("stroke-dasharray", `${d.totalLength} ${d.totalLength}`)
          .attr("stroke-dashoffset", d.totalLength)
          .transition("line_enter")
          .duration(3000)
          .ease(d3.easeExpInOut)
          .attr("stroke-dashoffset", 0);
      });

    enterlines
      .merge(lines)
      .each(function (d) {
        d3.select(this)
          // Reset the total length to the new path
          .attr("stroke-dasharray", `${d.totalLength} ${d.totalLength}`)
          .attr("stroke-dashoffset", d.totalLength)
          .transition("line_update")
          .duration(500)
          .ease(d3.easeExpInOut)
          .attr("stroke-dashoffset", 0);
      })
      .transition("line_update")
      .duration(500)
      .attr("stroke", (d) => colorScale(d.values[0].IncomeGroup))
      .attr("stroke-width", 3)
      .attr("d", (d) => line(d.values));

    lines.exit().remove();
    // Append and update flags
    // Select or create groups for each country
    const flags = svg
      .selectAll(".rank-chart_group")
      .data(countryData, (d) => d.country);

    const flagGroups = flags
      .enter()
      .append("g")
      .attr("class", "rank-chart_group")
      .attr(
        "transform",
        (d) =>
          `translate(${x(d.values[d.values.length - 1].Year) + 10}, ${
            y(d.values[d.values.length - 1].rank) - 7
          })`
      )
      .on("mouseover", mouseoverHandler)
      .on("mouseout", mouseoutHandler);

    // Append flags within each group
    flagGroups
      .append("image")
      .attr("class", "rank-chart_flag")
      .attr("xlink:href", (d) => `/src/img/${d.country}.svg`)
      .attr("width", 20)
      .attr("height", 14)
      .attr("x", 0) // position relative to the group
      .attr("y", 0) // position relative to the group
      .style("cursor", "pointer");

    // Append text within each group
    flagGroups
      .append("text")
      .attr("class", "flag-label")
      .attr("x", 25) // offset to the right of the flag
      .attr("y", 7) // slightly offset vertically to align with the flag
      .text((d) => {
        if (d.country === "United States of America") {
          return "USA";
        }
        if (d.country === "United Kingdom") {
          return "UK";
        }
        return d.country;
      }) 
      .style("font-size", "10px")
      .style("text-anchor", "start")
      .style("alignment-baseline", "middle")
      .style("cursor", "pointer");

    // Update the group positions on update
    flags
      .merge(flagGroups)
      .transition()
      .duration(500)
      .attr(
        "transform",
        (d) =>
          `translate(${x(d.values[d.values.length - 1].Year) + 20}, ${
            y(d.values[d.values.length - 1].rank) - 7
          })`
      );

    // Remove any groups that no longer have corresponding data
    flags.exit().remove();

    function highlightElements(selectedCountry) {
      // Apply highlighting to lines, flags, and dots of the selected country
      svg
        .selectAll(".rank-chart_line, .rank-chart_flag, .rank-chart_dot")
        .each(function (d) {
          if (d.country === selectedCountry) {
            d3.select(this).classed("highlighted", true).raise(); // raise the selected elements
          } else {
            d3.select(this).classed("highlighted", false);
          }
        });

      // Highlight the line specifically and ensure it's more visible
      svg
        .selectAll(".highlighted.rank-chart_line")
        .transition("highlight")
        .attr("stroke-opacity", 1);

      // Reduce the opacity for non-highlighted lines, flags, and dots
      svg
        .selectAll(
          ".rank-chart_line:not(.highlighted), .rank-chart_flag:not(.highlighted), .rank-chart_dot:not(.highlighted)"
        )
        .transition("highlight")
        .attr("stroke-opacity", 0.2)
        .attr("opacity", 0.2);
    }

    function resetHighlight() {
      // Reset the styling for all lines, flags, and dots
      svg
        .selectAll(".rank-chart_line, .rank-chart_flag, .rank-chart_dot")
        .transition("reset")
        .attr("stroke-opacity", 1)
        .attr("opacity", 1);
    }

    function mouseoverHandler(_, d) {
      highlightElements(d.country);
    }

    function mouseoutHandler() {
      resetHighlight();
    }
  }

  // Initial update call with the default rank type
  updateChart(defaultRankType); 

  // Populate the country select input
  const select = document.getElementById("ranking-type");
  ranks.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.text = labels[ranks.indexOf(type)];
    if (type === defaultRankType) {
      option.selected = true;
    }
    select.add(option);
  });

  document
    .getElementById("ranking-type")
    .addEventListener("change", function () {
      const selectedRankType = this.value;
      updateChart(selectedRankType);
    });

  // Append the SVG to the container
  container.appendChild(svg.node());
}
