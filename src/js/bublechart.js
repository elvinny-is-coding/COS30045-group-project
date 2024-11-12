// Set your own width and height for the visualization
const width = 800;  // Set your desired width
const height = 400; // Set your desired height

// Create SVG container with the custom width and height
const svg = d3.select("#visualize")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

// Load the obesity rates data from CSV
d3.csv("../data/oecd-obesity-rates-2018-mex-usa-gbr.csv").then(data => {
    console.log(data);

    // Parse the OBS_VALUE to numbers
    data.forEach(d => {
        d["OBS_VALUE (Country-Level) Average"] = +d["OBS_VALUE (Country-Level) Average"];
    });

    // Sort the data from lowest to highest obesity rate
    data.sort((a, b) => a["OBS_VALUE (Country-Level) Average"] - b["OBS_VALUE (Country-Level) Average"]);

    // Define scale for bubble size
    const sizeScale = d3.scaleLinear()
        .domain([d3.min(data, d => d["OBS_VALUE (Country-Level) Average"]), d3.max(data, d => d["OBS_VALUE (Country-Level) Average"])])
        .range([30, 100]); // Bubble size range

    // Define color scale based on each country's flag colors
    const colorScale = d3.scaleOrdinal()
        .domain(data.map(d => d.Country))
        .range(["#B22234", "#008C45", "#00247D"]);  // Colors for USA, Mexico, GB

    // Create bubbles for each country, initially placed at the center
    const bubbles = svg.selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("r", d => sizeScale(d["OBS_VALUE (Country-Level) Average"]))  // Set initial size
        .attr("fill", d => colorScale(d.Country))
        .attr("stroke", "#333")
        .attr("stroke-width", 1)
        .attr("cx", width / 2)  // Initially at the center
        .attr("cy", height / 2) // Initially at the center
        .style("opacity", 0) // Set opacity to 0 initially (hidden)
        .on("mouseover", (event, d) => {
            tooltip.style("display", "block")
                .html(`<strong>${d.Country}</strong><br>Obesity Rate: ${d["OBS_VALUE (Country-Level) Average"]}%`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.style("display", "none"));

    // Tooltip for displaying country and obesity rate
    const tooltip = d3.select("body").append("div")
        .attr("id", "tooltip1")
        .style("display", "none")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("border-radius", "4px");

    // Trigger the animation for the circles to fade in one by one
    bubbles.transition()
        .delay((d, i) => i * 200) // Stagger the transition by 200ms for each circle
        .duration(1000)  // Animation duration for the fade-in and size transition
        .style("opacity", 1)  // Fade the bubbles in
        .attr("r", d => sizeScale(d["OBS_VALUE (Country-Level) Average"]))  // Final radius (size)
        .attr("cx", width / 2)  // Keep the initial center position
        .attr("cy", height / 2); // Keep the initial center position

    // Create a simulation for bubble layout after fade-in
    const simulation = d3.forceSimulation(data)
        .force("x", d3.forceX(width / 2).strength(0.1))  // Center X-axis (low strength)
        .force("y", d3.forceY(height / 2).strength(0.1)) // Center Y-axis (low strength)
        .force("collide", d3.forceCollide(d => sizeScale(d["OBS_VALUE (Country-Level) Average"]) + 2));

    // Update bubble positions after the fade-in is complete
    simulation.nodes(data)
        .on("tick", ticked);

    function ticked() {
        bubbles
            .attr("cx", d => d.x)  // Dynamically update X position
            .attr("cy", d => d.y); // Dynamically update Y position
    }

    // Add a legend for the countries with obesity data
    const legend = d3.select("#legend");

    // Create a legend for each country
    const legendData = ["USA", "Mexico", "GB"]; // Add more countries if necessary
    const legendColors = ["#B22234", "#008C45", "#00247D"];

    const legendItems = legend.selectAll(".legend-item")
        .data(legendData)
        .enter().append("div")
        .attr("class", "legend-item")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "8px");

    legendItems.append("div")
        .style("width", "20px")
        .style("height", "20px")
        .style("background-color", (d, i) => legendColors[i])
        .style("margin-right", "8px");

    legendItems.append("span")
        .text(d => d);
});
