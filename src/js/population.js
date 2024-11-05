// Declare these variables globally at the top of the file
let svg, path, tooltip, geoData, populationLookup;

export function loadPopulationData() {
    // Load data and draw visualization
    loadData();
}

// Function to load population data and display table
function loadData() {
    Promise.all([d3.csv("../../data/usa-population.csv"), d3.json("../../data/states.geojson")])
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

// Function to draw the map container
function drawMap(geoData, populationLookup) {
    const visualizationContainer = document.getElementById("visualization");
    if (!visualizationContainer) return;

    clearMap();

    const width = visualizationContainer.clientWidth;
    const height = visualizationContainer.clientHeight;

    svg = d3.select("#visualization").append("svg")
        .attr("width", width)
        .attr("height", height);

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


