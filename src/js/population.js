// Declare these variables globally at the top of the file
let svg, path, tooltip, geoData, populationLookup;

export function loadPopulationData() {
    // Load data and draw visualization
    loadData();
}

// Function to load population data and display table
function loadData() {
    Promise.all([d3.csv("../data/usa-population.csv"), d3.json("../data/states.geojson")])
        .then(([populationData, geoJsonData]) => {
            geoData = geoJsonData;
            populationLookup = {};
            populationData.forEach((row) => {
                populationLookup[row["Geographic Area"]] = +row["Total Resident Population"];
            });

            allData = populationData.map((row) => ({
                State: row["Geographic Area"],
                Population: row["Total Resident Population"],
            }));

            currentPage = 1;
            displayCSVData(allData);

            drawMap(geoData, populationLookup);
            applyTransitionEffect("highToLow"); // Set initial transition
        })
        .catch((error) => console.error("Error loading data:", error));
}

// Apply transition effects function
function applyTransitionEffect(effect) {
    let sortedFeatures = [...geoData.features];

    if (effect === "highToLow") {
        sortedFeatures.sort((a, b) => (populationLookup[b.properties.NAME] || 0) - (populationLookup[a.properties.NAME] || 0));
    } else if (effect === "lowToHigh") {
        sortedFeatures.sort((a, b) => (populationLookup[a.properties.NAME] || 0) - (populationLookup[b.properties.NAME] || 0));
    } else if (effect === "stateByState") {
        displayStateByState(sortedFeatures);
        return;
    }

    displayStatesSequentially(sortedFeatures);
}

function drawMap(geoData, populationLookup) {
    const visualizationContainer = document.getElementById("visualization");
    if (!visualizationContainer) return;

    clearMap();

    const width = visualizationContainer.clientWidth;
    const height = visualizationContainer.clientHeight;

    // Create the SVG for the map
    svg = d3.select("#visualization").append("svg")
        .attr("width", width)
        .attr("height", height - 60);  // Leave space for the legend below the map

    const projection = d3.geoAlbersUsa()
        .scale(1000)
        .translate([width / 2, height / 2]);

    path = d3.geoPath().projection(projection);

    tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "white")
        .style("padding", "5px")
        .style("border", "1px solid gray")
        .style("border-radius", "5px")
        .style("display", "none");

    const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(Object.values(populationLookup))]);

    // Draw the legend after drawing the map
    drawLegend(colorScale, height);
}

function drawLegend(colorScale, mapHeight) {
    // Get the width and height of the visualization container dynamically
    const visualizationContainer = document.getElementById("visualization");
    const containerWidth = visualizationContainer.clientWidth;
    const containerHeight = visualizationContainer.clientHeight;

    // Adjust the legend dimensions relative to the container size
    const legendWidth = containerWidth * 0.8;  // Set width to 80% of container width
    const legendHeight = 20;  // You can still keep this fixed or adjust it if needed
    const marginTop = 10;  // Add some space between the map and the legend

    // Create a new SVG for the legend below the map
    const legendSvg = d3.select("#legend").append("svg")
        .attr("width", legendWidth)
        .attr("height", legendHeight + 40)  // Adjust height for the labels
        .attr("x", (containerWidth - legendWidth) / 2)  // Center the legend horizontally
        .attr("y", mapHeight + marginTop);  // Position it below the map

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
        .attr("stop-color", colorScale.range()[0]);

    gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colorScale.range()[1]);

    legendSvg
        .append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legendGradient)");

    const legendScale = d3.scaleLinear()
        .domain(colorScale.domain())
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale).ticks(5);

    legendSvg
        .append("g")
        .attr("class", "legend-axis")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);

    // Format the legend values with commas if they are in millions
    const formatValue = d3.format(".2s"); // Formats as 1.0M, 2.5M, etc.

    // Add labels for the legend
    const minValue = colorScale.domain()[0];
    const maxValue = colorScale.domain()[1];

    legendSvg
        .append("text")
        .attr("x", 0)
        .attr("y", legendHeight + 25)
        .attr("dy", ".35em")
        .attr("text-anchor", "start")
        .style("font-size", "12px")
        .text(formatValue(minValue));  // Minimum value label with formatted value

    legendSvg
        .append("text")
        .attr("x", legendWidth)
        .attr("y", legendHeight + 25)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .text(formatValue(maxValue));  // Maximum value label with formatted value
}




// Function to display states sequentially for transitions
function displayStatesSequentially(features) {
    clearMap();
    let delay = 0;

    features.forEach((feature) => {
        setTimeout(() => {
            drawSingleState(feature);
        }, delay);
        delay += 300; // Increase delay for each state
    });
}

// Display state-by-state with detail
function displayStateByState(features) {
    clearMap();
    let delay = 0;

    features.forEach((feature) => {
        setTimeout(() => {
            const stateName = feature.properties.NAME;
            const population = populationLookup[stateName] || "Unknown Population";
            drawSingleState(feature);
            displayStateDetail(stateName, population);
        }, delay);
        delay += 300; // Increase delay for each state
    });
}

// Function to draw a single state
function drawSingleState(feature) {
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(Object.values(populationLookup))]);

    svg.append("path")
        .datum(feature)
        .attr("d", path)
        .attr("fill", colorScale(populationLookup[feature.properties.NAME] || 0))
        .attr("stroke", "black")
        .on("mouseover", function (event, d) {
            d3.select(this).transition().duration(200).attr("fill", "gold");
            tooltip.style("display", "inline-block")
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY + 10 + "px")
                .html(`<strong>${feature.properties.NAME}</strong><br>Population: ${d3.format(",")(populationLookup[feature.properties.NAME] || 0)}`);
        })
        .on("mouseout", function (event, d) {
            d3.select(this).transition().duration(200)
                .attr("fill", colorScale(populationLookup[feature.properties.NAME] || 0));
            tooltip.style("display", "none");
        });
}


// Display state detail in text form for state-by-state mode
function displayStateDetail(stateName, population) {
    d3.select("#state-info")
        .html(`<strong>${stateName}</strong><br>Population: ${d3.format(",")(population)}`);
}

// Function to clear existing map or visualization before loading new data
function clearMap() {
    if (svg) svg.selectAll("*").remove();
}

// Variables for pagination
let currentPage = 1;
const rowsPerPage = 10;
let allData = [];

function displayCSVData(data) {
    clearTable();
    const totalPages = Math.ceil(data.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, data.length);
    const currentData = data.slice(startIndex, endIndex);

    const table = d3.select("#data-table");
    const headers = Object.keys(data[0]);
    const headerRow = table.append("thead").append("tr");
    headers.forEach((header) => {
        headerRow.append("th").attr("class", "border py-3 px-4").text(header);
    });

    const rows = table.append("tbody").selectAll("tr")
        .data(currentData)
        .enter().append("tr")
        .attr("class", "hover:bg-gray-50");

    rows.selectAll("td").data((d) => headers.map((header) => header === "Population" ? d3.format(",")(d[header]) : d[header]))
        .enter().append("td")
        .attr("class", "border py-3 px-4 text-sm")
        .text((d) => d);

    updatePaginationControls(totalPages);
}

function clearTable() {
    d3.select("#data-table").selectAll("thead").remove();
    d3.select("#data-table").selectAll("tbody").remove();
}

function updatePaginationControls(totalPages) {
    d3.select("#page-info").text(`Page ${currentPage} of ${totalPages}`);
    d3.select("#prev-button").property("disabled", currentPage === 1);
    d3.select("#next-button").property("disabled", currentPage === totalPages);
}

// Pagination event listeners
d3.select("#prev-button").on("click", function () {
    if (currentPage > 1) {
        currentPage--;
        displayCSVData(allData);
    }
});

d3.select("#next-button").on("click", function () {
    const totalPages = Math.ceil(allData.length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayCSVData(allData);
    }
});

// Transition effect buttons
d3.select("#highToLow-button").on("click", () => applyTransitionEffect("highToLow"));
d3.select("#lowToHigh-button").on("click", () => applyTransitionEffect("lowToHigh"));
d3.select("#stateByState-button").on("click", () => applyTransitionEffect("stateByState"));

// Initialize the visualization
loadPopulationData();


