// Container for chart and filter elements
const chartContainer = document.getElementById("chart-container");
const chartLegend = document.getElementById("chart-legend");
const yearSort = document.getElementById("year-filter"); // For sorting by year or other metrics

// Fetch CSV files
Promise.all([
  d3.csv("../data/obesity_age_specific_data.csv"),
  d3.csv("../data/obesity_gender_mortality_rates.csv"),
  d3.csv("../data/obesity_overall_data.csv"),
  d3.csv("../data/obesity_race_data.csv"),
]).then(function (data) {
  let ageSpecificData = data[0];
  let genderMortalityData = data[1];
  let overallData = data[2];
  let raceData = data[3];

  parseData(ageSpecificData, genderMortalityData, overallData, raceData);

  // Initial render (render the deathrate chart by default)
  renderChart(overallData, "Overall Mortality Rate", [
    "Overall Mortality Rate",
  ]);

  // Event listeners for buttons
  document
    .getElementById("age-chart-btn")
    .addEventListener("click", function () {
      renderChart(ageSpecificData, "Age-Specific Obesity Data", [
        "15-24 years",
        "25-34 years",
        "35-44 years",
        "45-54 years",
        "55-64 years",
        "65-74 years",
        "75-84 years",
        "85+ years",
      ]);
    });

  document
    .getElementById("gender-chart-btn")
    .addEventListener("click", function () {
      renderChart(genderMortalityData, "Gender Mortality Rates", [
        "Male Mortality Rate",
        "Female Mortality Rate",
      ]);
    });

  document
    .getElementById("deathrate-btn")
    .addEventListener("click", function () {
      renderChart(overallData, "Overall Mortality Rate", [
        "Overall Mortality Rate",
      ]);
    });

  document
    .getElementById("race-chart-btn")
    .addEventListener("click", function () {
      renderChart(raceData, "Race-Specific Obesity Data", [
        "White",
        "Black or African American",
        "Asian or Pacific Islander",
        "American Indian or Alaska Native",
      ]);
    });

  // Event listeners for sorting by year (Ascending / Descending)
document.getElementById("sort-asc-btn").addEventListener("click", function () {
    sortDataByYear("year");
  });
  
  document.getElementById("sort-desc-btn").addEventListener("click", function () {
    sortDataByYear("reverseYear");
  });
});

// Function to sort data by year (ascending or descending)
function sortDataByYear(sortBy) {
    let sortedData;
    if (sortBy === "year") {
      sortedData = currentData.sort((a, b) => d3.ascending(a.Year, b.Year)); // Sort ascending
    } else if (sortBy === "reverseYear") {
      sortedData = currentData.sort((a, b) => d3.descending(a.Year, b.Year)); // Sort descending
    }
  
    // Re-render the chart with the sorted data while keeping the current category
    renderChart(sortedData, currentCategories[0], currentCategories);
  }

  function renderChart(data, title, categories) {
    // Ensure the chart and legend containers are cleared
    chartContainer.innerHTML = ""; // Clear previous chart
    chartLegend.innerHTML = ""; // Clear current legend
  
    currentData = data; // Set current data
    currentCategories = categories; // Set current categories
  
    const width = chartContainer.clientWidth || 500;
    const height = chartContainer.clientHeight || 400;
  
    const svg = d3
      .select(chartContainer)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", "translate(40,40)");
  
    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.Year))
      .range([0, width - 80])
      .padding(0.1);
  
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d3.max(categories, (category) => d[category]))])
      .nice()
      .range([height - 80, 0]);
  
    // Tooltip setup and rendering
    const tooltip = d3
      .select(chartContainer)
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("padding", "10px")
      .style("background-color", "#333")
      .style("color", "#fff")
      .style("border-radius", "5px")
      .style("border", "2px solid #fff")
      .style("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.1)");
  
     // Store the bars and add color on hover
  const bars = svg
  .append("g")
  .selectAll(".bar")
  .data(data)
  .enter()
  .append("g")
  .attr("transform", (d) => "translate(" + x(d.Year) + ",0)")
  .selectAll(".bar")
  .data((d) =>
    categories.map((category) => ({ category, value: d[category] }))
  )
  .enter()
  .append("rect")
  .attr("class", "bar")
  .attr("x", (d, i) => i * (x.bandwidth() / categories.length))
  .attr("width", x.bandwidth() / categories.length - 1)
  .attr("y", height - 80) // Start from the bottom (invisible initially)
  .attr("height", 0) // Height of 0 (invisible initially)
  .style("fill", (d, i) => d3.schemeCategory10[i])
  .on("mouseover", function (event, d) {
    tooltip.transition().duration(200).style("opacity", 0.9);
    tooltip
      .html(`${d.category}: ${d.value}`)
      .style("left", event.pageX + 10 + "px")
      .style("top", event.pageY - 28 + "px");
  })
  .on("mouseout", function () {
    tooltip.transition().duration(500).style("opacity", 0);
  });
  
    // Animate bars
    bars
      .transition()
      .duration(800)
      .delay((d, i) => i * 100) // Staggered animation
      .attr("height", (d) => height - 80 - y(d.value)) // Set the final height
      .attr("y", (d) => y(d.value)) // Final position
      .style("opacity", 1); // Fade in
  
    svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", "translate(0," + (height - 80) + ")")
      .call(d3.axisBottom(x));
  
    svg.append("g").attr("class", "y-axis").call(d3.axisLeft(y));
  
    const legend = d3
      .select("#chart-legend")
      .selectAll(".legend")
      .data(categories)
      .enter()
      .append("div")
      .attr("class", "legend")
      .style("display", "inline-flex") // Change to flexbox for alignment
      .style("flex-direction", "column") // Align items vertically
      .style("align-items", "center") // Center items horizontally
      .style("margin-right", "10px");
  
    legend
      .append("div")
      .style("width", "20px")
      .style("height", "20px")
      .style("background-color", (d, i) => d3.schemeCategory10[i]);
  
    legend.append("span").text((d) => d).style("display", "block"); // Ensure labels are displayed on a new line
  }
        

// Function to parse data into usable format
function parseData(
  ageSpecificData,
  genderMortalityData,
  overallData,
  raceData
) {
  ageSpecificData.forEach((d) => {
    d.Year = +d.Year;
    Object.keys(d).forEach((key) => {
      if (key !== "Year") {
        d[key] = parseFloat(d[key].split(" ")[0]);
      }
    });
  });

  genderMortalityData.forEach((d) => {
    d.Year = +d.Year;
    d["Male Mortality Rate"] = parseFloat(
      d["Male Mortality Rate"].split(" ")[0]
    );
    d["Female Mortality Rate"] = parseFloat(
      d["Female Mortality Rate"].split(" ")[0]
    );
  });

  overallData.forEach((d) => {
    d.Year = +d.Year;
    if (d["Total Population"]) {
      d["Total Population"] =
        parseFloat(d["Total Population"].replace("M", "").trim()) * 1e6;
    }
    if (
      d["Overall Mortality Rat"] &&
      typeof d["Overall Mortality Rat"] === "string"
    ) {
      const match = d["Overall Mortality Rat"].trim().match(/^([0-9.]+)/);
      d["Overall Mortality Rate"] = match ? parseFloat(match[1]) : 0;
    } else {
      d["Overall Mortality Rate"] = 0;
    }
  });

  raceData.forEach((d) => {
    d.Year = +d.Year;
    Object.keys(d).forEach((key) => {
      if (key !== "Year") {
        d[key] = parseFloat(d[key].split(" ")[0]);
      }
    });
  });
}
