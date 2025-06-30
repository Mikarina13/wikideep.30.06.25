/**
 * WikiDeep.io Initializer
 * This script handles initial setup and core features across all pages
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('WikiDeep.io initializing...');
  
  // Track page load performance
  logPerformance();
  
  // Fix any styling inconsistencies
  applyStylingFixes();
  
  // Initialize lazy loading for images
  setupLazyLoading();
  
  // Detect and handle errors
  setupErrorHandling();
  
  // Add keyboard navigation support
  setupKeyboardNavigation();
  
  console.log('WikiDeep.io initialization complete');
});

/**
 * Log page load performance metrics
 */
function logPerformance() {
  if (window.performance) {
    setTimeout(() => {
      const timing = window.performance.timing;
      const pageLoad = timing.loadEventEnd - timing.navigationStart;
      const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
      
      console.info(`Page load performance:
        - Total load time: ${pageLoad}ms
        - DOM ready time: ${domReady}ms
      `);
      
      // Report to analytics if slow
      if (pageLoad > 3000) {
        console.warn('Slow page load detected');
      }
    }, 0);
  }
}

/**
 * Apply fixes for cross-browser styling inconsistencies
 */
function applyStylingFixes() {
  // Ensure all SVGs have proper sizing
  document.querySelectorAll('svg').forEach(svg => {
    if (!svg.hasAttribute('width') || !svg.hasAttribute('height')) {
      if (svg.parentElement.classList.contains('nav-item')) {
        // Navigation SVGs
        svg.setAttribute('width', '20');
        svg.setAttribute('height', '20');
      } else {
        // Default sizes for other SVGs
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
      }
    }
    
    // Ensure all SVGs have proper styling
    if (!svg.hasAttribute('fill')) {
      svg.setAttribute('fill', 'none');
    }
    
    if (!svg.hasAttribute('stroke')) {
      svg.setAttribute('stroke', 'currentColor');
    }
    
    if (!svg.hasAttribute('stroke-width')) {
      svg.setAttribute('stroke-width', '2');
    }
  });
  
  // Fix button styling for Safari
  document.querySelectorAll('button').forEach(button => {
    if (!button.style.cursor) {
      button.style.cursor = 'pointer';
    }
  });
  
  // Ensure proper footer visibility and z-index
  const footer = document.querySelector('.footer');
  if (footer) {
    footer.classList.add('visible');
    
    // Ensure footer has proper z-index
    if (!footer.style.zIndex) {
      footer.style.zIndex = '1000';
    }
  }
}

/**
 * Set up native lazy loading for images
 */
function setupLazyLoading() {
  document.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
    
    if (!img.hasAttribute('decoding')) {
      img.setAttribute('decoding', 'async');
    }
    
    // Add error handling for images
    img.onerror = function() {
      this.onerror = null;
      this.src = 'https://i.imgur.com/zcLQ3gB.png'; // Fallback image
      this.alt = 'Image failed to load';
    };
  });
}

/**
 * Set up global error handling
 */
function setupErrorHandling() {
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Log errors to local storage for debugging
    try {
      const errors = JSON.parse(localStorage.getItem('wikideep_errors') || '[]');
      errors.push({
        message: event.error?.message || 'Unknown error',
        location: `${event.filename}:${event.lineno}:${event.colno}`,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      
      // Keep only the last 20 errors
      if (errors.length > 20) {
        errors.shift();
      }
      
      localStorage.setItem('wikideep_errors', JSON.stringify(errors));
    } catch (e) {
      // Ignore storage errors
    }
    
    return false;
  });
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Log to localStorage
    try {
      const errors = JSON.parse(localStorage.getItem('wikideep_errors') || '[]');
      errors.push({
        message: event.reason?.message || 'Unhandled promise rejection',
        reason: String(event.reason),
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      
      // Keep only the last 20 errors
      if (errors.length > 20) {
        errors.shift();
      }
      
      localStorage.setItem('wikideep_errors', JSON.stringify(errors));
    } catch (e) {
      // Ignore storage errors
    }
  });
}

/**
 * Set up keyboard navigation
 */
function setupKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    // ESC key closes any modal
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active, .modal-content.active').forEach(modal => {
        modal.classList.remove('active');
      });
      
      // Close menu if open
      const menuOptions = document.querySelector('.menu-options.active');
      if (menuOptions) {
        menuOptions.classList.remove('active');
        document.querySelector('.menu-overlay')?.classList.remove('active');
      }
    }
    
    // Alt+H opens help
    if (e.altKey && e.key === 'h') {
      window.location.href = '/help.html';
    }
  });
  
  // Add tab indices for better keyboard navigation
  document.querySelectorAll('a, button, input, textarea, select, [role="button"]').forEach(element => {
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }
  });
}