let svg, path, tooltip;
const startYear = 2011;
const endYear = 2023;
let selectedYear = 2023; // Start with the default year

// Define global variables for data
let populationData, diabetesLookup, geoData;

export function loadPopulationData() {
  loadData();
}

// Function to load data and display visualization
function loadData() {
  Promise.all([
    d3.csv("../data/usa-population.csv"),
    d3.csv("../data/DiabetesStates.csv"),
    d3.json("../data/states.geojson"),
  ])
    .then((data) => {
      // Set global data variables for dynamic updates
      populationData = data[0];
      diabetesLookup = calculateDiabetesRate(
        data[1],
        createPopulationLookup(data[0])
      );
      geoData = data[2];

      // Initial visualization setup for the default year (2023)
      drawMap(geoData, populationData, diabetesLookup);
      displayCSVData(formatDataForTable(populationData, diabetesLookup, "2023"));

      // Update title for the default year
      updateVisualizationTitle(2023);

      // Add year selection to the sidebar
      addYearSelection();
    })
    .catch((error) => console.error("Error loading data:", error));
}

function addYearSelection() {
  const yearContainer = d3.select("#year-selection");
  yearContainer.html(""); // Clear existing elements

  // Add label for year selection
  yearContainer
    .append("div")
    .attr("class", "mb-4")
    .append("label")
    .attr("for", "year-slider")
    .attr("class", "block text-sm font-medium text-gray-700")
    .text("Choose a year");

  // Create the slider with default value set to 2023
  const slider = yearContainer
    .append("input")
    .attr("type", "range")
    .attr("min", startYear)
    .attr("max", endYear)
    .attr("step", 1)
    .attr("value", 2023)  // Set default value to 2023
    .attr("id", "year-slider")
    .attr("class", "slider w-full h-2 bg-blue-200 rounded-full");

  // Display the current year next to the slider (default 2023)
  const yearLabel = yearContainer
    .append("span")
    .attr("id", "year-label")
    .attr("class", "ml-2 text-lg font-medium text-gray-700")
    .text(2023);  // Default year label

  // Update the year on slider change
  slider.on("input", function () {
    const selectedYear = this.value;
    yearLabel.text(selectedYear);
    updateVisualizationForYear(selectedYear);
  });

  // Call the update function with 2023 as default on page load
  updateVisualizationForYear(2023);
}

function updateVisualizationForYear(year) {
  selectedYear = year; // Update the global selected year

  // Update active button style
  d3.selectAll(".year-option").classed("active-year", false);
  d3.select(this).classed("active-year", true);

  // Update the table and map with the selected year's data
  const relevantData = formatDataForTable(
    populationData,
    diabetesLookup,
    selectedYear
  );
  displayCSVData(relevantData);

  // Clear and redraw map to reflect selected year data
  clearMap();
  drawPopulationMap(
    geoData,
    createPopulationLookup(populationData),
    diabetesLookup
  );

  // Update the title with the selected year
  updateVisualizationTitle(selectedYear);
}

// Function to update the visualization title with the selected year
function updateVisualizationTitle(year) {
  const title = `Population With Diabetes Year ${year}`;
  d3.select("#visualization-title").text(title);
}

// Function to create a lookup for population data
function createPopulationLookup(populationData) {
  const lookup = {};
  populationData.forEach((row) => {
    const stateName = row["Geographic Area"]; // Ensure this matches the column name in your CSV
    const totalPopulation = +row["Total Resident Population"]; // Make sure this matches the column in your CSV

    // Store the total population in the lookup
    if (stateName && !isNaN(totalPopulation)) {
      lookup[stateName] = totalPopulation; // Map state name to population
    } else {
      console.warn(`Invalid entry for population data: ${JSON.stringify(row)}`);
    }
  });
  return lookup;
}

// Function to calculate diabetes rate as a percentage of population
function calculateDiabetesRate(diabetesData, populationLookup) {
  const diabetesLookup = {};

  diabetesData.forEach((row) => {
    const state = row["States"] ? row["States"].trim() : null;
    if (!state) return;

    // Assuming diabetes rates are in different columns for different years
    Object.keys(row).forEach((year) => {
      if (!isNaN(year) && year >= 2011 && year <= 2023) {
        // Ensure we only process valid years
        const diabetesRate = +row[year]; // Get the rate for that year
        const population = populationLookup[state];

        // Calculate diabetes percentage if both values are available
        if (population && !isNaN(diabetesRate)) {
          const diabetesPopulation = (population * diabetesRate) / 100; // Calculate diabetes population
          diabetesLookup[state] = diabetesLookup[state] || {};
          diabetesLookup[state][year] = {
            rate: diabetesRate.toFixed(2), // Format to two decimal places
            population: Math.round(diabetesPopulation), // Round to nearest whole number
          };
        }
      }
    });
  });

  return diabetesLookup;
}

// Function to draw visualization with both population and diabetes data
function drawMap(geoData, populationLookup, diabetesLookup) {
  const visualizationContainer = document.getElementById("visualization");
  if (!visualizationContainer) {
    console.error("Visualization container not found");
    return;
  }

  // Clear any previous content
  clearMap();

  const width = visualizationContainer.clientWidth;
  const height = visualizationContainer.clientHeight;

  // Create SVG
  svg = d3
    .select("#visualization")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const projection = d3
    .geoAlbersUsa()
    .scale(1000)
    .translate([width / 2, height / 2]);

  path = d3.geoPath().projection(projection);

  // Initialize tooltip
  initTooltip();

  // Draw the map with population and diabetes data
  drawPopulationMap(geoData, populationLookup, diabetesLookup);
}

// Initialize tooltip
function initTooltip() {
  tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "white")
    .style("padding", "5px")
    .style("border", "1px solid gray")
    .style("border-radius", "5px")
    .style("display", "none");
}

// Draw population map function with diabetes data
function drawPopulationMap(geoData, populationLookup, diabetesLookup) {
  if (!geoData.features) {
    console.error("No features found in geoData.");
    return;
  }

  // Create a color scale for the gradient
  const colorScale = d3
    .scaleSequential()
    .domain([0, 40]) // Assuming diabetes rates range from 0 to 40%
    .interpolator(d3.interpolateReds);

    svg
    .selectAll("path")
    .data(geoData.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", (d) => {
      const stateName = d.properties.NAME;
      const diabetesData = diabetesLookup[stateName]
        ? diabetesLookup[stateName][selectedYear]
        : null;
      const diabetesRate = diabetesData ? diabetesData.rate : 0;
      return colorScale(diabetesRate);
    })
    .attr("stroke", "black")
    .on("mouseover", function (event, d) {
      handleMouseOver(event, d, populationLookup, diabetesLookup);
    })
    .on("mouseout", handleMouseOut);

  console.log("Population map with diabetes data drawn.");

  // Draw the legend
  drawLegend(colorScale);
}

// Handle mouse over event
function handleMouseOver(event, d, populationLookup, diabetesLookup) {
  const stateName = d.properties.NAME; // Extract the state name from the geo data
  const population = populationLookup[stateName] || "Unknown Population"; // Fetch total resident population

  // Access diabetes data for the selected year dynamically
  const diabetesData = diabetesLookup[stateName] || {};
  const diabetesRate = diabetesData[selectedYear]
    ? diabetesData[selectedYear].rate
    : "Data Not Available";
  const diabetesPopulation = diabetesData[selectedYear]
    ? diabetesData[selectedYear].population
    : "Data Not Available";

  tooltip
    .style("display", "inline-block")
    .style("left", event.pageX + "px")
    .style("top", event.pageY + "px")
    .html(`
      <strong>${stateName}</strong><br>
      Population: ${population}<br>
      Diabetes Rate: ${diabetesRate}%<br>
      Diabetes Population: ${diabetesPopulation}
    `);
}

// Handle mouse out event
function handleMouseOut() {
  tooltip.style("display", "none");
}

// Function to clear the map
function clearMap() {
  if (svg) {
    svg.selectAll("*").remove(); // Remove all elements from the SVG
  }
}

// Function to format data for the table
function formatDataForTable(populationData, diabetesLookup, year) {
  return populationData.map((row) => {
    const stateName = row["Geographic Area"];
    const population = row["Total Resident Population"];
    const diabetesRate = diabetesLookup[stateName]
      ? diabetesLookup[stateName][year].rate
      : 0;
    const diabetesPopulation = diabetesLookup[stateName]
      ? diabetesLookup[stateName][year].population
      : 0;

    return {
      state: stateName,
      population: population,
      diabetesRate: diabetesRate,
      diabetesPopulation: diabetesPopulation,
    };
  });
}

// Function to display data in the table
function displayCSVData(data) {
  const tableContainer = document.getElementById("csv-table");
  if (!tableContainer) {
    console.error("Table container not found");
    return;
  }

  // Clear the existing table content
  tableContainer.innerHTML = "";

  const table = tableContainer.appendChild(document.createElement("table"));
  table.classList.add("table", "table-striped");

  const headerRow = table.insertRow();
  Object.keys(data[0]).forEach((key) => {
    const cell = headerRow.insertCell();
    cell.textContent = key;
    cell.style.fontWeight = "bold";
  });

  data.forEach((row) => {
    const rowElement = table.insertRow();
    Object.values(row).forEach((value) => {
      const cell = rowElement.insertCell();
      cell.textContent = value;
    });
  });
}
