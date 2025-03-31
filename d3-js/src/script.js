console.log("Global Energy Transition and Environmental Impact page loaded");
import { parseData } from "./data.js";
import { createBarChart } from "./js/barChart.js";
import { createScatterPlot } from "./js/scatterPlot.js";
import { createCombinedMap } from "./js/combinedMap.js";
import { createLineChart } from "./js/lineChart.js";
import { createRankChart } from "./js/rankChart.js";

// Check if page loaded: https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event
document.addEventListener("DOMContentLoaded", () => {
  console.log("Global Energy Transition and Environmental Impact page loaded");

  // Load the data from the uploaded CSV file
  d3.csv("data.csv").then(function (data) {
    parseData(data); // Assume this modifies 'data' directly
    console.log(data);

    // Setup the Intersection Observer
    const observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            switch (id) {
              case "rank-chart":
                createRankChart(data, id);
                break;
              case "line-chart":
                createLineChart(data, id);
                break;
              case "bar-chart":
                createBarChart(data, "CO2", id);
                break;
              case "scatter-plot":
                createScatterPlot(data, id);
                break;
              case "combined-map":
                createCombinedMap(data, id);
                break;
            }
            observer.unobserve(entry.target); // stop observing after loading
          }
        });
      },
      { threshold: 0.5 }
    ); // trigger when 50% of the element is visible

    // Add each chart div to the observer
    document.querySelectorAll(".chart").forEach((chart) => {
      observer.observe(chart);
    });
  });
});
