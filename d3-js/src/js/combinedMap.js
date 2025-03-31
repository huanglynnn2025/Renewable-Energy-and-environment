// Create map: https://observablehq.com/@d3/world-choropleth/2

export function createCombinedMap(data, containerId) {
  console.log("Creating combined map");
  // Set up the dimensions and margins of the graph
  const container = document.getElementById(containerId);
  const { width: containerWidth, height: containerHeight } =
    container.getBoundingClientRect();

  const projectionCombined = d3
    .geoMercator()
    .scale(150)
    .translate([containerWidth / 2, containerHeight / 2]);
  const pathCombined = d3.geoPath().projection(projectionCombined);

  // Calculate year range
  const yearRange = d3.extent(data, (d) => +d.Year);

  // Create color scale for forest area
  const colorScale = d3
    .scaleSequential(d3.interpolateGreens)
    .domain([0, d3.max(data, (d) => d.area_forest)]);

  const svgCombinedMap = d3
    .create("svg")
    .attr("width", containerWidth)
    .attr("height", containerHeight)
    .attr("class", "combined-map_svg");

  // Create zoomable map: https://observablehq.com/@d3/zoomable-map-tiles
  const zoom = d3
    .zoom()
    .scaleExtent([1, 3])
    .on("zoom", (event) =>
      svgCombinedMap.select("g.map-content").attr("transform", event.transform)
    );
  svgCombinedMap.call(zoom);

  const tooltip = d3.select("#tooltip");

  d3.json(
    "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
  ).then((world) => {
    const countryDataCombined = Object.fromEntries(
      d3.group(data, (d) => d.CountryName).entries()
    );
    const countriesFeatures = topojson.feature(
      world,
      world.objects.countries
    ).features;

    const g = svgCombinedMap.append("g").attr("class", "map-content");
    g.append("path")
      .datum(topojson.feature(world, world.objects.countries))
      .attr("d", pathCombined)
      .attr("class", "combined-map_background");

    const countries = g
      .selectAll(".country")
      .data(countriesFeatures)
      .enter()
      .append("path")
      .attr("class", "combined-map_country")
      .attr("d", pathCombined)
      .on("mouseover", (event, d) => {
        const countryData = getCountryData(d, slider.value);
        tooltip
          .style("visibility", "visible")
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px").html(`<strong>${
          d.properties.name
        }</strong><br/>
                 Forest Area: ${
                   countryData
                     ? countryData.area_forest.toLocaleString() + " sq km"
                     : "Data not available"
                 }`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
      });

    const circles = g
      .selectAll(".circle")
      .data(countriesFeatures)
      .enter()
      .append("circle")
      .attr("class", "combined-map_circle")
      .attr("fill-opacity", 0)
      .attr("stroke", "rgb(59 130 246)")
      .attr("stroke-width", 3)
      .attr("stroke-opacity", 1)
      .attr("r", 0)
      .attr("cx", (d) => {
        const countryData = getCountryData(d, 1991);
        return countryData
          ? projectionCombined([countryData.longitude, countryData.latitude])[0]
          : 0;
      })
      .attr("cy", (d) => {
        const countryData = getCountryData(d, 1991);
        return countryData
          ? projectionCombined([countryData.longitude, countryData.latitude])[1]
          : 0;
      })
      .on("mouseover", (event, d) => {
        const countryData = getCountryData(d, slider.value);
        tooltip
          .style("visibility", "visible")
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px").html(`<strong>${
          d.properties.name
        }</strong> in ${countryData.Year}<br/>
                 Forest Area: ${
                   countryData
                     ? countryData.area_forest.toLocaleString() + " sq km"
                     : "Data not available"
                 }<br/>
                 Renewable Energy Use Percentage: ${
                   countryData
                     ? countryData.renewable_energy_use + "%"
                     : "Data not available"
                 }`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
      });

    function getCountryData(country, year) {
      return (countryDataCombined[country.properties.name] || []).find(
        (cd) => cd.Year === String(year)
      );
    }

    // Update the map with forest area
    function updateMap(year) {
      console.log(year);
      countries
        .transition()
        .duration(1000)
        .attr("fill", (d) => {
          const countryData = getCountryData(d, year);
          return countryData ? colorScale(countryData.area_forest) : "#d3d3d3";
        });

      circles.each(function (d) {
        const circle = d3.select(this);
        const countryData = getCountryData(d, year);
        circle
          .transition()
          .duration(1000)
          .attr(
            "cx",
            countryData
              ? projectionCombined([
                  countryData.longitude,
                  countryData.latitude,
                ])[0]
              : 0
          )
          .attr(
            "cy",
            countryData
              ? projectionCombined([
                  countryData.longitude,
                  countryData.latitude,
                ])[1]
              : 0
          )
          .attr(
            "r",
            countryData ? Math.sqrt(countryData.renewable_energy_use * 50) : 0
          );
      });
    }

    // Setup the slider and the year label
    const slider = document.getElementById("year-slider");
    const yearLabel = document.getElementById("year-label");
    slider.min = yearRange[0];
    slider.max = yearRange[1];
    slider.value = yearRange[0];

    // Update the year label
    function updateYear(year) {
      yearLabel.textContent = year;
      updateMap(year);
    }

    updateYear(yearRange[0]);

    slider.addEventListener("input", (event) => {
      updateYear(+event.target.value);
    });

    // Play button functionality: https://stackoverflow.com/questions/42437908/d3-javascript-function-scope-with-setinterval-and-clearinterval-and-event-handl
    const playButton = document.getElementById("play-button");
    let playing = false;
    let timer;

    playButton.addEventListener("click", () => {
      if (playing) {
        clearInterval(timer);
        playButton.textContent = "Play";
        playing = false;
      } else {
        playButton.textContent = "Pause";
        playing = true;
        timer = setInterval(() => {
          let year = parseInt(slider.value, 10);
          year++;
          if (year > parseInt(slider.max, 10)) {
            year = parseInt(slider.min, 10);
          }
          slider.value = year;
          updateYear(year);
        }, 1000);
      }
    });

    // Add legend for color scale
    const legendWidth = 400;
    const legendHeight = 20;

    const legend = svgCombinedMap
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${20},${containerHeight - 40})`);

    // Set gradient color
    const gradient = legend
      .append("defs")
      .append("linearGradient")
      .attr("id", "gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", colorScale(colorScale.domain()[0]));

    gradient
      .append("stop")
      .attr("offset", "50%")
      .attr("stop-color", colorScale(colorScale.domain()[1] / 2));

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", colorScale(colorScale.domain()[1]));

    // Add legend color for forest
    legend
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#gradient)");

    // Add legend scale for forest
    const xScale = d3
      .scaleLinear()
      .domain(colorScale.domain())
      .range([0, legendWidth]);

    const xAxis = d3
      .axisBottom(xScale)
      .ticks(5)
      .tickSize(-legendHeight)
      .tickFormat((d) => d3.format(".0s")(d))
      .tickFormat((d, i) =>
        i === 5 ? d3.format(".0s")(d) + " sq. km" : d3.format(".0s")(d)
      );

    legend
      .append("g")
      .attr("transform", `translate(0,${legendHeight})`)
      .call(xAxis)
      .select(".domain")
      .remove();

    // Add legend for circle size
    const sizeLegend = svgCombinedMap
      .append("g")
      .attr("class", "size-legend")
      .attr("transform", `translate(${20},${containerHeight - 80})`);

    sizeLegend
      .append("circle")
      .attr("cx", 30)
      .attr("cy", 0)
      .attr("r", 20)
      .style("fill", "none")
      .attr("stroke", "rgb(59 130 246)")
      .attr("stroke-width", 3);

    sizeLegend
      .append("text")
      .attr("x", 140)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .text("Renewable Energy Use (%)");

    // Append the SVG to the container
    container.appendChild(svgCombinedMap.node());
  });
}
