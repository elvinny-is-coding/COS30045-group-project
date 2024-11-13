// Set up SVG dimensions and color scales
const width = 1200,
  height = 800;
const svg = d3.select("#visualization svg");
const tooltip = d3.select("#tooltip");

// Sequential color scales with adjusted range for deeper colors
const colorSchemes = {
  "Dietary Risk": d3
    .scaleSequential()
    .domain([0.4, 1])
    .interpolator(d3.interpolateBlues),
  "Age Group": d3
    .scaleSequential()
    .domain([0.4, 1])
    .interpolator(d3.interpolateGreens),
  Gender: d3
    .scaleSequential()
    .domain([0.4, 1])
    .interpolator(d3.interpolateOranges),
  Time: d3.scaleSequential().domain([0.4, 1]).interpolator(d3.interpolateReds),
};

// Load the data from the CSV file
d3.csv("../data/diabetes_sankey.csv").then((data) => {
  const nodes = [];
  const links = [];
  const nodeMap = {}; // To keep track of node indices

  // Function to get or create a node index
  function getNodeIndex(name) {
    if (!(name in nodeMap)) {
      nodeMap[name] = nodes.length;
      nodes.push({ name });
    }
    return nodeMap[name];
  }

  // Process each row to create nodes and links
  data.forEach((row) => {
    const dietaryRisk = row.rei;
    const ageGroup = row.age;
    const gender = row.sex;
    const year = row.year;
    const value = +row.val;

    // Get node indices for each category
    const dietaryRiskIndex = getNodeIndex(dietaryRisk);
    const ageGroupIndex = getNodeIndex(ageGroup);
    const genderIndex = getNodeIndex(gender);
    const yearIndex = getNodeIndex(year);

    // Add links with the value
    links.push({ source: dietaryRiskIndex, target: ageGroupIndex, value });
    links.push({ source: ageGroupIndex, target: genderIndex, value });
    links.push({ source: genderIndex, target: yearIndex, value });
  });

  // Set up the Sankey layout
  const sankey = d3
    .sankey()
    .nodeWidth(30)
    .nodePadding(20)
    .size([width, height]);

  // Apply the Sankey layout to nodes and links (automatically calculates node positions and link widths)
  const { nodes: layoutNodes, links: layoutLinks } = sankey({ nodes, links });

  // Group nodes by category and assign colors
  const groups = {
    "Dietary Risk": [],
    "Age Group": [],
    Gender: [],
    Time: [],
  };

  layoutNodes.forEach((d) => {
    const name = d.name;
    if (name.includes("Diet")) groups["Dietary Risk"].push(d);
    else if (name.includes("years")) groups["Age Group"].push(d);
    else if (name.includes("Male") || name.includes("Female"))
      groups["Gender"].push(d);
    else groups["Time"].push(d);
  });

  // Assign colors to each node and store it in the `color` property
  layoutNodes.forEach((d) => {
    if (groups["Dietary Risk"].includes(d)) {
      d.color = colorSchemes["Dietary Risk"](
        0.4 +
          (groups["Dietary Risk"].indexOf(d) / groups["Dietary Risk"].length) *
            0.6
      );
    } else if (groups["Age Group"].includes(d)) {
      d.color = colorSchemes["Age Group"](
        0.4 +
          (groups["Age Group"].indexOf(d) / groups["Age Group"].length) * 0.6
      );
    } else if (groups["Gender"].includes(d)) {
      d.color = colorSchemes["Gender"](
        0.4 + (groups["Gender"].indexOf(d) / groups["Gender"].length) * 0.6
      );
    } else {
      d.color = colorSchemes["Time"](
        0.4 + (groups["Time"].indexOf(d) / groups["Time"].length) * 0.6
      );
    }
  });

  // Draw links (flows)
  svg
    .append("g")
    .selectAll(".link")
    .data(layoutLinks)
    .enter()
    .append("path")
    .attr("class", "link")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", "gray")
    .attr("stroke-width", (d) => Math.max(1, d.width))
    .attr("fill", "none")
    .attr("opacity", 0.5)
    .on("mouseover", function (event, d) {
      tooltip
        .style("visibility", "visible")
        .style("display", "block") // Make sure tooltip is displayed
        .text(
          `From: ${d.source.name} → To: ${d.target.name} | Value: ${d.value}`
        );
    })
    .on("mousemove", function (event) {
      tooltip
        .style("top", event.pageY + 5 + "px")
        .style("left", event.pageX + 5 + "px");
    })
    .on("mouseout", function () {
      tooltip.style("visibility", "hidden");
      tooltip.style("display", "none"); // Hide tooltip on mouse out
    });

  // Draw nodes with assigned color
  const node = svg
    .append("g")
    .selectAll(".node")
    .data(layoutNodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

  node
    .append("rect")
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0)
    .style("fill", (d) => d.color) // Use the assigned color directly
    .style("stroke", "none")
    .on("mouseover", function (event, d) {
      tooltip
        .style("visibility", "visible")
        .style("display", "block") // Make sure tooltip is displayed
        .text(
          `Node: ${d.name} | Width: ${d.x1 - d.x0} | Height: ${d.y1 - d.y0}`
        );
    })
    .on("mousemove", function (event) {
      tooltip
        .style("top", event.pageY + 5 + "px")
        .style("left", event.pageX + 5 + "px");
    })
    .on("mouseout", function () {
      tooltip.style("visibility", "hidden");
      tooltip.style("display", "none"); // Hide tooltip on mouse out
    });

  // Create a legend (separated into sections) with matching colors
  const legend = d3.select("#visualization-legend");

  Object.keys(groups).forEach((group) => {
    const section = legend
      .append("div")
      .attr("class", "ml-10 flex-1 max-h-[350px] overflow-auto space-y-2");

    section.append("h4").text(group);

    const items = section
      .selectAll(".legend-item")
      .data(groups[group])
      .enter()
      .append("div")
      .attr("class", "legend-item");

    items
      .append("div")
      .style("background-color", (d) => d.color) // Use the assigned color directly
      .style("width", "15px")
      .style("height", "15px");

    items.append("span").text((d) => d.name);
  });
});
