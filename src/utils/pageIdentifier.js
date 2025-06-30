/**
 * Add data-page attribute to body element based on the current page
 */
document.addEventListener('DOMContentLoaded', function() {
  // Identify current page
  const pathname = window.location.pathname;
  
  if (pathname === '/' || pathname.includes('/index.html') || pathname.includes('/browse-archive.html')) {
    document.body.setAttribute('data-page', 'archive');
  } else if (pathname.includes('/collab.html') || pathname.includes('/browse-collab.html')) {
    document.body.setAttribute('data-page', 'collab');
  }
});