// Assuming the container element where the charts will be rendered
const chartContainer = document.getElementById("chart-container");

// Fetch CSV files
Promise.all([
    d3.csv("../data/obesity_age_specific_data.csv"),
    d3.csv("../data/obesity_gender_mortality_rates.csv"),
    d3.csv("../data/obesity_overall_data.csv"),
    d3.csv("../data/obesity_race_data.csv")
]).then(function(data) {
    let ageSpecificData = data[0];
    let genderMortalityData = data[1];
    let overallData = data[2];
    let raceData = data[3];

    // Parse data into usable format
    parseData(ageSpecificData, genderMortalityData, overallData, raceData);

    // Event listeners for buttons
    document.getElementById('age-chart-btn').addEventListener('click', function() {
        renderChart(ageSpecificData, "Age-Specific Obesity Data", ["15-24 years", "25-34 years", "35-44 years", "45-54 years", "55-64 years", "65-74 years", "75-84 years", "85+ years"]);
    });

    document.getElementById('gender-chart-btn').addEventListener('click', function() {
        renderChart(genderMortalityData, "Gender Mortality Rates", ["Male Mortality Rate", "Female Mortality Rate"]);
    });

    document.getElementById('deathrate-btn').addEventListener('click', function() {
        renderChart(overallData, "Overall Mortality Rate", ["Overall Mortality Rate"]);
    });

    document.getElementById('race-chart-btn').addEventListener('click', function() {
        renderChart(raceData, "Race-Specific Obesity Data", ["White", "Black or African American", "Asian or Pacific Islander", "American Indian or Alaska Native"]);
    });

    // Initial render (if you want a default chart on load)
    renderChart(ageSpecificData, "Age-Specific Obesity Data", ["15-24 years", "25-34 years", "35-44 years", "45-54 years", "55-64 years", "65-74 years", "75-84 years", "85+ years"]);

});

// Function to parse data into proper format
function parseData(ageSpecificData, genderMortalityData, overallData, raceData) {
    ageSpecificData.forEach(d => {
        d.Year = +d.Year;
        d["15-24 years"] = parseFloat(d["15-24 years"].split(" ")[0]);
        d["25-34 years"] = parseFloat(d["25-34 years"].split(" ")[0]);
        d["35-44 years"] = parseFloat(d["35-44 years"].split(" ")[0]);
        d["45-54 years"] = parseFloat(d["45-54 years"].split(" ")[0]);
        d["55-64 years"] = parseFloat(d["55-64 years"].split(" ")[0]);
        d["65-74 years"] = parseFloat(d["65-74 years"].split(" ")[0]);
        d["75-84 years"] = parseFloat(d["75-84 years"].split(" ")[0]);
        d["85+ years"] = parseFloat(d["85+ years"].split(" ")[0]);
    });

    genderMortalityData.forEach(d => {
        d.Year = +d.Year;
        d["Male Mortality Rate"] = parseFloat(d["Male Mortality Rate"].split(" ")[0]);
        d["Female Mortality Rate"] = parseFloat(d["Female Mortality Rate"].split(" ")[0]);
    });

    overallData.forEach(d => {
        d.Year = +d.Year;
        if (d["Total Population"]) {
            d["Total Population"] = parseFloat(d["Total Population"].replace('M', '').trim()) * 1e6;
        }

        if (d["Overall Mortality Rat"] && typeof d["Overall Mortality Rat"] === 'string') {
            const match = d["Overall Mortality Rat"].trim().match(/^([0-9.]+)/);
            if (match) {
                d["Overall Mortality Rate"] = parseFloat(match[1]);
            } else {
                d["Overall Mortality Rate"] = 0;
            }
        } else {
            d["Overall Mortality Rate"] = 0;
        }
    });

    raceData.forEach(d => {
        d.Year = +d.Year;
        d["White"] = parseFloat(d["White"].split(" ")[0]);
        d["Black or African American"] = parseFloat(d["Black or African American"].split(" ")[0]);
        d["Asian or Pacific Islander"] = parseFloat(d["Asian or Pacific Islander"].split(" ")[0]);
        d["American Indian or Alaska Native"] = parseFloat(d["American Indian or Alaska Native"].split(" ")[0]);
    });
}

// Function to render the chart
function renderChart(data, title, categories) {
    // Clear the current chart content
    chartContainer.innerHTML = '';

    // Set chart dimensions
    const width = chartContainer.clientWidth || 500;
    const height = chartContainer.clientHeight || 400;

    const svg = d3.select(chartContainer)
                  .append("svg")
                  .attr("width", width)
                  .attr("height", height)
                  .append("g")
                  .attr("transform", "translate(40,40)"); // Padding for margins

    // Set scales
    const x = d3.scaleBand()
                .domain(data.map(d => d.Year))
                .range([0, width - 80])
                .padding(0.1);

    const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d3.max(categories, category => d[category]))])
                .nice()
                .range([height - 80, 0]);

    // Tooltip setup
    const tooltip = d3.select(chartContainer)
                      .append("div")
                      .attr("class", "tooltip")
                      .style("opacity", 0)
                      .style("position", "absolute")
                      .style("background-color", "#fff")
                      .style("border", "1px solid #ddd")
                      .style("padding", "5px")
                      .style("border-radius", "5px");

    // Create bars
    const bars = svg.append("g")
                    .selectAll(".bar")
                    .data(data)
                    .enter().append("g")
                    .attr("transform", d => "translate(" + x(d.Year) + ",0)")
                    .selectAll(".bar")
                    .data(d => categories.map(category => ({ category, value: d[category] })))
                    .enter().append("rect")
                    .attr("class", "bar")
                    .attr("x", (d, i) => i * (x.bandwidth() / categories.length))
                    .attr("width", x.bandwidth() / categories.length - 1)
                    .attr("y", d => y(d.value))
                    .attr("height", d => height - 80 - y(d.value))
                    .attr("fill", (d, i) => d3.schemeCategory10[i])
                    .on("mouseover", function(event, d) {
                        // Show tooltip
                        tooltip.transition().duration(200).style("opacity", .9);
                        tooltip.html(`${d.category}: ${d.value}`)
                               .style("left", (event.pageX + 5) + "px")
                               .style("top", (event.pageY - 28) + "px");
                        // Change color on hover
                        d3.select(this).style("fill", "orange");
                    })
                    .on("mouseout", function() {
                        // Hide tooltip
                        tooltip.transition().duration(500).style("opacity", 0);
                        // Reset color
                        d3.select(this).style("fill", (d, i) => d3.schemeCategory10[i]);
                    });

    // Add X and Y axis
    svg.append("g")
       .attr("class", "x-axis")
       .attr("transform", "translate(0," + (height - 80) + ")")
       .call(d3.axisBottom(x));

    svg.append("g")
       .attr("class", "y-axis")
       .call(d3.axisLeft(y));

    svg.append("text")
       .attr("transform", "translate(" + (width / 2) + "," + (height - 20) + ")")
       .style("text-anchor", "middle")
       .text("Year");

    svg.append("text")
       .attr("transform", "rotate(-90)")
       .attr("y", 0 - 40)
       .attr("x", 0 - (height / 2))
       .style("text-anchor", "middle")
       .text("Value");

    svg.append("text")
       .attr("x", (width / 2))
       .attr("y", 20)
       .style("text-anchor", "middle")
       .text(title);

    // Adding legend
    const legend = svg.append("g")
                      .attr("transform", "translate(" + (width - 150) + "," + 20 + ")");

    categories.forEach((category, i) => {
        const legendItem = legend.append("g")
                                 .attr("transform", "translate(0," + i * 20 + ")");
        legendItem.append("rect")
                  .attr("width", 18)
                  .attr("height", 18)
                  .attr("fill", d3.schemeCategory10[i]);
        legendItem.append("text")
                  .attr("x", 25)
                  .attr("y", 9)
                  .attr("dy", ".35em")
                  .style("text-anchor", "start")
                  .text(category);
    });
}


