// Footer hamburger menu functionality
document.addEventListener('DOMContentLoaded', function() {
  console.log('Footer menu script initialized');
  
  // Find or create the footer element
  let footer = document.querySelector('.footer');
  if (!footer) {
    console.log('Footer not found, creating it');
    footer = document.createElement('div');
    footer.className = 'footer';
    document.body.appendChild(footer);
  }

  // Ensure the footer has the footer-links container
  let footerLinks = footer.querySelector('.footer-links');
  if (!footerLinks) {
    console.log('Footer links not found, creating them');
    footerLinks = document.createElement('div');
    footerLinks.className = 'footer-links';
    
    // Add the standard footer links
    const links = [
      { href: '/forum.html', text: 'Forum' },
      { href: '/info-hub.html', text: 'Contributor Guidelines' },
      { href: '/info-hub.html#terms', text: 'Terms' },
      { href: '/info-hub.html#privacy-policy', text: 'Privacy Policy' },
      { href: '/info-hub.html#copyright-notice', text: 'Copyright Notice' },
      { href: '/contact.html', text: 'Contact Us' },
      { href: '/support.html', text: 'Support WikiDeep.io' },
      { href: '/our-vision.html', text: 'Our Vision' },
      { href: 'https://www.youtube.com/watch?v=ZBG0qnbsdrI', text: 'Intro Video' }
    ];
    
    links.forEach(link => {
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.text;
      // If it's the YouTube link, open in a new tab
      if (link.href.includes('youtube.com')) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      footerLinks.appendChild(a);
    });
    
    footer.appendChild(footerLinks);
  } else {
    // Check if the YouTube link already exists
    const youtubeLink = footerLinks.querySelector('a[href*="youtube.com"]');
    if (!youtubeLink) {
      // Find the Our Vision link to position the YouTube link after it
      const links = Array.from(footerLinks.querySelectorAll('a'));
      const visionLinkIndex = links.findIndex(link => link.href.includes('/our-vision.html'));
      
      // Create the YouTube link
      const youtubeLink = document.createElement('a');
      youtubeLink.href = 'https://www.youtube.com/watch?v=ZBG0qnbsdrI';
      youtubeLink.textContent = 'Intro Video';
      youtubeLink.target = '_blank';
      youtubeLink.rel = 'noopener noreferrer';
      
      // Insert after vision link or at the end if not found
      if (visionLinkIndex !== -1 && visionLinkIndex < links.length - 1) {
        footerLinks.insertBefore(youtubeLink, links[visionLinkIndex + 1]);
      } else {
        footerLinks.appendChild(youtubeLink);
      }
    }
  }

  // Create the hamburger menu if it doesn't exist
  if (!document.querySelector('.footer-hamburger')) {
    console.log('Creating footer hamburger');
    const hamburger = document.createElement('div');
    hamburger.className = 'footer-hamburger';
    hamburger.setAttribute('role', 'button');
    hamburger.setAttribute('tabindex', '0');
    hamburger.setAttribute('aria-label', 'Toggle footer menu');
    
    const hamburgerIcon = document.createElement('div');
    hamburgerIcon.className = 'footer-hamburger-icon';
    
    // Add three lines to create the hamburger icon
    for (let i = 0; i < 3; i++) {
      const line = document.createElement('span');
      line.className = 'footer-line';
      hamburgerIcon.appendChild(line);
    }
    
    hamburger.appendChild(hamburgerIcon);
    document.body.appendChild(hamburger);
    
    // Toggle footer when hamburger is clicked - improved event handling
    const toggleFooter = function(e) {
      if (e && e.preventDefault) {
        e.preventDefault();
      }
      if (e && e.stopPropagation) {
        e.stopPropagation();
      }
      console.log('Footer hamburger clicked');
      footer.classList.toggle('open');
    };
    
    // Add click event with various methods for maximum compatibility
    hamburger.addEventListener('click', toggleFooter);
    hamburger.addEventListener('touchstart', toggleFooter, {passive: false});
    
    // Also make the icon clickable separately
    hamburgerIcon.addEventListener('click', toggleFooter);
    hamburgerIcon.addEventListener('touchstart', toggleFooter, {passive: false});
    
    // Add click handlers to each line in the hamburger icon
    hamburgerIcon.querySelectorAll('.footer-line').forEach(line => {
      line.addEventListener('click', toggleFooter);
      line.addEventListener('touchstart', toggleFooter, {passive: false});
    });
    
    // Close footer when clicking outside
    document.addEventListener('click', function(e) {
      if (!footer.contains(e.target) && !hamburger.contains(e.target) && footer.classList.contains('open')) {
        footer.classList.remove('open');
      }
    });
    
    // Add keyboard accessibility
    hamburger.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        footer.classList.toggle('open');
      }
    });
  }

  // Add CSS to make footer hamburger visible and fully functional
  if (!document.getElementById('footer-hamburger-styles')) {
    const styles = document.createElement('style');
    styles.id = 'footer-hamburger-styles';
    styles.textContent = `
      .footer-hamburger {
        position: fixed;
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 1001;
        background-color: rgba(255, 255, 255, 0.9);
        border-radius: 20px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        padding: 5px;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }

      .footer-hamburger:hover {
        background-color: white;
        box-shadow: 0 4px 15px rgba(6, 114, 115, 0.3);
      }
      
      .footer-hamburger-icon {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }
      
      .footer-line {
        display: block;
        width: 24px;
        height: 2px;
        margin: 3px 0;
        background-color: #067273;
        transition: all 0.3s ease;
        opacity: 1 !important;
        visibility: visible !important;
      }

      .footer {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        z-index: 1000;
        background: transparent;
        transition: all 0.3s ease;
        display: block !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }

      .footer-links {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 15px;
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.5s ease, padding 0.3s ease;
        background-color: rgba(255, 255, 255, 0.95);
        border-top-left-radius: 12px;
        border-top-right-radius: 12px;
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
        padding: 0 15px;
      }
      
      .footer.open .footer-links {
        max-height: 200px;
        padding: 15px;
        padding-bottom: 60px;
      }

      .footer.open .footer-hamburger {
        background-color: #067273;
      }

      .footer.open .footer-line {
        background-color: white;
      }

      .footer.open .footer-line:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
      }

      .footer.open .footer-line:nth-child(2) {
        opacity: 0;
      }

      .footer.open .footer-line:nth-child(3) {
        transform: rotate(-45deg) translate(5px, -5px);
      }
      
      /* Make sure the footer is visible and not hidden by any other styles */
      .footer.visible {
        display: block !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }

      .footer-links a {
        color: #067273;
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
        transition: color 0.2s ease;
        padding: 8px 12px;
        border-radius: 6px;
        white-space: nowrap;
        opacity: 1 !important;
        visibility: visible !important;
      }

      .footer-links a:hover {
        color: #fac637;
        background-color: rgba(6, 114, 115, 0.05);
      }
    `;
    document.head.appendChild(styles);
  }

  // Add some CSS to ensure footer is visible if it's meant to be
  const visibleFooter = document.querySelector('.footer.visible');
  if (visibleFooter) {
    // Ensure the footer has at least some height to be clickable
    visibleFooter.style.minHeight = '5px';
    visibleFooter.style.display = 'block';
    visibleFooter.style.opacity = '1';
    visibleFooter.style.visibility = 'visible';
    visibleFooter.style.pointerEvents = 'auto';
  }
});