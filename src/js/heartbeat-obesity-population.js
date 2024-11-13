let heartbeatTooltip; // Declare the heartbeat tooltip variable

// Wait until the document is fully loaded
document.addEventListener("DOMContentLoaded", function () {
    const visualizationContainer = document.getElementById("chart");
    if (!visualizationContainer) return; // Exit if the container is not found

    const margin = { top: 20, right: 20, bottom: 80, left: 70 };
    const width = visualizationContainer.clientWidth - margin.left - margin.right;
    const height = visualizationContainer.clientHeight - margin.top - margin.bottom;

    // Initialize the heartbeat tooltip
    heartbeatTooltip = d3.select("body")
        .append("div")
        .attr("id", "heartbeat-tooltip") // Ensure this ID is unique
        .style("position", "absolute")
        .style("background", "white")
        .style("padding", "5px")
        .style("border", "1px solid gray")
        .style("border-radius", "5px")
        .style("display", "none");

    // Load the CSV data
    d3.csv("../data/ObesityStates.csv")
        .then((data) => {
            data.forEach((d) => {
                for (let key in d) {
                    if (key !== "States") d[key] = +d[key]; // Convert values to numbers
                }
            });

            const years = Object.keys(data[0]).slice(1).map(Number);
            const maxY = d3.max(data, (d) => d3.max(Object.values(d).slice(1)));

            // Set up scales for the axes
            const x = d3.scaleLinear().domain(d3.extent(years)).range([0, width]);
            const y = d3.scaleLinear().domain([20, maxY]).range([height, 0]);

            // Define a color scale with unique colors for each state
            const color = d3.scaleOrdinal()
                .domain(data.map((d) => d.States))
                .range([
                    "#FF6F61", "#6A5ACD", "#FF8C00", "#20B2AA", "#FF6347", "#FFD700",
                    "#4682B4", "#32CD32", "#BA55D3", "#FF1493", "#2E8B57", "#FF69B4",
                    "#ADFF2F", "#FF7F50", "#9370DB", "#3CB371", "#DC143C", "#1E90FF",
                    "#DDA0DD", "#FFB6C1", "#6B8E23", "#8B008B", "#8B0000", "#708090",
                    "#B22222", "#7B68EE", "#40E0D0", "#D2691E", "#9ACD32", "#8FBC8F",
                    "#5F9EA0", "#4169E1", "#B8860B", "#DA70D6", "#FF4500", "#FFFF00",
                    "#FF00FF", "#800080", "#00FFFF", "#008000", "#0000FF", "#A52A2A",
                    "#808000", "#FFA500", "#800000", "#FFC0CB", "#F0E68C", "#FFDEAD",
                    "#00008B", "#008080", "#D2B48C"
                ]);

            // Create line generator function
            const line = d3.line()
                .x((d, i) => x(years[i]))
                .y((d) => y(d))
                .defined((d) => d !== null && !isNaN(d));

            // Create SVG element
            const svg = d3.select("#chart-visualize")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin .left},${margin.top})`);

            // Add axes to the chart
            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x).tickFormat(d3.format("d")));

            svg.append("g").call(d3.axisLeft(y));

            // Add labels for axes
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height + 60)
                .attr("text-anchor", "middle")
                .text("Year");

            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -50)
                .attr("text-anchor", "middle")
                .text("Average Obesity Rate (%)");

            // Display legend immediately, disable click functionality during animation
            createLegend(false);

            // Define animation sequence
            animateLines();

           // Ensure that the click events are bound after the animation completes
function animateLines() {
  let animationCount = 0;

  data.forEach((d, index) => {
      const values = Object.values(d).slice(1);

      setTimeout(() => {
          const linepath = svg.append("path")
              .datum(values)
              .attr("class", "line")
              .attr("d", line)
              .attr("fill", "none")
              .attr("stroke", color(d.States))
              .attr("stroke-width", 1.5)
              .style("opacity", 0)
              .attr("data-state", d.States)
              .transition()
              .duration(800)
              .style("opacity", 1)
              .attr("stroke-width", 2.5)
              .transition()
              .duration(500)
              .attr("stroke-width", 1.5)
              .style("opacity", 0.7)
              .on("end", () => {
                  animationCount++;
                  if (animationCount === data.length) {
                      // Enable interactivity once all animations are complete
                      bindAllMouseEvents();
                      createLegend(true);
                  }
              });

          addDataPoints(values, d.States);
      }, index * 1000);
  });
}

            function addDataPoints(values, stateName) {
                values.forEach((value, i) => {
                    if (!isNaN(value)) {
                        const xPos = x(years[i]);
                        const yPos = y(value);

                        svg.append("circle")
                            .attr("cx", xPos)
                            .attr("cy", yPos)
                            .attr("r", 4)
                            .attr("fill", color(stateName))
                            .attr("class", "data-point");
                    }
                });
            }

            function bindAllMouseEvents() {
                data.forEach((d) => {
                    const linepath = d3.select(`.line[data-state="${d.States}"]`);
                    bindMouseEvents(linepath, d.States, Object.values(d).slice(1));
                });
            }

            function bindMouseEvents(linepath, stateName, values) {
              linepath.on("mouseover", function (event) {
                  const yearIndex = Math.round(x.invert(d3.pointer(event)[0]));
                  if (yearIndex >= 0 && yearIndex < values.length) { // Ensure index is within bounds
                      const year = years[yearIndex];
                      const rate = values[yearIndex];
                      const population = calculatePopulation(rate);
                      displayInfo(year, rate, population);
                  }
              }).on("mouseout", function () {
                  hideInfo();
              });
          
              linepath.on("click", function () {
                  const isActive = d3.select(this).classed("active");
                  d3.selectAll(".line").style("opacity", 0.2).classed("active", false);
                  d3.select(this).classed("active", !isActive).style("opacity", 1);
              });
          }

          function displayInfo(year, rate, population) {
            console.log(`Displaying info - Year: ${year}, Rate: ${rate}, Population: ${population}`); // Debugging log
            const infoContainer = d3.select("#info-display");
            
            // Check if the infoContainer exists
            if (infoContainer.empty()) {
                console.error("#info-display element not found");
                return;
            }
        
            infoContainer.html(`Year: ${year}<br>Obesity Rate: ${rate}%<br>Population: ${population}`);
            infoContainer.style("display", "block");
        }
          
          function createLegend(enableClick) {
            const legend = d3.select("#chart-legend").selectAll(".legend-item")
                .data(data)
                .enter()
                .append("div")
                .attr("class", "legend-item cursor-pointer")
                .style("margin-bottom", "5px")
                .on("click", enableClick ? function (event, d) {
                    console.log(`Clicked on: ${d.States}`); // Log the clicked state
        
                    // Reset all lines to dimmed state
                    d3.selectAll(".line")
                        .style("opacity", 0.2)
                        .attr("stroke-width", 1.5) // Set default stroke width
                        .classed("active", false);
        
                    // Highlight the clicked line
                    const linepath = d3.select(`.line[data-state="${d.States}"]`);
                    linepath.style("opacity", 1)
                        .attr("stroke-width", 3) // Make the active line bold
                        .classed("active", true);
        
                    // Display information for the clicked state
                    const yearIndex = 0; // Assuming you want to show the first year data
                    const year = years[yearIndex];
                    const rate = Object.values(d).slice(1)[yearIndex];
                    const population = calculatePopulation(rate);
                    console.log(`Year: ${year}, Rate: ${rate}, Population: ${population}`); // Log the info
                    displayInfo(year, rate, population);
                } : null);
        
            legend.append("div")
                .attr("class", "legend-color")
                .style("background-color", d => color(d.States));
        
            legend.append("span")
                .text(d => d.States)
                .style("cursor", enableClick ? "pointer" : "default");
        }
            function hideInfo() {
                d3.select("#info-display").style("display", "none");
            }

            function calculatePopulation(rate) {
                const totalPopulation = 331000000; // Example total population
                return Math.round((rate / 100) * totalPopulation); // Calculate based on the rate
            }
        });
});