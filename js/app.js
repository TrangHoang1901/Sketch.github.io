// Initialize Data with labels
let data = {
  nodes: [],
  node_count: 0,
  links: []
};

const radius = 16;

const width = 850;
const height = 575;
const center = [width/2, height / 2];
const colors = ['#86E1E0', '#f7abc7', '#c5ea8b', '#fde780', '#ee9392', '#b494c5'];

// Create a button for each color
colors.forEach(color => {
  d3.select('body').append('button')
    .style('background-color', color)
    .attr('class', 'color-button')
    .attr('data-color', color)
    .text(color);
});

d3.selection.prototype.moveToBack = function() {
  return this.each(function() {
      var firstChild = this.parentNode.firstChild;
      if (firstChild) {
          this.parentNode.insertBefore(this, firstChild);
      }
  });
};

d3.select('body').on('keydown', deleteNode);

const force = d3.layout.force()
  .nodes(data.nodes)
  .links(data.links)
  .size([width, height])
  .linkDistance(150)
  .charge(-500);

const links = force.links();
const nodes = force.nodes();

const svg = d3.select("body")
  .append('svg')
  .attr('width', width)
  .attr('height', height)
  .attr('class', 'canvas')
  .on('mousedown', addNode);

let link = svg.selectAll('line')
  .data(data.links)
  .enter()
  .append('line')
  .classed('link', true);

let node = svg.selectAll('circle')
  .data(data.nodes)
  .enter()
  .append('circle')
  .attr('r', radius)
  .attr('stroke-width', 1.5)
  .classed('node', true)
  .on('mousedown', nodeMouseDown);

force.on("tick", () => {
  link
    .attr('x1', (d) => d.source.x)
    .attr('y1', (d) => d.source.y)
    .attr('x2', (d) => d.target.x)
    .attr('y2', (d) => d.target.y);

  node
    .attr('cx', (d) => d.x)
    .attr('cy', (d) => d.y)
    .call(force.drag());

  // Update node positions
  svg.selectAll(".node-group")
    .attr("transform", d => `translate(${d.x},${d.y})`);

  // Update loop positions
  svg.selectAll('.loop')
  .attr('d', d => {
    const x = d.source.x;
    const y = d.source.y;
    const dx = radius * 2;
    const dy = radius * 2;
    return `M${x},${y} C${x + dx},${y - dy} ${x - dx},${y - dy} ${x},${y}`;
  });
});


// Add event listeners to the color buttons
d3.selectAll('.color-button').on('click', function() {
  currentColor = d3.select(this).attr('data-color');
});

function nodeMouseDown() {
  d3.event.stopPropagation();

  const firstNode = d3.selectAll('.selected').data()[0];

  clearSelection();

  const node = d3.select(this);

  node.classed('selected', true);
  node.style('fill', currentColor); 
  node.transition()
    .duration(100)
    .attr('r', 19)
    .transition()
    .duration(100)
    .attr('r', radius)
    .duration(300)
    .attr('stroke-width', 3);

  addEdge(firstNode, d3.select(this).data()[0]);
}



function clearSelection() {
  d3.selectAll('.selected')
    .classed('selected', false)
    .transition()
    .duration(500)
    .attr('stroke-width', 1.5);

}

function addNode() {
  const pos = d3.mouse(this);
  const newNodeIndex = data.node_count++;
  data.nodes.push({index: newNodeIndex, label: `v${newNodeIndex + 1}`, x: pos[0], y: pos[1], degree: 0});

  update();
}

function deleteNode() {
  if (d3.event.code === 'Backspace') {
    d3.event.preventDefault();

    const selectedNodeData = d3.selectAll('.selected').data()[0];
    if (!selectedNodeData) return;

    // Remove the node
    data.nodes = data.nodes.filter(node => node.index !== selectedNodeData.index);

    // Update the links
    data.links = data.links.filter(link => {
      return link.source.index !== selectedNodeData.index && link.target.index !== selectedNodeData.index;
    });

    // Adjust the indices in the links
    data.links.forEach(link => {
      if (link.source.index > selectedNodeData.index) link.source = data.nodes[link.source.index - 1];
      if (link.target.index > selectedNodeData.index) link.target = data.nodes[link.target.index - 1];
    });

    update();
  }
}

function calculateDegrees() {
  // Reset degrees
  data.nodes.forEach(node => { node.degree = 0; });

  // Calculate degree by counting how many links each node has
  data.links.forEach(link => {
    data.nodes[link.source.index].degree++;
    data.nodes[link.target.index].degree++;
  });
}

function addEdge(node1, node2) {
  if (!node1) return null;
  if (node1.index === node2.index) return null;
  let overlap = false;
  data.links.forEach( linkObj => {
    if (linkObj.source.index === node1.index && linkObj.target.index === node2.index
        || linkObj.source.index === node2.index && linkObj.target.index === node1.index) {
      overlap = true;
    }
  });
  if (overlap) return null;
  data.links.push({source: node1.index, target: node2.index});

  // Update degrees for the two nodes involved
  data.nodes[node1.index].degree++;
  data.nodes[node2.index].degree++;

  update();
}

// Define the deleteEdge function
function deleteEdge(d) {
  // Prevent any node click events
  d3.event.stopPropagation();

  // Remove the link from the data
  data.links = data.links.filter(l => l !== d);

  // Update degrees for the two nodes involved
  data.nodes[d.source.index].degree--;
  data.nodes[d.target.index].degree--;

}

// Function to create a loop for a selected node
function createLoopForSelectedNode() {
  const selectedNodeData = d3.selectAll('.selected').data()[0];
  if (!selectedNodeData) {
    alert("Please select a node to create a loop.");
    return;
  }

  // Check if a loop already exists
  const loopExists = data.links.some(link => link.source.index === selectedNodeData.index && link.target.index === selectedNodeData.index);
  if (loopExists) {
    alert("A loop already exists for this node.");
    return;
  }

  // Add a loop to the selected node
  data.links.push({ source: selectedNodeData.index, target: selectedNodeData.index });

  // Update the graph
  update();
}

// Add event listener to the loop creation button
d3.select('#create-loop-button').on('click', createLoopForSelectedNode);

// Update the loop information display
function updateLoopInfo() {
  // Select the loop list element
  const loopList = d3.select('#loop-list');

  // Remove any existing loop information
  loopList.selectAll('li').remove();

  // Filter the links to get only loops
  const loops = data.links.filter(link => link.source.index === link.target.index);

  // Append a list item for each loop with the vertex label
  loops.forEach(loop => {
    loopList.append('li')
      .text(`Loop: Vertex ${loop.source.label}`);
  });
}

// Add event listener to the custom loop creation button
d3.select('#create-custom-loop-button').on('click', createCustomLoop);

// Function to create a loop with a specified number of vertices
function createCustomLoop() {
  // Read the number of vertices from the input field
  // const numberOfVertices = parseInt(document.getElementById('vertex-count-input').value);

  // Get the input field element
  const inputElement = document.getElementById('vertex-count-input');
  
  // Read the number of vertices from the input field
  const numberOfVertices = parseInt(inputElement.value);

  // Validate the input
  if (isNaN(numberOfVertices) || numberOfVertices < 3 || numberOfVertices > 10) {
    alert("Please enter a valid number of vertices between 3 and 10.");
    return;
  }

  const angleStep = (Math.PI * 2) / numberOfVertices;
  let lastNodeIndex = null;
  let firstNodeIndex = null;

  // Create the vertices
  for (let i = 0; i < numberOfVertices; i++) {
    const angle = i * angleStep;
    const x = center[0] + 150 * Math.cos(angle);
    const y = center[1] + 150 * Math.sin(angle);
    const newNodeIndex = data.node_count++;
    const newNode = {index: newNodeIndex, label: `v${newNodeIndex + 1}`, x: x, y: y, degree: 0};
    data.nodes.push(newNode);

    // Connect the vertices
    if (lastNodeIndex !== null) {
      addEdge(data.nodes[lastNodeIndex], newNode);
    } else {
      firstNodeIndex = newNodeIndex;
    }
    lastNodeIndex = newNodeIndex;
  }

  // Connect the last vertex to the first to close the loop
  if (firstNodeIndex !== null && lastNodeIndex !== null) {
    addEdge(data.nodes[lastNodeIndex], data.nodes[firstNodeIndex]);
  }

  // Update the graph
  update();

  // Clear the input field after creating the loop
  inputElement.value = '';
}

function update() {
  link = link.data(data.links);

  link.enter()
    .append("line")
    .attr("class", "link")
    .on('mousedown', deleteEdge); // Add this line to handle click events on links

  link.exit().remove();

  d3.selectAll('line')
    .moveToBack();
  
  // Update the nodes
  node = node.data(data.nodes);

  // Enter any new nodes
  const nodeEnter = node.enter()
    .append("g")
    .attr("class", "node-group");

    nodeEnter.append("circle")
    .attr("class", "node")
    .attr("r", radius)
    .attr('stroke-width', 1.5)
    .on('mousedown', nodeMouseDown);


  // Enter new labels
  nodeEnter.append("text")
    .attr("class", "label")
    .attr("dx", 12)
    .attr("dy", ".35em")
    .text(d => `${d.label}: ${d.degree}`); // Update the label with the degree

  // Update all nodes
  node.select("circle")
    .attr("r", radius)
    .attr('stroke-width', 1.5);

  // Update all labels
  node.select("text")
    .text(d => `${d.label}: ${d.degree}`); // Include the degree in the label

  // Update the degree display for each node
  node.each(function(d) {
    d3.select(this)
      .attr('data-degree', d.degree) // Set a data attribute for the degree
      .select('title') // You might need to add this element to display the degree
      .text(`Degree: ${d.degree}`);
  });

  // Remove old nodes
  node.exit().remove();

// Handle loops (edges that connect a node to itself)
const loops = svg.selectAll('.loop')
.data(data.links.filter(link => link.source.index === link.target.index));

loops.enter()
.append('path')
.classed('loop', true)
.attr('d', d => {
  // This is a simple way to create a loop path, you might want to customize it
  const x = d.source.x;
  const y = d.source.y;
  const dx = radius * 2;
  const dy = radius * 2;
  return `M${x},${y} C${x + dx},${y - dy} ${x - dx},${y - dy} ${x},${y}`;
})
.style('fill', 'none')
.style('stroke', '#000');

loops.exit().remove();

  force.start();
  clearSelection();


  // Display the number of vertices and edges
  d3.select('#info-vertices').text(`Vertices: ${data.nodes.length}`);
  d3.select('#info-edges').text(`Edges: ${data.links.length}`);

  // Update the info display for degrees
  d3.select('#info-degrees').text(`Degrees: ${data.nodes.map(node => node.degree).join(', ')}`);

  // Update the loop information display
  updateLoopInfo();
  
}

force.start();
