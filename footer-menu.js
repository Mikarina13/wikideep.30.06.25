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
    
    // Toggle footer when hamburger is clicked
    hamburger.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Footer hamburger clicked');
      footer.classList.toggle('open');
    });
    
    // Add click handlers to each line in the hamburger icon
    hamburgerIcon.querySelectorAll('.footer-line').forEach(line => {
      line.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Footer line clicked');
        footer.classList.toggle('open');
      });
    });
    
    // Close footer when clicking outside
    document.addEventListener('click', function(e) {
      if (!footer.contains(e.target) && !hamburger.contains(e.target) && footer.classList.contains('open')) {
        footer.classList.remove('open');
      }
    });
  }
});