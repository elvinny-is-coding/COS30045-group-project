let svg, path, tooltip;
const startYear = 2019;
const endYear = 2022;
let selectedYear = 2022; // Start with the default year

// Define global variables for data
let populationData, diabetesLookup, geoData;

export function loadPopulationData() {
  loadData();
}

// Function to load data and display visualization
function loadData() {
  Promise.all([
    d3.csv("../data/usa-population.csv"),
    d3.csv("../data/DiabetesStates.csv"), // Updated file to diabetes dataset
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

      // Initial visualization setup for the default year
      drawMap(geoData, populationData, diabetesLookup);
      displayCSVData(
        formatDataForTable(populationData, diabetesLookup, selectedYear)
      );

      // Update title for the default year
      updateVisualizationTitle(selectedYear);

      // Add year selection to the sidebar
      addYearSelection();
    })
    .catch((error) => console.error("Error loading data:", error));
}

function addYearSelection() {
  const yearContainer = d3.select("#year-selection");
  yearContainer.html(""); // Clear existing elements

  yearContainer
    .append("div")
    .attr("class", "mb-4")
    .append("label")
    .attr("for", "year-slider")
    .attr("class", "block text-sm font-medium text-gray-700")
    .text("Choose a year");

  const slider = yearContainer
    .append("input")
    .attr("type", "range")
    .attr("min", startYear)
    .attr("max", endYear)
    .attr("step", 1)
    .attr("value", selectedYear)
    .attr("id", "year-slider")
    .attr("class", "slider w-full h-2 bg-blue-200 rounded-full");

  const yearLabel = yearContainer
    .append("span")
    .attr("id", "year-label")
    .attr("class", "ml-2 text-lg font-medium text-gray-700")
    .text(selectedYear);

  slider.on("input", function () {
    const selectedYear = this.value;
    yearLabel.text(selectedYear);
    updateVisualizationForYear(selectedYear);
  });

  updateVisualizationForYear(selectedYear);
}

function updateVisualizationForYear(year) {
  selectedYear = year;

  d3.selectAll(".year-option").classed("active-year", false);
  d3.select(this).classed("active-year", true);

  const relevantData = formatDataForTable(
    populationData,
    diabetesLookup,
    selectedYear
  );
  displayCSVData(relevantData);

  clearMap();
  drawPopulationMap(
    geoData,
    createPopulationLookup(populationData),
    diabetesLookup
  );

  updateVisualizationTitle(selectedYear);
}

function updateVisualizationTitle(year) {
  const title = `Population with Diabetes Year ${year}`;
  d3.select("#visualization-title").text(title);
}

function createPopulationLookup(populationData) {
  const lookup = {};
  populationData.forEach((row) => {
    const stateName = row["Geographic Area"];
    const totalPopulation = +row["Total Resident Population"];

    if (stateName && !isNaN(totalPopulation)) {
      lookup[stateName] = totalPopulation;
    } else {
      console.warn(`Invalid entry for population data: ${JSON.stringify(row)}`);
    }
  });
  return lookup;
}

function calculateDiabetesRate(diabetesData, populationLookup) {
  const diabetesLookup = {};

  diabetesData.forEach((row) => {
    const state = row["States"] ? row["States"].trim() : null;
    if (!state) return;

    Object.keys(row).forEach((year) => {
      if (!isNaN(year) && year >= startYear && year <= endYear) {
        const diabetesRate = +row[year];
        const population = populationLookup[state];

        if (population && !isNaN(diabetesRate)) {
          const diabetesPopulation = (population * diabetesRate) / 100;
          diabetesLookup[state] = diabetesLookup[state] || {};
          diabetesLookup[state][year] = {
            rate: diabetesRate.toFixed(2),
            population: Math.round(diabetesPopulation),
          };
        }
      }
    });
  });

  return diabetesLookup;
}

function drawMap(geoData, populationLookup, diabetesLookup) {
  const visualizationContainer = document.getElementById("visualization");
  if (!visualizationContainer) {
    console.error("Visualization container not found");
    return;
  }

  clearMap();

  const width = visualizationContainer.clientWidth;
  const height = visualizationContainer.clientHeight;

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

  initTooltip();

  drawPopulationMap(geoData, populationLookup, diabetesLookup);
}

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

function drawPopulationMap(geoData, populationLookup, diabetesLookup) {
  if (!geoData.features) {
    console.error("No features found in geoData.");
    return;
  }

  const colorScale = d3
    .scaleSequential()
    .domain([0, 20])
    .interpolator(d3.interpolateGreens);

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

  drawLegend(colorScale);
}

function handleMouseOver(event, d, populationLookup, diabetesLookup) {
  const stateName = d.properties.NAME;
  const population = populationLookup[stateName] || "Unknown Population";

  const diabetesData = diabetesLookup[stateName] || {};
  const diabetesRate = diabetesData[selectedYear]
    ? diabetesData[selectedYear].rate
    : "Data Not Available";
  const diabetesPopulation = diabetesData[selectedYear]
    ? diabetesData[selectedYear].population
    : "Data Not Available";

  tooltip
    .style("display", "inline-block")
    .style("left", event.pageX + 10 + "px")
    .style("top", event.pageY + 10 + "px")
    .html(
      `<strong>${stateName}</strong><br>Population: ${population}<br>Diabetes Rate: ${diabetesRate}%<br>Diabetes Population: ${diabetesPopulation}`
    );

  d3.select(this).attr("fill", "blue");
}

function handleMouseOut() {
  tooltip.style("display", "none");
  d3.select(this).attr("fill", (d) => {
    const stateName = d.properties.NAME;
    const diabetesData = diabetesLookup[stateName]
      ? diabetesLookup[stateName][selectedYear]
      : null;
    const diabetesRate = diabetesData ? diabetesData.rate : 0;
    return colorScale(diabetesRate);
  });
}

function clearMap() {
  if (svg) {
    svg.selectAll("*").remove();
  }
}

function drawLegend(colorScale) {
  const legendWidth = 300;
  const legendHeight = 20;

  const legendSvg = svg
    .append("g")
    .attr("class", "legend")
    .attr(
      "transform",
      `translate(${(svg.attr("width") - legendWidth) / 2}, 20)`
    );

  const gradient = legendSvg
    .append("defs")
    .append("linearGradient")
    .attr("id", "legendGradient")
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "0%")
    .attr("y2", "0%");

  gradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", colorScale(0));
  gradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", colorScale(20));

  legendSvg
    .append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legendGradient)");

  const legendScale = d3.scaleLinear().domain([0, 20]).range([0, legendWidth]);

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
        d["Diabetes Rate (%)"],
        d["Diabetes Population"],
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

function formatDataForTable(populationData, diabetesLookup, year) {
  return populationData.map((row) => {
    const state = row["Geographic Area"];
    const population = +row["Total Resident Population"];
    const diabetesData = diabetesLookup[state]
      ? diabetesLookup[state][year]
      : null;
    const diabetesRate = diabetesData
      ? diabetesData.rate
      : "Data Not Available";
    const diabetesPopulation = diabetesData
      ? diabetesData.population
      : "Data Not Available";

    return {
      State: state,
      Population: population,
      "Diabetes Rate (%)": diabetesRate,
      "Diabetes Population": diabetesPopulation,
    };
  });
}

loadPopulationData();
