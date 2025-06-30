// This script removes the carousel navigation arrows from the main page
// It uses a MutationObserver to detect when the arrows are added to the DOM

(function() {
  console.log('Remove carousel navigation script initialized');
  
  // Function to find and remove navigation elements
  function removeNavigationElements() {
    // Look for navigation arrows container
    const arrowContainers = document.querySelectorAll([
      'div[class*="navigation"]', 
      'div[class*="carousel-arrow"]',
      'div[class*="slick-arrow"]',
      'div[class*="carousel-control"]',
      'div[role="navigation"]',
      '.slick-dots',
      'ul[role="tablist"]',
      '.carousel-navigation-container'
    ].join(', '));
    
    arrowContainers.forEach(container => {
      // Check if this element appears to be navigation arrows
      const rect = container.getBoundingClientRect();
      // Only remove if it's a navigation element
      if (container.querySelector('svg') || 
          container.textContent.includes('<') || 
          container.textContent.includes('>') ||
          container.className.includes('navigation') ||
          container.className.includes('dots') ||
          container.className.includes('indicator')) {
        
        console.log('Found carousel navigation element:', container);
        container.style.display = 'none';
      }
    });
    
    // Also look for individual buttons that might be navigation arrows
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      const ariaLabel = button.getAttribute('aria-label') || '';
      if (ariaLabel.includes('previous') || 
          ariaLabel.includes('next') || 
          ariaLabel.includes('slide')) {
        console.log('Found carousel button:', button);
        button.style.display = 'none';
      }
    });
  }

  // Create a mutation observer to watch for DOM changes
  const observer = new MutationObserver(function(mutations) {
    // Look for navigation elements when DOM changes
    removeNavigationElements();
  });

  // Start observing the entire document with specific config
  document.addEventListener('DOMContentLoaded', function() {
    // Run once on load
    removeNavigationElements();
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    
    // Run again after a delay to catch late-rendering elements
    setTimeout(removeNavigationElements, 500);
    setTimeout(removeNavigationElements, 1500);
  });
  
  // Also run when the page is fully loaded
  window.addEventListener('load', function() {
    removeNavigationElements();
    setTimeout(removeNavigationElements, 1000);
  });
})();