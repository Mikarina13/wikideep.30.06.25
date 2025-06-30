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