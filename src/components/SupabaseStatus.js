/**
 * Supabase Status Component
 * A utility component that can be used to display the status of Supabase services
 */

import { checkSupabaseHealth } from '../utils/supabaseHealthChecker.js';

class SupabaseStatus extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Initial render
    this.render();
    
    // Check status automatically when component is created
    this.checkStatus();
  }
  
  async checkStatus() {
    this.updateStatus({ status: 'CHECKING' });
    
    try {
      const healthResults = await checkSupabaseHealth();
      this.updateStatus(healthResults);
    } catch (error) {
      console.error('Error checking Supabase status:', error);
      this.updateStatus({
        status: 'ERROR',
        healthy: false,
        errors: [{ message: error.message }]
      });
    }
  }
  
  updateStatus(results) {
    const statusIndicator = this.shadowRoot.querySelector('.status-indicator');
    const statusText = this.shadowRoot.querySelector('.status-text');
    const detailsSection = this.shadowRoot.querySelector('.status-details');
    
    if (!statusIndicator || !statusText) return;
    
    // Update the indicator and text
    if (results.status === 'CHECKING') {
      statusIndicator.className = 'status-indicator checking';
      statusText.textContent = 'Checking Supabase connection...';
      return;
    }
    
    if (results.healthy) {
      statusIndicator.className = 'status-indicator healthy';
      statusText.textContent = 'Supabase: Connected';
      
      if (detailsSection) {
        detailsSection.innerHTML = `
          <div class="detail-item">
            <span class="detail-label">Latency:</span>
            <span class="detail-value">${results.details.connectionLatency || 'N/A'} ms</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">DB Status:</span>
            <span class="detail-value">${results.database ? 'OK' : 'Issues'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Auth:</span>
            <span class="detail-value">${results.auth ? 'OK' : 'Issues'}</span>
          </div>
        `;
      }
      
    } else {
      statusIndicator.className = 'status-indicator unhealthy';
      statusText.textContent = `Supabase: ${results.status || 'Connection Issues'}`;
      
      if (detailsSection && results.errors && results.errors.length > 0) {
        detailsSection.innerHTML = `
          <div class="error-message">
            ${results.errors.map(err => `
              <div class="error-item">
                <strong>${err.component || 'Error'}:</strong> ${err.message}
              </div>
            `).join('')}
          </div>
          <button class="retry-btn">Retry Connection</button>
        `;
        
        // Add event listener to retry button
        const retryBtn = detailsSection.querySelector('.retry-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => this.checkStatus());
        }
      }
    }
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
        }
        
        .status-container {
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          min-width: 200px;
        }
        
        .status-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        
        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .status-indicator.healthy {
          background-color: #4CAF50;
          box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
        }
        
        .status-indicator.unhealthy {
          background-color: #F44336;
          box-shadow: 0 0 8px rgba(244, 67, 54, 0.6);
        }
        
        .status-indicator.checking {
          background-color: #FFC107;
          box-shadow: 0 0 8px rgba(255, 193, 7, 0.6);
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        
        .status-text {
          font-size: 14px;
          font-weight: 500;
        }
        
        .status-details {
          margin-top: 8px;
          font-size: 12px;
          border-top: 1px solid #f0f0f0;
          padding-top: 8px;
        }
        
        .detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        
        .detail-label {
          color: #666;
        }
        
        .detail-value {
          font-weight: 500;
        }
        
        .error-message {
          color: #F44336;
          margin-bottom: 8px;
        }
        
        .error-item {
          margin-bottom: 4px;
        }
        
        .retry-btn {
          background: #067273;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
          width: 100%;
          margin-top: 8px;
        }
        
        .retry-btn:hover {
          background: #045c66;
        }
      </style>
      
      <div class="status-container">
        <div class="status-header">
          <div class="status-indicator checking"></div>
          <div class="status-text">Checking Supabase...</div>
        </div>
        <div class="status-details"></div>
      </div>
    `;
  }
}

// Register the custom element
customElements.define('supabase-status', SupabaseStatus);

export default SupabaseStatus;