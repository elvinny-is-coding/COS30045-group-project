d3.csv("../data/diabetes_risk.csv").then(function (data) {
  // Define color scales for each layer
  const colorSchemes = [
    d3.scaleSequential(d3.interpolateReds).domain([0, 1]), // Top Layer: Dietary Risk
    d3.scaleSequential(d3.interpolateOranges).domain([0, 1]), // Second Layer: Location
    d3.scaleSequential(d3.interpolateGreens).domain([0, 1]), // Third Layer: Gender
    d3.scaleSequential(d3.interpolateBlues).domain([0, 1]), // Fourth Layer: Age Range
  ];

  // Map the data into a hierarchical format with 'rei' as the top-level category
  const rootData = d3.group(
    data,
    (d) => d.rei,
    (d) => d.location,
    (d) => d.sex,
    (d) => d.age
  );

  // Transform the grouped data into a hierarchy format
  const hierarchyData = {
    children: Array.from(rootData.entries()).map(([reiKey, reiGroup]) => {
      return {
        key: reiKey,
        children: Array.from(reiGroup.entries()).map(
          ([locationKey, locationGroup]) => {
            return {
              key: locationKey,
              children: Array.from(locationGroup.entries()).map(
                ([sexKey, sexGroup]) => {
                  return {
                    key: sexKey,
                    children: Array.from(sexGroup.entries()).map(
                      ([ageKey, ageGroup]) => {
                        return {
                          key: ageKey,
                          value: d3.sum(ageGroup, (d) => +d.val), // Sum the values for each 'age' group
                        };
                      }
                    ),
                  };
                }
              ),
            };
          }
        ),
      };
    }),
  };

  // Specify the chart’s dimensions.
  const width = 928;
  const height = width;
  const radius = width / 6;

  // Create the color scale.
  const color = d3.scaleOrdinal(d3.schemeTableau10); // A set of 10 distinct colors

  // Compute the layout.
  const hierarchy = d3
    .hierarchy(hierarchyData)
    .sum((d) => d.value || 0) // Sum the values at each leaf
    .sort((a, b) => b.value - a.value); // Sort by the value
  const root = d3.partition().size([2 * Math.PI, hierarchy.height + 1])(
    hierarchy
  );
  root.each((d) => (d.current = d));

  // Create the arc generator.
  const arc = d3
    .arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius((d) => d.y0 * radius)
    .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

  // Create the SVG container and append it to #visualization
  const svg = d3
    .create("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, width])
    .classed("mx-auto", true) // Tailwind class to center the SVG
    .style("width", "75%")
    .style("font", "10px sans-serif");

  // Append the arcs.
  const path = svg
    .append("g")
    .selectAll("path")
    .data(root.descendants().slice(1)) // Slice to remove the root node
    .join("path")
    // Apply color based on depth and sequential color scale
    .attr("fill", (d) => {
      // Ensure depth does not exceed colorSchemes array bounds
      const layerIndex = Math.min(d.depth - 1, colorSchemes.length - 1);

      // Restrict shadeFactor to avoid light shades (closer to 0.4 for darker shades)
      const shadeFactor = d.parent
        ? 0.4 + (d.parent.children.indexOf(d) / d.parent.children.length) * 0.6
        : 0.4;

      return colorSchemes[layerIndex](shadeFactor);
    })
    .attr("fill-opacity", (d) =>
      arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0
    )
    .attr("pointer-events", (d) => (arcVisible(d.current) ? "auto" : "none"))
    .attr("d", (d) => arc(d.current));

  // Make them clickable if they have children.
  path
    .filter((d) => d.children)
    .style("cursor", "pointer")
    .on("click", clicked)
    .on("mouseover", function (event, d) {
      // Show tooltip on hover
      const tooltip = d3.select("#tooltip");
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(`Key: ${d.data.key}<br>Value: ${d.value}`)
        .style("left", event.pageX + 5 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function () {
      // Hide tooltip when mouse leaves
      d3.select("#tooltip").transition().duration(200).style("opacity", 0);
    });

  const format = d3.format(",d");
  path.append("title").text(
    (d) =>
      `${d
        .ancestors()
        .map((d) => d.data.key)
        .reverse()
        .join("/")}\n${format(d.value)}`
  );

  // Append text labels
  const label = svg
    .append("g")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .style("user-select", "none")
    .selectAll("text")
    .data(root.descendants().slice(1))
    .join("text")
    .attr("dy", "0.35em")
    .attr("fill-opacity", (d) => +labelVisible(d.current))
    .attr("transform", (d) => labelTransform(d.current))
    .each(function (d) {
      const text = d.data.key || d.depth;
      const words = text.split(" ");
      const lineHeight = 1.1; // Adjust line height if needed
      const maxLineLength = 20; // Max number of characters per line
      let line = "";
      let lineCount = 0;

      // Split the text into multiple lines
      words.forEach((word, index) => {
        if ((line + word).length > maxLineLength) {
          lineCount++;
          d3.select(this)
            .append("tspan")
            .attr("x", 0)
            .attr("dy", lineCount * lineHeight + "em")
            .text(line);
          line = word + " ";
        } else {
          line += word + " ";
        }
        if (index === words.length - 1) {
          d3.select(this)
            .append("tspan")
            .attr("x", 0)
            .attr("dy", lineCount * lineHeight + "em")
            .text(line);
        }
      });
    });

  // Adjust the label transform function to account for the multiple lines of text
  function labelTransform(d) {
    const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
    const y = ((d.y0 + d.y1) / 2) * radius;
    return `rotate(${x - 90}) translate(${y},0)rotate(${x < 180 ? 0 : 180})`;
  }

  // Parent circle (for zooming)
  const parent = svg
    .append("circle")
    .datum(root)
    .attr("r", radius - 2)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("click", clicked)
    .on("mouseover", function () {
      // Change the circle color on hover
      d3.select(this).attr("fill", "#d3d3d3");
    })
    .on("mouseout", function () {
      // Revert the circle color when the mouse leaves
      d3.select(this).attr("fill", "none");
    });

  // Create the back arrow as an SVG path in the center
  const backArrow = svg
    .append("path")
    .attr("d", "M-10,0 L10,0 L0,-10 Z") // A simple triangle (pointing upwards, adjust for arrow)
    .attr("fill", "#000000") // Default color of the arrow
    .attr("transform", "translate(0,0)") // Position it in the center of the circle
    .attr("cursor", "pointer") // Make it look clickable
    .on("mouseover", function () {
      // Change arrow color on hover
      d3.select(this).attr("fill", "#d3d3d3");
    })
    .on("mouseout", function () {
      // Revert arrow color when mouse leaves
      d3.select(this).attr("fill", "#000000");
    });

  // Handle zoom on click.
  function clicked(event, p) {
    parent.datum(p.parent || root);

    root.each(
      (d) =>
        (d.target = {
          x0:
            Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) *
            2 *
            Math.PI,
          x1:
            Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) *
            2 *
            Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth),
        })
    );

    const t = svg.transition().duration(750);

    // Transition arcs
    path
      .transition(t)
      .tween("data", (d) => {
        const i = d3.interpolate(d.current, d.target);
        return (t) => (d.current = i(t));
      })
      .filter(function (d) {
        return +this.getAttribute("fill-opacity") || arcVisible(d.target);
      })
      .attr("fill-opacity", (d) =>
        arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0
      )
      .attr("pointer-events", (d) => (arcVisible(d.target) ? "auto" : "none"))
      .attrTween("d", (d) => () => arc(d.current));

    label
      .filter(function (d) {
        return +this.getAttribute("fill-opacity") || labelVisible(d.target);
      })
      .transition(t)
      .attr("fill-opacity", (d) => +labelVisible(d.target))
      .attrTween("transform", (d) => () => labelTransform(d.current));
  }

  function arcVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  }

  function labelVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }

  function labelTransform(d) {
    const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
    const y = ((d.y0 + d.y1) / 2) * radius;
    return `rotate(${x - 90}) translate(${y},0)rotate(${x < 180 ? 0 : 180})`;
  }

  // Breadcrumb container to display the current path
  const breadcrumbContainer = document.getElementById("breadcrumb");

  // Initial breadcrumb path (first layer)
  let breadcrumbPath = ["Dietary Risk"];

  // Function to update the breadcrumb display with larger font and bold current layer
  function updateBreadcrumb(pathArray) {
    // Clear existing breadcrumb content
    breadcrumbContainer.innerHTML = "";

    // Add each item in the path as plain text
    pathArray.forEach((item, index) => {
      const span = document.createElement("span");

      // Apply font size and color classes
      span.classList.add("text-xl", "text-gray-500");

      // Make the last item bold to indicate it's the current layer
      if (index === pathArray.length - 1) {
        span.classList.add("font-bold");
      }

      span.textContent = item;

      // Append ">" separator between breadcrumb items (except after the last item)
      breadcrumbContainer.appendChild(span);
      if (index < pathArray.length - 1) {
        const arrow = document.createElement("span");
        arrow.classList.add("mx-2", "text-gray-400", "text-xl");
        arrow.textContent = ">";
        breadcrumbContainer.appendChild(arrow);
      }
    });
  }

  // Modified `clicked` function to update breadcrumb path correctly
  function clicked(event, p) {
    const targetDepth = p.depth;
    const currentBreadcrumbDepth = breadcrumbPath.length - 1;

    // If we’re going deeper (e.g., user clicked on a deeper level)
    if (targetDepth > currentBreadcrumbDepth) {
      // Add missing intermediate levels if clicking directly two or more levels deeper
      let currentNode = p;
      const newPath = [];
      while (currentNode && currentNode.depth > currentBreadcrumbDepth) {
        newPath.unshift(currentNode.data.key);
        currentNode = currentNode.parent;
      }
      breadcrumbPath = breadcrumbPath.concat(newPath);
    }
    // If we're going back up (e.g., user clicked on an ancestor level)
    else if (targetDepth < currentBreadcrumbDepth) {
      // Ensure root level is retained when truncating the breadcrumb path
      breadcrumbPath = breadcrumbPath.slice(0, Math.max(1, targetDepth + 1));
    }
    // If we're staying on the same level, update breadcrumb for the new selection
    else {
      breadcrumbPath[targetDepth] = p.data.key;
    }

    // Update the breadcrumb display
    updateBreadcrumb(breadcrumbPath);

    // Perform the zoom effect
    parent.datum(p.parent || root);

    root.each(
      (d) =>
        (d.target = {
          x0:
            Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) *
            2 *
            Math.PI,
          x1:
            Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) *
            2 *
            Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth),
        })
    );

    const t = svg.transition().duration(750);

    // Transition arcs and labels based on zoom
    path
      .transition(t)
      .tween("data", (d) => {
        const i = d3.interpolate(d.current, d.target);
        return (t) => (d.current = i(t));
      })
      .filter(function (d) {
        return +this.getAttribute("fill-opacity") || arcVisible(d.target);
      })
      .attr("fill-opacity", (d) =>
        arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0
      )
      .attr("pointer-events", (d) => (arcVisible(d.target) ? "auto" : "none"))
      .attrTween("d", (d) => () => arc(d.current));

    label
      .filter(function (d) {
        return +this.getAttribute("fill-opacity") || labelVisible(d.target);
      })
      .transition(t)
      .attr("fill-opacity", (d) => +labelVisible(d.target))
      .attrTween("transform", (d) => () => labelTransform(d.current));
  }

  // Append the chart to the #visualization div
  document.getElementById("visualization").appendChild(svg.node());
});
