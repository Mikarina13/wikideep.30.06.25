// This script uses a MutationObserver to apply carousel styles after React renders the content
// and enhances filter toggle buttons to ensure consistent styling

document.addEventListener('DOMContentLoaded', function() {
  console.log('Observer script initialized');
  
  // Set up the MutationObserver to watch for changes in the DOM
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        // Check if our carousel has been rendered
        const carouselElements = document.querySelectorAll('.posts-grid');
        if (carouselElements.length > 0) {
          applyCarouselStyles();
        }
        
        // Check if filter toggle button has been rendered
        const filterToggleButtons = document.querySelectorAll('.filters-toggle');
        if (filterToggleButtons.length > 0) {
          enhanceFilterToggleButtons();
        }
        
        // Also check for navigation elements to remove
        const navigationElements = document.querySelectorAll([
          'div[class*="navigation"]',
          'button[aria-label*="previous"]',
          'button[aria-label*="next"]',
          '.slick-prev',
          '.slick-next',
          '.slick-dots',
          'div[role="navigation"]'
        ].join(', '));
        
        if (navigationElements.length > 0) {
          navigationElements.forEach(el => {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
          });
        }
      }
    });
  });

  // Start observing the target node for configured mutations
  observer.observe(document.body, { 
    childList: true,
    subtree: true 
  });

  // Function to find and enhance filter toggle buttons
  function enhanceFilterToggleButtons() {
    const filterToggleButtons = document.querySelectorAll('.filters-toggle');
    
    filterToggleButtons.forEach(button => {
      if (!button.hasAttribute('data-enhanced')) {
        console.log('Enhancing filter toggle button');
        
        // Ensure the button has the filter icon SVG
        if (!button.querySelector('svg')) {
          const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svgIcon.setAttribute('width', '18');
          svgIcon.setAttribute('height', '18');
          svgIcon.setAttribute('viewBox', '0 0 24 24');
          svgIcon.setAttribute('fill', 'none');
          svgIcon.setAttribute('stroke', 'currentColor');
          svgIcon.setAttribute('stroke-width', '2');
          
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z');
          svgIcon.appendChild(path);
          
          // Insert SVG at the beginning of the button
          button.insertBefore(svgIcon, button.firstChild);
        }
        
        // Add enhanced click functionality
        button.addEventListener('click', function() {
          const isActive = button.classList.contains('active');
          
          // Toggle active class
          button.classList.toggle('active');
          
          // Find the filter content section
          const filterSection = button.nextElementSibling;
          if (filterSection && filterSection.classList.contains('search-filters-content')) {
            if (isActive) {
              filterSection.style.display = 'none';
              // Update button text
              button.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
                </svg>
                Show Filters
              `;
            } else {
              filterSection.style.display = 'block';
              // Update button text
              button.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
                </svg>
                Hide Filters
              `;
            }
          }
        });
        
        // Mark as enhanced
        button.setAttribute('data-enhanced', 'true');
      }
    });
  }

  // Function to apply styles to carousel elements
  function applyCarouselStyles() {
    // Find all elements that might contain carousels
    const containers = document.querySelectorAll('[class*="carousel"], [class*="slider"], .posts-grid');
    
    containers.forEach(container => {
      // Check if this is a carousel container
      if (container.children.length > 1 && Array.from(container.children).some(child => 
          child.classList.contains('post-card') || 
          child.tagName === 'DIV' && child.querySelector('img'))) {
        
        // This is likely a carousel container
        container.classList.add('carousel-container');
        
        // Look for direct child that might be the actual track
        const possibleTracks = container.children;
        if (possibleTracks.length === 1 && possibleTracks[0].children.length > 1) {
          possibleTracks[0].classList.add('carousel-track');
          
          // Add the carousel-item class to each item in the track
          Array.from(possibleTracks[0].children).forEach(item => {
            item.classList.add('carousel-item');
          });
        } else {
          // If no obvious track, the container itself might be the track
          container.classList.add('carousel-track');
          
          // Add carousel-item class to direct children
          Array.from(container.children).forEach(item => {
            item.classList.add('carousel-item');
          });
        }
        
        // Mark the container as processed so we don't process it again
        container.setAttribute('data-carousel-processed', 'true');
        
        console.log('Carousel styles applied to', container);
      }
      
      // Look one level deeper for potential carousel tracks
      Array.from(container.children).forEach(child => {
        if (child.children.length > 1 && !child.getAttribute('data-carousel-processed')) {
          // Check if child's children are potential carousel items
          const potentialItems = Array.from(child.children);
          if (potentialItems.some(item => 
              item.classList.contains('post-card') || 
              item.tagName === 'DIV' && item.querySelector('img'))) {
            
            // This child element is likely a carousel track
            child.classList.add('carousel-track');
            container.classList.add('carousel-container');
            
            // Add carousel-item class to all direct children that appear to be slides
            potentialItems.forEach(item => {
              if (item.classList.contains('post-card') || item.querySelector('img')) {
                item.classList.add('carousel-item');
              }
            });
            
            // Mark as processed
            child.setAttribute('data-carousel-processed', 'true');
            container.setAttribute('data-carousel-processed', 'true');
            
            console.log('Carousel track styles applied to', child);
          }
        }
      });
    });
  }

  // Call these functions immediately after DOM content loaded
  enhanceFilterToggleButtons();
});