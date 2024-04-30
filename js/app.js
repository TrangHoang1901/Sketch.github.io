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

});

function nodeMouseDown() {
  d3.event.stopPropagation();

  const firstNode = d3.selectAll('.selected').data()[0];

  clearSelection();

  const node = d3.select(this);

  node.classed('selected', true);
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
  data.nodes.push({index: newNodeIndex, label: `v${newNodeIndex + 1}`, x: pos[0], y: pos[1]});

  update();
}

function deleteNode() {
  if(d3.event.code === 'Backspace') {
    d3.event.preventDefault();

    const nodeData = d3.selectAll('.selected').data()[0];
    if (!nodeData) return null;
    const nodeIndex = data.nodes.indexOf(nodeData);
    data.nodes.splice(nodeIndex, 1);
    const edges = data.links.filter(linkObj => {
      return (
        linkObj.source.index === nodeIndex || linkObj.target.index === nodeIndex
      );
    });
    edges.forEach( edge => {
      const edgeIndex = data.links.indexOf(edge);
      data.links.splice(edgeIndex, 1);
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

  update();
}

// Define the deleteEdge function
function deleteEdge(d) {
  // Prevent any node click events
  d3.event.stopPropagation();

  // Remove the link from the data
  data.links = data.links.filter(l => l !== d);

  // Update the visualization
  update();
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
    .text(d => d.label);

  // Update all nodes
  node.select("circle")
    .attr("r", radius)
    .attr('stroke-width', 1.5);

  // Update all labels
  node.select("text")
    .text(d => d.label);

  // Remove old nodes
  node.exit().remove();

  force.start();
  clearSelection();

  // Display the number of vertices and edges
  d3.select('#info-vertices').text(`Vertices: ${data.nodes.length}`);
  d3.select('#info-edges').text(`Edges: ${data.links.length}`);

  // Calculate degrees
  calculateDegrees();

  // Update the degree display for each node
  node.each(function(d) {
    d3.select(this)
      .attr('data-degree', d.degree) // Set a data attribute for the degree
      .select('title') // You might need to add this element to display the degree
      .text(`Degree: ${d.degree}`);
  });

  // Update the info display for degrees
  d3.select('#info-degrees').text(`Degrees: ${data.nodes.map(node => node.degree).join(', ')}`);

  // Add this line to create the #info-degrees paragraph in your HTML
  // d3.select('#graph-info').append('p').attr('id', 'info-degrees').text('Degrees: ');
}

force.start();
