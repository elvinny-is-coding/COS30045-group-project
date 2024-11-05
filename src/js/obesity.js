let svg, path, tooltip;
const startYear = 2011;
const endYear = 2023;
let selectedYear = 2023; // Start with the default year

// Define global variables for data
let populationData, obesityLookup, geoData;

export function loadPopulationData() {
  loadData();
}

// Function to load data and display visualization
function loadData() {
  Promise.all([
    d3.csv("../../data/usa-population.csv"),
    d3.csv("../../data/ObesityStates.csv"),
    d3.json("../../data/states.geojson"),
  ])
    .then((data) => {
      // Set global data variables for dynamic updates
      populationData = data[0];
      obesityLookup = calculateObesityRate(
        data[1],
        createPopulationLookup(data[0])
      );
      geoData = data[2];

      // Initial visualization setup for the default year (2023)
      drawMap(geoData, populationData, obesityLookup);
      displayCSVData(formatDataForTable(populationData, obesityLookup, "2023"));

      // Update title for the default year
      updateVisualizationTitle(2023);

      // Add year selection to the sidebar
      addYearSelection();
    })
    .catch((error) => console.error("Error loading data:", error));
}

function addYearSelection() {
  const yearContainer = d3.select("#year-selection");
  yearContainer.html(""); // Clear existing year buttons

  // Add label for the year selection
  yearContainer
    .append("div")
    .attr("class", "mb-4")
    .append("label")
    .attr("for", "filter1")
    .attr("class", "block text-sm font-medium text-gray-700")
    .text("Choose a year");

  // Add button container
  const buttonContainer = yearContainer
    .append("div")
    .attr(
      "class",
      "button-container flex flex-col items-center space-y-4 mt-4"
    );

  // Create buttons for each year
  for (let year = startYear; year <= endYear; year++) {
    buttonContainer
      .append("button")
      .attr(
        "class",
        "w-full h-12 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition ease-in-out duration-200"
      )
      .text(year)
      .on("click", function () {
        updateVisualizationForYear(year);
      });
  }
}

function updateVisualizationForYear(year) {
  selectedYear = year; // Update the global selected year

  // Update active button style
  d3.selectAll(".year-option").classed("active-year", false);
  d3.select(this).classed("active-year", true);

  // Update the table and map with the selected year's data
  const relevantData = formatDataForTable(
    populationData,
    obesityLookup,
    selectedYear
  );
  displayCSVData(relevantData);

  // Clear and redraw map to reflect selected year data
  clearMap();
  drawPopulationMap(
    geoData,
    createPopulationLookup(populationData),
    obesityLookup
  );

  // Update the title with the selected year
  updateVisualizationTitle(selectedYear);
}

// Function to update the visualization title with the selected year
function updateVisualizationTitle(year) {
  const title = `Population With Obesity Year ${year}`;
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

// Function to calculate obesity rate as a percentage of population
function calculateObesityRate(obesityData, populationLookup) {
  const obesityLookup = {};

  obesityData.forEach((row) => {
    const state = row["States"] ? row["States"].trim() : null;
    if (!state) return;

    // Assuming obesity rates are in different columns for different years
    Object.keys(row).forEach((year) => {
      if (!isNaN(year) && year >= 2011 && year <= 2023) {
        // Ensure we only process valid years
        const obesityRate = +row[year]; // Get the rate for that year
        const population = populationLookup[state];

        // Calculate obesity percentage if both values are available
        if (population && !isNaN(obesityRate)) {
          const obesityPopulation = (population * obesityRate) / 100; // Calculate obesity population
          obesityLookup[state] = obesityLookup[state] || {};
          obesityLookup[state][year] = {
            rate: obesityRate.toFixed(2), // Format to two decimal places
            population: Math.round(obesityPopulation), // Round to nearest whole number
          };
        }
      }
    });
  });

  return obesityLookup;
}

// Function to draw visualization with both population and obesity data
function drawMap(geoData, populationLookup, obesityLookup) {
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

  // Draw the map with population and obesity data
  drawPopulationMap(geoData, populationLookup, obesityLookup);
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

// Draw population map function with obesity data
function drawPopulationMap(geoData, populationLookup, obesityLookup) {
  if (!geoData.features) {
    console.error("No features found in geoData.");
    return;
  }

  // Create a color scale for the gradient
  const colorScale = d3
    .scaleSequential()
    .domain([0, 40]) // Assuming obesity rates range from 0 to 40%
    .interpolator(d3.interpolateReds);

    svg
    .selectAll("path")
    .data(geoData.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", (d) => {
      const stateName = d.properties.NAME;
      const obesityData = obesityLookup[stateName]
        ? obesityLookup[stateName][selectedYear]
        : null;
      const obesityRate = obesityData ? obesityData.rate : 0;
      return colorScale(obesityRate);
    })
    .attr("stroke", "black")
    .on("mouseover", function (event, d) {
      handleMouseOver(event, d, populationLookup, obesityLookup);
    })
    .on("mouseout", handleMouseOut);

  console.log("Population map with obesity data drawn.");

  // Draw the legend
  drawLegend(colorScale);
}

// Handle mouse over event
function handleMouseOver(event, d, populationLookup, obesityLookup) {
  const stateName = d.properties.NAME; // Extract the state name from the geo data
  const population = populationLookup[stateName] || "Unknown Population"; // Fetch total resident population

  // Access obesity data for the selected year dynamically
  const obesityData = obesityLookup[stateName] || {};
  const obesityRate = obesityData[selectedYear]
    ? obesityData[selectedYear].rate
    : "Data Not Available";
  const obesityPopulation = obesityData[selectedYear]
    ? obesityData[selectedYear].population
    : "Data Not Available";

  tooltip
    .style("display", "inline-block")
    .style("left", event.pageX + 10 + "px")
    .style("top", event.pageY + 10 + "px")
    .html(
      `<strong>${stateName}</strong><br>Population: ${population}<br>Obesity Rate: ${obesityRate}%<br>Obesity Population: ${obesityPopulation}`
    );

  d3.select(this).attr("fill", "blue"); // Change color of the hovered state
}

// Handle mouse out event
function handleMouseOut() {
  tooltip.style("display", "none");
  d3.select(this).attr("fill", (d) => {
    const stateName = d.properties.NAME;
    const obesityData = obesityLookup[stateName]
      ? obesityLookup[stateName][selectedYear]
      : null;
    const obesityRate = obesityData ? obesityData.rate : 0;
    return colorScale(obesityRate);
  });
}

// Function to clear existing map or visualization before loading new data
function clearMap() {
  if (svg) {
    svg.selectAll("*").remove(); // Clear all previous SVG elements
  }
}

// Draw the legend for the gradient
function drawLegend(colorScale) {
  const legendWidth = 300;
  const legendHeight = 20;

  // Create a gradient legend using SVG
  const legendSvg = svg
    .append("g")
    .attr("class", "legend")
    .attr(
      "transform",
      `translate(${(svg.attr("width") - legendWidth) / 2}, 20)`
    );

  // Create the gradient definition
  const gradient = legendSvg
    .append("defs")
    .append("linearGradient")
    .attr("id", "legendGradient")
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "0%")
    .attr("y2", "0%");

  // Define the gradient color stops
  gradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", colorScale(0));
  gradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", colorScale(40));

  // Create the legend rectangle and fill it with the gradient
  legendSvg
    .append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legendGradient)");

  // Add legend axis (scale) for context
  const legendScale = d3.scaleLinear().domain([0, 40]).range([0, legendWidth]);

  const legendAxis = d3.axisBottom(legendScale).ticks(5);

  legendSvg
    .append("g")
    .attr("class", "legend-axis")
    .attr("transform", `translate(0, ${legendHeight})`)
    .call(legendAxis);
}

let currentPage = 1;
const rowsPerPage = 10;

// Function to display CSV data in a table with pagination
function displayCSVData(data) {
  clearTable(); // Clear existing table data

  const table = d3.select("#data-table");
  if (!table.node()) {
    console.error("Table element with id 'data-table' not found in the DOM.");
    return;
  }

  if (data.length === 0) {
    console.error("No relevant data found to display.");
    return;
  }

  // Calculate total pages
  const totalPages = Math.ceil(data.length / rowsPerPage);

  // Function to render table rows for the current page
  function renderPage(page) {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedData = data.slice(start, end);

    // Clear existing rows
    table.select("tbody").selectAll("tr").remove();

    // Append data rows
    const rows = table
      .select("tbody")
      .selectAll("tr")
      .data(paginatedData)
      .enter()
      .append("tr")
      .attr("class", "hover:bg-gray-50 transition duration-150 ease-in-out");

    rows
      .selectAll("td")
      .data((d) => [
        d.State,
        d.Population,
        d["Obesity Rate (%)"],
        d["Obesity Population"],
      ]) // Extract relevant data
      .enter()
      .append("td")
      .attr("class", "border border-gray-300 py-3 px-4 text-sm")
      .text((d) => d);

    // Update pagination info
    d3.select("#page-info").text(`Slide ${currentPage} of ${totalPages}`);

    // Update button states
    d3.select("#prev-button").property("disabled", currentPage === 1);
    d3.select("#next-button").property("disabled", currentPage === totalPages);
  }

  // Initial render
  renderPage(currentPage);

  // Pagination controls
  d3.select("#prev-button").on("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage(currentPage);
    }
  });

  d3.select("#next-button").on("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderPage(currentPage);
    }
  });
}

// Function to clear existing table data
function clearTable() {
  d3.select("#data-table").select("tbody").selectAll("tr").remove();
  console.log("Table cleared."); // Log to confirm table was cleared
}

// Function to format data for the table display based on selected year
function formatDataForTable(populationData, obesityLookup, year) {
  return populationData.map((row) => {
    const state = row["Geographic Area"];
    const population = +row["Total Resident Population"];
    const obesityData = obesityLookup[state]
      ? obesityLookup[state][year]
      : null;
    const obesityRate = obesityData ? obesityData.rate : "Data Not Available";
    const obesityPopulation = obesityData
      ? obesityData.population
      : "Data Not Available";

    return {
      State: state,
      Population: population,
      "Obesity Rate (%)": obesityRate,
      "Obesity Population": obesityPopulation,
    };
  });
}

// Call the loadPopulationData function to initialize the visualization
loadPopulationData();


  
