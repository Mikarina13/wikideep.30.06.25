/**
 * Nebula View Implementation
 * An interactive visualization for search results that displays items
 * in a galaxy-like formation with the most relevant result in the center.
 */

import * as d3 from 'd3';

class NebulaView {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
      
    this.options = {
      width: options.width || window.innerWidth,
      height: options.height || 600,
      centerNodeSize: options.centerNodeSize || 80,
      maxNodeSize: options.maxNodeSize || 60,
      minNodeSize: options.minNodeSize || 30,
      backgroundColor: options.backgroundColor || '#07202c',
      nodeColors: options.nodeColors || ['#067273', '#0a8a8c', '#0a959a'],
      linkColor: options.linkColor || 'rgba(250, 198, 55, 0.2)',
      glowColor: options.glowColor || 'rgba(250, 198, 55, 0.5)',
      glowSize: options.glowSize || 15,
      animate: options.animate !== undefined ? options.animate : true,
      animationDuration: options.animationDuration || 1500,
      zoomExtent: options.zoomExtent || [0.5, 3],
      ...options
    };

    // Initialize variables
    this.nodes = [];
    this.links = [];
    this.simulation = null;
    this.svg = null;
    this.zoom = null;
    this.nodeElements = null;
    this.linkElements = null;
    this.centerNode = null;
    
    // Bind methods
    this.render = this.render.bind(this);
    this.update = this.update.bind(this);
    this.handleZoom = this.handleZoom.bind(this);
    this.handleNodeClick = this.handleNodeClick.bind(this);
    this.getNodeColor = this.getNodeColor.bind(this);
    this.getNodeSize = this.getNodeSize.bind(this);
  }

  /**
   * Initialize the visualization
   */
  initialize() {
    if (!this.container) {
      console.error('Container element not found');
      return;
    }
    
    // Clear any existing content
    this.container.innerHTML = '';
    
    // Create SVG element
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.options.width)
      .attr('height', this.options.height)
      .attr('class', 'nebula-view-svg')
      .style('background-color', this.options.backgroundColor);
    
    // Add a defs section for the gradients and filters
    const defs = this.svg.append('defs');
    
    // Create a radial gradient for nodes
    const gradient = defs.append('radialGradient')
      .attr('id', 'node-gradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%')
      .attr('fx', '50%')
      .attr('fy', '50%');
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#fac637')
      .attr('stop-opacity', 0.8);
    
    gradient.append('stop')
      .attr('offset', '70%')
      .attr('stop-color', this.options.nodeColors[0])
      .attr('stop-opacity', 0.9);
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', this.options.nodeColors[2])
      .attr('stop-opacity', 1);
    
    // Create a glow filter
    const filter = defs.append('filter')
      .attr('id', 'glow-effect')
      .attr('height', '300%')
      .attr('width', '300%')
      .attr('x', '-100%')
      .attr('y', '-100%');
    
    filter.append('feGaussianBlur')
      .attr('class', 'blur')
      .attr('stdDeviation', this.options.glowSize)
      .attr('result', 'coloredBlur');
    
    const feComponentTransfer = filter.append('feComponentTransfer')
      .attr('in', 'coloredBlur');
      
    feComponentTransfer.append('feFuncA')
      .attr('type', 'linear')
      .attr('slope', '0.5');
    
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode')
      .attr('in', 'coloredBlur');
    feMerge.append('feMergeNode')
      .attr('in', 'SourceGraphic');
    
    // Create a container for our visualization that can be zoomed and panned
    this.zoomContainer = this.svg.append('g')
      .attr('class', 'zoom-container');
    
    // Add links group (drawn first, so they appear below nodes)
    this.linkElements = this.zoomContainer.append('g')
      .attr('class', 'links')
      .selectAll('.link');
    
    // Add nodes group
    this.nodeElements = this.zoomContainer.append('g')
      .attr('class', 'nodes')
      .selectAll('.node');
    
    // Create zoom behavior
    this.zoom = d3.zoom()
      .scaleExtent(this.options.zoomExtent)
      .on('zoom', this.handleZoom);
    
    // Apply zoom behavior to SVG
    this.svg.call(this.zoom);
    
    // Add background for pan events
    this.svg.on('click', (event) => {
      // Only handle clicks on the background, not on nodes
      if (event.target.tagName === 'svg') {
        // Pan to center on click
        this.centerView();
      }
    });
    
    // Add instructions overlay
    const instructions = d3.select(this.container)
      .append('div')
      .attr('class', 'nebula-instructions')
      .html(`
        <div class="nebula-instructions-content">
          <p>
            <span class="instruction-icon">🔍</span> Scroll to zoom in/out
          </p>
          <p>
            <span class="instruction-icon">✋</span> Click and drag to move
          </p>
          <p>
            <span class="instruction-icon">👆</span> Click a node to view details
          </p>
        </div>
      `);
    
    // Add back to list button
    const backButton = d3.select(this.container)
      .append('button')
      .attr('class', 'nebula-back-button')
      .html(`
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5"/>
          <path d="M12 19l-7-7 7-7"/>
        </svg>
        Back to List View
      `)
      .on('click', () => {
        // Find the view toggle button and click it
        const listViewButton = document.querySelector('.view-toggle-btn[data-view="list"]');
        if (listViewButton) {
          listViewButton.click();
        }
      });
      
    // Create force simulation
    this.simulation = d3.forceSimulation()
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(this.options.width / 2, this.options.height / 2))
      .force('link', d3.forceLink().id(d => d.id).distance(100))
      .force('x', d3.forceX().strength(0.02))
      .force('y', d3.forceY().strength(0.02))
      .force('collide', d3.forceCollide().radius(d => this.getNodeSize(d) + 5).iterations(2))
      .on('tick', this.render);

    return this;
  }

  /**
   * Set the data for the visualization
   * @param {Array} data - Array of search result objects
   */
  setData(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('Invalid or empty data provided');
      return this;
    }
    
    // Reset nodes and links
    this.nodes = [];
    this.links = [];
    
    // Set the center node (most relevant result)
    this.centerNode = {
      ...data[0],
      id: 'center-' + data[0].id,
      fixed: true,
      x: this.options.width / 2,
      y: this.options.height / 2,
      relevance: 1,
      isCenter: true
    };
    
    this.nodes.push(this.centerNode);
    
    // Add the rest of the nodes
    data.forEach((item, index) => {
      if (index === 0) return; // Skip the first item (already added as center)
      
      // Calculate the relevance based on position (0 to 1)
      const relevance = 1 - (index / data.length);
      
      // Create node
      const node = {
        ...item,
        id: item.id,
        relevance,
        isCenter: false
      };
      
      this.nodes.push(node);
      
      // Create links from center to other nodes
      this.links.push({
        source: this.centerNode.id,
        target: node.id,
        value: relevance
      });
      
      // Create some additional links between nearby nodes for more interesting structure
      // Only do this for a subset of nodes to avoid too many links
      if (index > 1 && index % 3 === 0 && index < data.length - 1) {
        this.links.push({
          source: node.id,
          target: data[index + 1].id,
          value: Math.min(relevance, 1 - ((index + 1) / data.length))
        });
      }
    });
    
    return this;
  }

  /**
   * Update the visualization with current data
   */
  update() {
    if (!this.svg || !this.simulation) {
      console.error('Nebula View not initialized');
      return this;
    }
    
    // Update links
    this.linkElements = this.linkElements
      .data(this.links, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
      .join(
        enter => enter.append('line')
          .attr('class', 'link')
          .style('stroke', this.options.linkColor)
          .style('stroke-width', d => Math.max(1, d.value * 3))
          .style('stroke-opacity', 0)
          .call(enter => enter.transition()
            .duration(this.options.animate ? this.options.animationDuration : 0)
            .style('stroke-opacity', d => d.value * 0.8)),
        update => update
          .style('stroke-width', d => Math.max(1, d.value * 3)),
        exit => exit.transition()
          .duration(this.options.animate ? 500 : 0)
          .style('stroke-opacity', 0)
          .remove()
      );
    
    // Update nodes
    this.nodeElements = this.nodeElements
      .data(this.nodes, d => d.id)
      .join(
        enter => {
          const nodeGroup = enter.append('g')
            .attr('class', d => `node ${d.isCenter ? 'center-node' : ''}`)
            .style('cursor', 'pointer')
            .call(this.drag())
            .on('click', (event, d) => this.handleNodeClick(event, d));
          
          // Add glow effect
          nodeGroup.append('circle')
            .attr('class', 'node-glow')
            .attr('r', d => this.getNodeSize(d) + 5)
            .style('fill', d => d.isCenter ? '#fac637' : this.getNodeColor(d))
            .style('opacity', 0.3)
            .attr('filter', 'url(#glow-effect)');
          
          // Add main node circle
          nodeGroup.append('circle')
            .attr('class', 'node-circle')
            .attr('r', 0)
            .style('fill', d => d.isCenter ? 'url(#node-gradient)' : this.getNodeColor(d))
            .style('stroke', d => d.isCenter ? '#fac637' : 'rgba(255, 255, 255, 0.3)')
            .style('stroke-width', d => d.isCenter ? 2 : 1)
            .call(enter => enter.transition()
              .duration(this.options.animate ? this.options.animationDuration : 0)
              .attr('r', d => this.getNodeSize(d)));
          
          // Add title text
          nodeGroup.append('text')
            .attr('class', 'node-title')
            .attr('dy', d => d.isCenter ? -10 : 3)
            .attr('text-anchor', 'middle')
            .style('fill', 'white')
            .style('font-weight', d => d.isCenter ? '600' : '400')
            .style('font-size', d => d.isCenter ? '14px' : '12px')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .text(d => this.truncateText(d.title, d.isCenter ? 25 : 18))
            .call(enter => enter.transition()
              .duration(this.options.animate ? this.options.animationDuration : 0)
              .style('opacity', 1));
          
          return nodeGroup;
        },
        update => update,
        exit => exit.transition()
          .duration(this.options.animate ? 500 : 0)
          .style('opacity', 0)
          .remove()
      );
    
    // Update simulation
    this.simulation.nodes(this.nodes);
    this.simulation.force('link').links(this.links);
    this.simulation.alpha(1).restart();
    
    // Center the view
    this.centerView();
    
    return this;
  }

  /**
   * Render the current state of the visualization
   */
  render() {
    // Update link positions
    this.linkElements
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
    
    // Update node positions
    this.nodeElements
      .attr('transform', d => `translate(${d.x}, ${d.y})`);
    
    // Keep center node fixed in the center
    if (this.centerNode) {
      this.centerNode.fx = this.options.width / 2;
      this.centerNode.fy = this.options.height / 2;
    }
  }

  /**
   * Create a drag behavior for nodes
   */
  drag() {
    return d3.drag()
      .on('start', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0);
        if (!d.isCenter) {
          d.fx = null;
          d.fy = null;
        }
      });
  }

  /**
   * Handle zoom events
   */
  handleZoom(event) {
    this.zoomContainer.attr('transform', event.transform);
  }

  /**
   * Center the view on the visualization
   */
  centerView() {
    const duration = this.options.animate ? 750 : 0;
    
    this.svg.transition()
      .duration(duration)
      .call(
        this.zoom.transform,
        d3.zoomIdentity
          .translate(this.options.width / 2, this.options.height / 2)
          .scale(1)
          .translate(-this.options.width / 2, -this.options.height / 2)
      );
  }

  /**
   * Handle node click events
   */
  handleNodeClick(event, d) {
    // Prevent event from bubbling up to SVG
    event.stopPropagation();
    
    // You can add custom click behavior here
    if (typeof this.options.onNodeClick === 'function') {
      this.options.onNodeClick(d);
    } else {
      // Default behavior: navigate to post
      window.location.href = `/view-post.html?type=${d.type || 'archive'}&id=${d.id.replace('center-', '')}`;
    }
  }

  /**
   * Get the color for a node based on its relevance
   */
  getNodeColor(d) {
    if (d.isCenter) return this.options.nodeColors[0];
    
    // Calculate color based on relevance
    const colorIndex = Math.floor((1 - d.relevance) * this.options.nodeColors.length);
    return this.options.nodeColors[Math.min(colorIndex, this.options.nodeColors.length - 1)];
  }

  /**
   * Get the size for a node based on its relevance
   */
  getNodeSize(d) {
    if (d.isCenter) return this.options.centerNodeSize;
    
    // Calculate size based on relevance
    const sizeRange = this.options.maxNodeSize - this.options.minNodeSize;
    return this.options.minNodeSize + (d.relevance * sizeRange);
  }

  /**
   * Truncate text to a specific length
   */
  truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : text;
  }

  /**
   * Resize the visualization
   */
  resize(width, height) {
    this.options.width = width || window.innerWidth;
    this.options.height = height || 600;
    
    this.svg
      .attr('width', this.options.width)
      .attr('height', this.options.height);
    
    this.simulation
      .force('center', d3.forceCenter(this.options.width / 2, this.options.height / 2));
    
    this.simulation.alpha(1).restart();
    
    return this;
  }
}

export default NebulaView;