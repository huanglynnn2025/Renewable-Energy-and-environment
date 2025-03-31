const rename = new Map([
  ["United States", "United States of America"],
]);

export function parseData(data) {
  data.forEach((d) => {
    d.CountryName = rename.get(d.CountryName) || d.CountryName;
    d.alter_energy_use = +d.alter_energy_use;
    d.fossil_fuel_use = +d.fossil_fuel_use;
    d.renewable_energy_use = +d.renewable_energy_use;
    d.renewable_energy_output = +d.renewable_energy_output;
    d.gdp = +d.gdp;
    d.CO2 = +d.CO2;
    d.area_forest = +d.area_forest;
    d.area_land = +d.area_land;
    d.area_surface = +d.area_surface;
  });

  function calculateRanks(data, key) {
    const nestedData = d3.groups(data, (d) => d.Year);
    nestedData.forEach(([year, values]) => {
      values.sort((a, b) => b[key] - a[key]);
      values.forEach((d, i) => {
        d[`rank_${key}`] = i + 1;
      });
    });
  }

  // Calculate ranks for each type of energy use
  calculateRanks(data, "alter_energy_use");
  calculateRanks(data, "fossil_fuel_use");
  calculateRanks(data, "renewable_energy_use");
}
