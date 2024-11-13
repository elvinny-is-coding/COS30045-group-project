// Set up SVG dimensions and color scale
const width = 1200,
  height = 800;
const svg = d3.select("#visualization svg");
const color = d3.scaleOrdinal(d3.schemeCategory10);

// Tooltip
const tooltip = d3.select("#tooltip");

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

  // Draw nodes
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
    .style("fill", (d, i) => color(i))
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

  // Create a legend (separated into sections)
  const legend = d3.select("#visualization-legend");

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

  // Add legend items for each group
  Object.keys(groups).forEach((group) => {
    const section = legend
      .append("div")
      .attr("class", "ml-10 flex-1 max-h-[350px] overflow-auto space-y-2"); // Limit to 7 items per column

    section.append("h4").text(group);

    const items = section
      .selectAll(".legend-item")
      .data(groups[group])
      .enter()
      .append("div")
      .attr("class", "legend-item");

    items
      .append("div")
      .style("background-color", (d, i) => color(i))
      .style("width", "15px")
      .style("height", "15px");

    items.append("span").text((d) => d.name);
  });
});
