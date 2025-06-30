/**
 * Search Results View Manager
 * Handles switching between list view and nebula view for search results
 */
 
import NebulaView from './nebulaView.js';

export default class SearchResultsView {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      listViewSelector: options.listViewSelector || '#posts-container',
      listToggleSelector: options.listToggleSelector || '.view-toggle-btn[data-view="list"]',
      nebulaToggleSelector: options.nebulaToggleSelector || '.view-toggle-btn[data-view="nebula"]',
      nebulaContainerId: options.nebulaContainerId || 'nebula-view-container',
      resultsData: options.resultsData || [],
      onSwitchView: options.onSwitchView || null,
      ...options
    };
    
    this.listViewContainer = document.querySelector(this.options.listViewSelector);
    this.nebulaViewContainer = null;
    this.nebulaView = null;
    this.currentView = 'list';
    
    // Create nebula container if it doesn't exist
    this._createNebulaContainer();
    
    // Initialize the view
    this._initializeView();
    
    // Bind methods
    this._handleResize = this._handleResize.bind(this);
    this.switchToListView = this.switchToListView.bind(this);
    this.switchToNebulaView = this.switchToNebulaView.bind(this);
    this.updateResults = this.updateResults.bind(this);
  }
  
  /**
   * Create the container for the Nebula View
   */
  _createNebulaContainer() {
    // Check if container already exists
    if (document.getElementById(this.options.nebulaContainerId)) {
      this.nebulaViewContainer = document.getElementById(this.options.nebulaContainerId);
      return;
    }
    
    // Create new container
    this.nebulaViewContainer = document.createElement('div');
    this.nebulaViewContainer.id = this.options.nebulaContainerId;
    this.nebulaViewContainer.className = 'nebula-view-container';
    this.nebulaViewContainer.style.display = 'none';
    
    // Add container after list view container
    if (this.listViewContainer && this.listViewContainer.parentNode) {
      this.listViewContainer.parentNode.insertBefore(
        this.nebulaViewContainer, 
        this.listViewContainer.nextSibling
      );
    }
  }
  
  /**
   * Initialize the view
   */
  _initializeView() {
    // Set up event listeners
    const listToggle = document.querySelector(this.options.listToggleSelector);
    const nebulaToggle = document.querySelector(this.options.nebulaToggleSelector);
    
    if (listToggle) {
      listToggle.addEventListener('click', this.switchToListView);
    }
    
    if (nebulaToggle) {
      nebulaToggle.addEventListener('click', this.switchToNebulaView);
    }
    
    // Set up resize handler
    window.addEventListener('resize', this._handleResize);
    
    // Initialize with current results data
    if (this.options.resultsData.length > 0) {
      this.updateResults(this.options.resultsData);
    }
  }
  
  /**
   * Switch to List View
   */
  switchToListView() {
    if (this.currentView === 'list') return;
    
    // Update UI
    this._updateToggleButtons('list');
    
    // Show list view, hide nebula view
    if (this.listViewContainer) {
      this.listViewContainer.style.display = 'block';
    }
    
    if (this.nebulaViewContainer) {
      this.nebulaViewContainer.style.display = 'none';
    }
    
    this.currentView = 'list';
    
    // Callback
    if (typeof this.options.onSwitchView === 'function') {
      this.options.onSwitchView('list');
    }
  }
  
  /**
   * Switch to Nebula View
   */
  switchToNebulaView() {
    if (this.currentView === 'nebula') return;
    
    // Update UI
    this._updateToggleButtons('nebula');
    
    // Show nebula view, hide list view
    if (this.listViewContainer) {
      this.listViewContainer.style.display = 'none';
    }
    
    if (this.nebulaViewContainer) {
      this.nebulaViewContainer.style.display = 'block';
    }
    
    // Initialize nebula view if not already done
    if (!this.nebulaView) {
      this.nebulaView = new NebulaView(this.nebulaViewContainer, {
        width: this.nebulaViewContainer.clientWidth,
        height: 600,
        nodeColors: ['#067273', '#0a8a8c', '#0a959a'],
        linkColor: 'rgba(250, 198, 55, 0.2)',
        glowColor: 'rgba(250, 198, 55, 0.5)'
      }).initialize();
      
      if (this.options.resultsData.length > 0) {
        this.nebulaView.setData(this.options.resultsData).update();
      }
    } else {
      // Resize in case the container size has changed
      this.nebulaView.resize(this.nebulaViewContainer.clientWidth, 600);
    }
    
    this.currentView = 'nebula';
    
    // Callback
    if (typeof this.options.onSwitchView === 'function') {
      this.options.onSwitchView('nebula');
    }
  }
  
  /**
   * Update the results data
   */
  updateResults(data) {
    this.options.resultsData = data;
    
    // Update nebula view if it exists and is currently visible
    if (this.nebulaView && this.currentView === 'nebula') {
      this.nebulaView.setData(data).update();
    }
  }
  
  /**
   * Update toggle buttons to reflect current view
   */
  _updateToggleButtons(activeView) {
    const listToggle = document.querySelector(this.options.listToggleSelector);
    const nebulaToggle = document.querySelector(this.options.nebulaToggleSelector);
    
    if (listToggle) {
      listToggle.classList.toggle('active', activeView === 'list');
    }
    
    if (nebulaToggle) {
      nebulaToggle.classList.toggle('active', activeView === 'nebula');
    }
  }
  
  /**
   * Handle window resize events
   */
  _handleResize() {
    if (this.nebulaView && this.nebulaViewContainer) {
      this.nebulaView.resize(this.nebulaViewContainer.clientWidth, 600);
    }
  }
  
  /**
   * Destroy the view and clean up
   */
  destroy() {
    // Remove event listeners
    window.removeEventListener('resize', this._handleResize);
    
    const listToggle = document.querySelector(this.options.listToggleSelector);
    const nebulaToggle = document.querySelector(this.options.nebulaToggleSelector);
    
    if (listToggle) {
      listToggle.removeEventListener('click', this.switchToListView);
    }
    
    if (nebulaToggle) {
      nebulaToggle.removeEventListener('click', this.switchToNebulaView);
    }
    
    // Clean up nebula view
    if (this.nebulaViewContainer) {
      this.nebulaViewContainer.innerHTML = '';
    }
    
    this.nebulaView = null;
  }
}