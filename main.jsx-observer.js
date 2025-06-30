// This script enhances the user interface elements after React renders the content

document.addEventListener('DOMContentLoaded', function() {
  console.log('UI Enhancement script initialized');
  
  // Set up the MutationObserver to watch for changes in the DOM
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        // Check if our target elements have been rendered
        enhanceFilterToggle();
        
        // Apply carousel styles if needed
        const carouselElements = document.querySelectorAll('.posts-grid');
        if (carouselElements.length > 0) {
          applyCarouselStyles();
        }
        
        // Remove navigation elements if present
        removeNavigationElements();
        
        // NEW: Force tab styling to work
        forceStylingFixes();
      }
    });
  });

  // Start observing the document
  observer.observe(document.body, { 
    childList: true,
    subtree: true 
  });

  // Initial call to enhance elements that might already be on the page
  enhanceFilterToggle();
  forceStylingFixes();

  // Function to force styling fixes - critical for production
  function forceStylingFixes() {
    // Fix tabs styling in publish form
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      if (!button.hasAttribute('data-styled')) {
        button.style.flex = '1';
        button.style.padding = '12px 20px';
        button.style.background = button.classList.contains('active') ? '#fac637' : 'transparent';
        button.style.color = '#07717c';
        button.style.border = 'none';
        button.style.fontSize = '16px';
        button.style.fontWeight = button.classList.contains('active') ? '600' : '500';
        button.style.cursor = 'pointer';
        button.style.transition = 'all 0.2s ease';
        button.style.borderRadius = '6px';
        
        // Add click handler to ensure styling updates on click
        button.addEventListener('click', function() {
          // Update styles for all buttons
          tabButtons.forEach(btn => {
            btn.style.background = 'transparent';
            btn.style.fontWeight = '500';
          });
          
          // Update styles for active button
          this.style.background = '#fac637';
          this.style.fontWeight = '600';
        });
        
        button.setAttribute('data-styled', 'true');
      }
    });
    
    // Fix tabs container styling
    const publishTabs = document.querySelector('.publish-tabs');
    if (publishTabs && !publishTabs.hasAttribute('data-styled')) {
      publishTabs.style.display = 'flex';
      publishTabs.style.gap = '2px';
      publishTabs.style.marginBottom = '0';
      publishTabs.style.justifyContent = 'center';
      publishTabs.style.background = 'rgba(6, 114, 115, 0.05)';
      publishTabs.style.borderRadius = '0';
      publishTabs.style.padding = '3px';
      publishTabs.style.width = '100%';
      publishTabs.style.zIndex = '5';
      
      publishTabs.setAttribute('data-styled', 'true');
    }
    
    // Fix content choice buttons
    const choiceButtons = document.querySelectorAll('.choice-button');
    choiceButtons.forEach(button => {
      if (!button.hasAttribute('data-styled')) {
        button.style.flex = '1';
        button.style.padding = '12px 20px';
        button.style.background = button.classList.contains('active') ? '#fac637' : 'transparent';
        button.style.color = '#07717c';
        button.style.border = 'none';
        button.style.fontSize = '16px';
        button.style.fontWeight = button.classList.contains('active') ? '600' : '500';
        button.style.cursor = 'pointer';
        button.style.transition = 'all 0.2s ease';
        button.style.borderRadius = '6px';
        button.style.textAlign = 'center';
        
        // Add click handler to ensure styling updates on click
        button.addEventListener('click', function() {
          // Update styles for all buttons
          choiceButtons.forEach(btn => {
            btn.style.background = 'transparent';
            btn.style.fontWeight = '500';
          });
          
          // Update styles for active button
          this.style.background = '#fac637';
          this.style.fontWeight = '600';
        });
        
        button.setAttribute('data-styled', 'true');
      }
    });
  }

  // Function to enhance the filter toggle button
  function enhanceFilterToggle() {
    const filterToggle = document.querySelector('.filters-toggle');
    
    if (filterToggle && !filterToggle.hasAttribute('data-enhanced')) {
      console.log('Enhancing filter toggle button');
      
      // Add an SVG icon if it doesn't already have one
      if (!filterToggle.querySelector('svg')) {
        const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        iconSvg.setAttribute('width', '18');
        iconSvg.setAttribute('height', '18');
        iconSvg.setAttribute('viewBox', '0 0 24 24');
        iconSvg.setAttribute('fill', 'none');
        iconSvg.setAttribute('stroke', 'currentColor');
        iconSvg.setAttribute('stroke-width', '2');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z');
        iconSvg.appendChild(path);
        
        // Insert SVG icon at the beginning of the button
        if (filterToggle.firstChild) {
          filterToggle.insertBefore(iconSvg, filterToggle.firstChild);
        } else {
          filterToggle.appendChild(iconSvg);
        }
      }
      
      // Add interactive behavior for the filter toggle
      filterToggle.addEventListener('click', function() {
        this.classList.toggle('active');
        const filtersContent = document.querySelector('.search-filters-content');
        
        if (filtersContent) {
          const isVisible = filtersContent.style.display !== 'none';
          filtersContent.style.display = isVisible ? 'none' : 'block';
          filtersContent.classList.toggle('visible', !isVisible);
          
          // Update button text based on state
          const buttonText = this.textContent.trim();
          if (buttonText.includes('Show')) {
            this.textContent = buttonText.replace('Show', 'Hide');
          } else if (buttonText.includes('Hide')) {
            this.textContent = buttonText.replace('Hide', 'Show');
          }
          
          // Make sure the SVG stays at the beginning
          if (this.querySelector('svg')) {
            const svg = this.querySelector('svg');
            this.removeChild(svg);
            this.insertBefore(svg, this.firstChild);
          }
        }
      });
      
      // Mark as enhanced to avoid duplicate enhancements
      filterToggle.setAttribute('data-enhanced', 'true');
    }
  }

  // Function to remove navigation elements
  function removeNavigationElements() {
    const navigationElements = document.querySelectorAll([
      'div[class*="navigation"]',
      'button[aria-label*="previous"]',
      'button[aria-label*="next"]',
      '.slick-prev',
      '.slick-next',
      '.slick-dots',
      'div[role="navigation"]'
    ].join(', '));
    
    navigationElements.forEach(el => {
      el.style.display = 'none';
      el.style.visibility = 'hidden';
    });
  }

  // Function to apply styles to carousel elements
  function applyCarouselStyles() {
    const containers = document.querySelectorAll('[class*="carousel"], [class*="slider"], .posts-grid');
    
    containers.forEach(container => {
      if (container.hasAttribute('data-carousel-processed')) return;
      
      if (container.children.length > 1 && Array.from(container.children).some(child => 
          child.classList.contains('post-card') || 
          child.tagName === 'DIV' && child.querySelector('img'))) {
        
        container.classList.add('carousel-container');
        
        const possibleTracks = container.children;
        if (possibleTracks.length === 1 && possibleTracks[0].children.length > 1) {
          possibleTracks[0].classList.add('carousel-track');
          
          Array.from(possibleTracks[0].children).forEach(item => {
            item.classList.add('carousel-item');
          });
        } else {
          container.classList.add('carousel-track');
          
          Array.from(container.children).forEach(item => {
            item.classList.add('carousel-item');
          });
        }
        
        container.setAttribute('data-carousel-processed', 'true');
      }
    });
  }
});