import { initMenu } from './src/utils/menu';
import { recordPageVisit, getPageTitle, getPageTypeFromUrl } from './src/utils/activityTracker.js';
import supabase from './src/utils/supabaseClient.js';

document.querySelector('#app').innerHTML = `
  <div>
    <img 
      src="https://i.imgur.com/byFu3LE_d.png?maxwidth=520&shape=thumb&fidelity=high" 
      alt="Left Sliding Image" 
      class="sliding-image-left"
    >
    <img 
      src="https://i.imgur.com/zcLQ3gB.png" 
      alt="Middle Image" 
      class="middle-image"
    >
    <img 
      src="https://i.imgur.com/aMKDuRs.png" 
      alt="Right Sliding Image" 
      class="sliding-image-right"
    >
    <div class="menu-header">
      <img src="https://i.imgur.com/zcLQ3gB.png" alt="Menu Logo" class="menu-logo">
      <div class="nav-links">
        <div class="nav-container">
          <a href="/publish.html" class="nav-item publish-nav">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14"/>
              <path d="M5 12h14"/>
            </svg>
            Publish
          </a>
          <a href="/collab.html" class="nav-item collab-nav">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            COLLAB
          </a>
          <a href="/index.html" class="nav-item archives-nav">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4v16a2 2 0 002 2h12a2 2 0 002-2V8.342a2 2 0 00-.602-1.43l-4.44-4.342A2 2 0 0013.56 2H6a2 2 0 00-2 2z"/>
              <path d="M14 2v4a2 2 0 002 2h4"/>
            </svg>
            ARCHIVES
          </a>
        </div>
        <a href="/forum.html" class="nav-item forum-nav">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Forum
        </a>
      </div>
    </div>
    <div class="menu-overlay"></div>
    <div class="menu-options">
      <div class="menu-top">
      </div>
      <div class="auth-section">
        <a href="/login.html" class="sign-in">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          Sign in
        </a>
        <a href="/login.html?tab=signup" class="sign-up">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/>
            <line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
          Sign up
        </a>
        <a href="#" class="logout" style="display: none;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </a>
      </div>
      <div class="recent-searches">
        <h3>Recent Searches</h3>
        <div class="empty-state">Empty</div>
        <button class="show-more">
          Show more
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
      </div>
      <div class="menu-footer">
        <a href="/profile.html" class="menu-footer-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="10" r="3"/>
            <path d="M12 13c-2.761 0-5 1.79-5 4v1h10v-1c0-2.21-2.239-4-5-4z"/>
          </svg>
          My Profile
        </a>
        <a href="/favorites.html" class="menu-footer-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          Favorites
        </a>
        <a href="/activity.html" class="menu-footer-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Activity
        </a>
        <a href="/settings.html" class="menu-footer-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
          </svg>
          Settings
        </a>
        <a href="/help.html" class="menu-footer-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          Help
        </a>
        <a href="/forum.html" class="nav-item forum-nav">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Forum
        </a>
        <a href="/our-vision.html" class="nav-item vision-nav">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Our Vision
        </a>
      </div>
    </div>
    <img 
      src="https://i.imgur.com/sMqKf3K.png" 
      alt="Top Center Image" 
      class="top-center-image"
    >
    <div class="search-container">
      <div class="search-bar">
        <input type="text" placeholder="Search WikiDeep.io Open AI Archives" id="search-input">
        <img src="https://raw.githubusercontent.com/primer/octicons/main/icons/search-16.svg" alt="Search" class="search-icon">
      </div>
      <div class="search-buttons">
        <button class="search-button" id="search-archive-btn">Search</button>
        <button class="search-button" id="browse-button">Browse</button>
      </div>
    </div>

    <!-- Knowledge Spectrum Preview Carousel -->
    <div class="knowledge-carousel-container">
      <div class="carousel-header">
        <h2 id="carousel-title">Knowledge Spotlights</h2>
        <p id="carousel-subtitle" class="carousel-subtitle">Discover Popular Topics</p>
      </div>
      <div class="knowledge-carousel">
        <div class="carousel-track" id="carousel-track">
          <!-- Real posts will be loaded here dynamically -->
        </div>
      </div>
    </div>

    <!-- Carousel Navigation - Moved above footer and centered -->
    <div class="carousel-navigation-container">
      <div class="carousel-navigation">
        <button class="carousel-nav-btn" id="prev-btn">‹</button>
        <button class="carousel-nav-btn" id="next-btn">›</button>
      </div>
    </div>
    
    <!-- Archive Search Results Container with Visible Filters -->
    <div id="archive-results-container" class="archive-results-container">
      <div class="search-results-header">
        <h2>Search Results</h2>
        <button id="close-search" class="close-search-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <!-- FILTERS SECTION - HIGHLY VISIBLE -->
      <div class="search-filters-section">
        <div class="filters-toggle">
          <button class="toggle-filters-btn" id="toggle-filters">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            <span id="filters-toggle-text">Show Filters</span>
          </button>
        </div>
        
        <div class="search-filters collapsed" id="search-filters">
          <div class="filters-grid">
            <!-- AI Model Filter -->
            <div class="filter-group">
              <h4>🤖 AI Model</h4>
              <div class="filter-options">
                <label>
                  <input type="checkbox" name="ai-model" value="gpt-4">
                  GPT-4 & Variants
                </label>
                <label>
                  <input type="checkbox" name="ai-model" value="claude">
                  Claude Models
                </label>
                <label>
                  <input type="checkbox" name="ai-model" value="gemini">
                  Gemini/Bard
                </label>
                <label>
                  <input type="checkbox" name="ai-model" value="other">
                  Other Models
                </label>
              </div>
            </div>
            
            <!-- Content Type Filter -->
            <div class="filter-group">
              <h4>📄 Content Type</h4>
              <div class="filter-options">
                <label>
                  <input type="radio" name="content-type" value="all" checked>
                  All Content
                </label>
                <label>
                  <input type="radio" name="content-type" value="text">
                  Text Only
                </label>
                <label>
                  <input type="radio" name="content-type" value="embedded">
                  Embedded Links
                </label>
              </div>
            </div>
            
            <!-- Date Range Filter -->
            <div class="filter-group">
              <h4>📅 Date Range</h4>
              <div class="date-inputs">
                <input type="date" name="date-from" placeholder="From">
                <input type="date" name="date-to" placeholder="To">
              </div>
            </div>
            
            <!-- View Count Filter -->
            <div class="filter-group">
              <h4>👁️ View Count</h4>
              <div class="filter-range">
                <input type="number" name="views-min" placeholder="Min" min="0">
                <span>to</span>
                <input type="number" name="views-max" placeholder="Max" min="0">
              </div>
            </div>
          </div>
          
          <div class="filter-actions">
            <button class="clear-filters-btn" id="clear-search-filters">Clear Filters</button>
            <button class="apply-filters-btn" id="apply-search-filters">Apply Filters</button>
          </div>
        </div>
      </div>
      
      <div id="search-results" class="search-results">
        <p class="empty-state">Enter a search term to find posts</p>
      </div>
      <div id="search-loading" class="search-loading" style="display: none;">
        <p>Searching...</p>
      </div>
    </div>
    <div class="footer">
      <div class="footer-links">
        <a href="/forum.html">Forum</a>
        <a href="/info-hub.html">Contributor Guidelines</a>
        <a href="/info-hub.html#terms">Terms</a>
        <a href="/info-hub.html#privacy-policy">Privacy Policy</a>
        <a href="/info-hub.html#copyright-notice">Copyright Notice</a>
        <a href="/contact.html">Contact Us</a>
        <a href="/support.html">Support WikiDeep.io</a>
        <a href="/our-vision.html">Our Vision</a>
      </div>
    </div>
  </div>
`;

// Initialize all the interactive elements
const middleImage = document.querySelector('.middle-image');
const menuHeader = document.querySelector('.menu-header');
const topCenterImage = document.querySelector('.top-center-image');
const searchContainer = document.querySelector('.search-container');
const knowledgeCarousel = document.querySelector('.knowledge-carousel-container');
const carouselNavigationContainer = document.querySelector('.carousel-navigation-container');
const footer = document.querySelector('.footer');

// Search elements
const searchInput = document.querySelector('#search-input');
const searchButton = document.querySelector('#search-archive-btn');
const browseButton = document.querySelector('#browse-button');
const archiveResultsContainer = document.querySelector('#archive-results-container');
const searchResults = document.querySelector('#search-results');
const searchLoading = document.querySelector('#search-loading');
const closeSearchBtn = document.querySelector('#close-search');

// Filter elements
const toggleFiltersBtn = document.querySelector('#toggle-filters');
const searchFilters = document.querySelector('#search-filters');
const filtersToggleText = document.querySelector('#filters-toggle-text');
const clearFiltersBtn = document.querySelector('#clear-search-filters');
const applyFiltersBtn = document.querySelector('#apply-search-filters');

// Global filter state
let currentFilters = {
  aiModel: [],
  contentType: 'all',
  dateFrom: '',
  dateTo: '',
  viewsMin: '',
  viewsMax: ''
};

// Carousel elements
const carouselTrack = document.querySelector('#carousel-track');
const carouselTitle = document.querySelector('#carousel-title');
const carouselSubtitle = document.querySelector('#carousel-subtitle');
const prevBtn = document.querySelector('#prev-btn');
const nextBtn = document.querySelector('#next-btn');

// Use the central menu initialization function
initMenu();

// Record page visit
recordPageVisit({
  type: getPageTypeFromUrl(window.location.href),
  title: getPageTitle(),
  url: window.location.href
});

// Update the footer links
const footerLinks = document.querySelector('.footer-links');
if (footerLinks) {
  footerLinks.innerHTML = `
    <a href="/forum.html">Forum</a>
    <a href="/info-hub.html">Contributor Guidelines</a>
    <a href="/info-hub.html#terms">Terms</a>
    <a href="/info-hub.html#privacy-policy">Privacy Policy</a>
    <a href="/info-hub.html#copyright-notice">Copyright Notice</a>
    <a href="/contact.html">Contact Us</a>
    <a href="/support.html">Support WikiDeep.io</a>
    <a href="/our-vision.html">Our Vision</a>
  `;
}

// Add Bolt badge only on archive or collab pages - initially hidden
const pathname = window.location.pathname;
const isArchivePage = pathname === '/' || pathname === '/index.html';
const isCollabPage = pathname === '/collab.html';

let boltBadge = null;
if ((isArchivePage || isCollabPage) && !document.querySelector('.bolt-badge-fixed')) {
  boltBadge = document.createElement('a');
  boltBadge.href = 'https://bolt.new';
  boltBadge.className = 'bolt-badge-fixed';
  boltBadge.target = '_blank';
  boltBadge.rel = 'noopener noreferrer';
  boltBadge.innerHTML = '<img src="https://i.imgur.com/T1yHmKN.png" alt="Built with Bolt" />';
  boltBadge.style.opacity = '0'; // Initially hidden
  document.body.appendChild(boltBadge);
}

const navItems = document.querySelectorAll('.nav-item');

// Carousel State Management
let currentCarouselType = 'archive'; // 'archive' or 'collab'
let currentSlide = 2; // Start with the middle card (index 2) as active
let archivePosts = [];
let collabPosts = [];

// Filter Toggle Functionality
toggleFiltersBtn.addEventListener('click', () => {
  const isCollapsed = searchFilters.classList.contains('collapsed');
  
  if (isCollapsed) {
    searchFilters.classList.remove('collapsed');
    filtersToggleText.textContent = 'Hide Filters';
  } else {
    searchFilters.classList.add('collapsed');
    filtersToggleText.textContent = 'Show Filters';
  }
});

// Clear Filters
clearFiltersBtn.addEventListener('click', () => {
  // Reset all filter inputs
  document.querySelectorAll('input[name="ai-model"]').forEach(cb => cb.checked = false);
  document.querySelector('input[name="content-type"][value="all"]').checked = true;
  document.querySelector('input[name="date-from"]').value = '';
  document.querySelector('input[name="date-to"]').value = '';
  document.querySelector('input[name="views-min"]').value = '';
  document.querySelector('input[name="views-max"]').value = '';
  
  // Reset global filter state
  currentFilters = {
    aiModel: [],
    contentType: 'all',
    dateFrom: '',
    dateTo: '',
    viewsMin: '',
    viewsMax: ''
  };
  
  // Re-run search with cleared filters
  if (searchInput.value.trim()) {
    performSearch();
  }
});

// Apply Filters
applyFiltersBtn.addEventListener('click', () => {
  updateCurrentFilters();
  if (searchInput.value.trim()) {
    performSearch();
  }
});

// Update current filters from form inputs
function updateCurrentFilters() {
  // AI Model filters
  const aiModelCheckboxes = document.querySelectorAll('input[name="ai-model"]:checked');
  currentFilters.aiModel = Array.from(aiModelCheckboxes).map(cb => cb.value);
  
  // Content type
  const contentTypeRadio = document.querySelector('input[name="content-type"]:checked');
  currentFilters.contentType = contentTypeRadio ? contentTypeRadio.value : 'all';
  
  // Date range
  currentFilters.dateFrom = document.querySelector('input[name="date-from"]').value;
  currentFilters.dateTo = document.querySelector('input[name="date-to"]').value;
  
  // View count
  currentFilters.viewsMin = document.querySelector('input[name="views-min"]').value;
  currentFilters.viewsMax = document.querySelector('input[name="views-max"]').value;
}

// Function to show a notification message to the user
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#067273'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-width: 400px;
    font-size: 14px;
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);

  // Remove notification
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Load real posts from database - Enhanced error handling
async function loadCarouselData() {
  try {
    console.log('Loading carousel data...');
    
    // Load archive posts with simplified queries to avoid RLS issues
    let archiveData = [];
    let collabData = [];
    
    try {
      const { data: archiveResponse, error: archiveError } = await supabase
        .from('archive_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (archiveError) {
        console.warn('Archive posts error:', archiveError);
      } else {
        archiveData = archiveResponse || [];
        console.log(`Loaded ${archiveData.length} archive posts`);
      }
    } catch (archiveErr) {
      console.warn('Failed to load archive posts:', archiveErr);
      
      // Show user-friendly error message if it's a network error
      if (archiveErr instanceof TypeError && archiveErr.message.includes('Failed to fetch')) {
        showNotification('Network issue: Could not connect to the database. Please check your internet connection.', 'error');
      }
    }

    try {
      const { data: collabResponse, error: collabError } = await supabase
        .from('collab_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (collabError) {
        console.warn('Collab posts error:', collabError);
      } else {
        collabData = collabResponse || [];
        console.log(`Loaded ${collabData.length} collab posts`);
      }
    } catch (collabErr) {
      console.warn('Failed to load collab posts:', collabErr);
      
      // Show user-friendly error if not already shown
      if (collabErr instanceof TypeError && collabErr.message.includes('Failed to fetch') && archiveData.length === 0) {
        showNotification('Network issue: Could not connect to the database. Please check your internet connection.', 'error');
      }
    }

    // Load user data separately and safely
    for (let post of archiveData) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('email, raw_user_meta_data')
          .eq('id', post.user_id)
          .single();
        post.users = userData;
      } catch (userErr) {
        console.warn('Could not load user data for archive post:', post.id);
        post.users = null;
      }
    }

    for (let post of collabData) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('email, raw_user_meta_data')
          .eq('id', post.user_id)
          .single();
        post.users = userData;
      } catch (userErr) {
        console.warn('Could not load user data for collab post:', post.id);
        post.users = null;
      }
    }

    archivePosts = archiveData;
    collabPosts = collabData;

    console.log('Carousel data loaded successfully');
    
    // Initialize carousel with real data
    updateCarouselContent();
  } catch (error) {
    console.error('Error loading carousel data:', error);
    
    // Show appropriate error notification
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      showNotification('Network connection issue: Unable to reach the database server. Please check your internet connection or try again later.', 'error');
    } else {
      showNotification('Could not load content. Please refresh the page or try again later.', 'error');
    }
    
    // Fallback to empty arrays and show helpful message
    archivePosts = [];
    collabPosts = [];
    updateCarouselContent();
  }
}

// Initialize carousel based on current page
function initializeCarousel() {
  const isCollab = document.querySelector('.collab-nav').classList.contains('active');
  currentCarouselType = isCollab ? 'collab' : 'archive';
  loadCarouselData();
}

// Update carousel content based on type
function updateCarouselContent() {
  const carouselTrack = document.querySelector('#carousel-track');
  
  if (currentCarouselType === 'archive') {
    carouselTitle.textContent = 'Knowledge Spotlights';
    carouselSubtitle.textContent = 'Discover Popular Topics';
    renderArchiveCards();
  } else {
    carouselTitle.textContent = 'Vibe Task Feed';
    carouselSubtitle.textContent = 'Discover latest Collab shared';
    renderCollabCards();
  }

  currentSlide = Math.min(2, getVisibleCards().length - 1); // Reset to middle card or last if fewer cards
  updateCarouselPosition();
}

// Function to get author name from user data
function getAuthorName(post) {
  if (!post.users) return 'Community Member';
  
  const userData = post.users;
  const metaData = userData.raw_user_meta_data || {};
  
  // Try display_name first (from OAuth or user settings)
  if (metaData.display_name) {
    return metaData.display_name;
  }
  
  // Try full_name second
  if (metaData.full_name) {
    return metaData.full_name;
  }
  
  // Use email username as fallback
  if (userData.email) {
    return userData.email.split('@')[0];
  }
  
  return 'Community Member';
}

// Render archive cards with real data - Updated to not depend on user data
function renderArchiveCards() {
  const carouselTrack = document.querySelector('#carousel-track');
  
  if (archivePosts.length === 0) {
    carouselTrack.innerHTML = `
      <div class="knowledge-card archive-card" data-type="archive">
        <div class="card-header">
          <div class="card-author">
            <span class="author-name">DeepWiki Team</span>
          </div>
          <div class="card-metrics">
            <span class="view-count">0 views</span>
            <span class="favorite-count">❤️ 0</span>
          </div>
        </div>
        <div class="card-prompt">
          <strong>Prompt:</strong> Get started with DeepWiki.io
        </div>
        <h3>No Archive Posts Yet</h3>
        <div class="card-content-preview">
          Be the first to share your AI insights! Click "Publish" to add your content to the archive and help build our community knowledge base.
        </div>
        <div class="card-footer">
          <div class="card-tags">
            <span class="tag">getting started</span>
          </div>
          <div class="card-meta">
            <span class="post-date">📅 Today</span>
            <span class="ai-model">🤖 Community</span>
          </div>
        </div>
      </div>
    `;
    return;
  }

  carouselTrack.innerHTML = archivePosts.map(post => {
    // Format dates
    const postDate = new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const genDate = post.generation_date ? 
      new Date(post.generation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 
      postDate;
    
    // Use anonymous author since we can't safely access user data
    const authorName = getAuthorName(post);
    
    // Truncate content for preview (doubled size as requested)
    const contentPreview = post.content ? 
      (post.content.length > 300 ? post.content.substring(0, 300) + '...' : post.content) :
      'Content available via embedded link';

    // Truncate prompt for display
    const promptPreview = (post.prompt_is_public !== false && post.prompt) ? 
      (post.prompt.length > 100 ? post.prompt.substring(0, 100) + '...' : post.prompt) :
      null;

    return `
      <div class="knowledge-card archive-card" data-type="archive" data-post-id="${post.id}">
        <div class="card-header">
          <div class="card-author">
            <span class="author-name">👤 ${authorName}</span>
          </div>
          <div class="card-metrics">
            <span class="view-count">${post.views || 0} views</span>
            <span class="favorite-count">❤️ ${post.favorites_count || 0}</span>
          </div>
        </div>
        ${promptPreview ? `
          <div class="card-prompt">
            <strong>Prompt:</strong> ${promptPreview}
          </div>
        ` : ''}
        <h3>${post.title}</h3>
        <div class="card-content-preview">
          ${contentPreview}
        </div>
        <div class="card-footer">
          <div class="card-tags">
            ${post.tags.slice(0, 2).map(tag => `<span class="tag">${tag}</span>`).join('')}
            ${post.tags.length > 2 ? `<span class="tag">+${post.tags.length - 2}</span>` : ''}
          </div>
          <div class="card-meta">
            <span class="post-date">📅 ${genDate}</span>
            <span class="ai-model">🤖 ${post.ai_model}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Render collab cards with real data - Updated to not depend on user data
function renderCollabCards() {
  const carouselTrack = document.querySelector('#carousel-track');
  
  if (collabPosts.length === 0) {
    carouselTrack.innerHTML = `
      <div class="knowledge-card collab-card" data-type="collab">
        <div class="card-header">
          <div class="card-author">
            <span class="author-name">DeepWiki Community</span>
          </div>
          <div class="card-metrics">
            <span class="view-count">0 views</span>
            <span class="favorite-count">❤️ 0</span>
          </div>
        </div>
        <h3>No Collaboration Posts Yet</h3>
        <div class="card-content-preview">
          Start connecting with the community! Share your collaboration ideas or skills to find like-minded people and build amazing projects together.
        </div>
        <div class="card-footer">
          <div class="card-tags">
            <span class="tag">networking</span>
          </div>
          <div class="card-meta">
            <span class="post-date">📅 Today</span>
            <span class="collab-type">🤝 Community</span>
          </div>
        </div>
      </div>
    `;
    return;
  }

  carouselTrack.innerHTML = collabPosts.map(post => {
    // Format date
    const postDate = new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Use anonymous author since we can't safely access user data
    const authorName = getAuthorName(post);
    
    // Truncate description for preview (doubled size as requested)
    const descriptionPreview = post.description ? 
      (post.description.length > 300 ? post.description.substring(0, 300) + '...' : post.description) :
      'Collaboration opportunity';

    const typeDisplay = post.type === 'request' ? 'Looking for' : 'Offering';
    const typeIcon = post.type === 'request' ? '🔍' : '🎯';

    return `
      <div class="knowledge-card collab-card" data-type="collab" data-post-id="${post.id}">
        <div class="card-header">
          <div class="card-author">
            <span class="author-name">👤 ${authorName}</span>
          </div>
          <div class="card-metrics">
            <span class="view-count">${post.views || 0} views</span>
            <span class="favorite-count">❤️ ${post.favorites_count || 0}</span>
          </div>
        </div>
        <h3>${post.title}</h3>
        <div class="card-content-preview">
          ${descriptionPreview}
        </div>
        <div class="card-footer">
          <div class="card-tags">
            ${post.tags.slice(0, 2).map(tag => `<span class="tag">${tag}</span>`).join('')}
            ${post.tags.length > 2 ? `<span class="tag">+${post.tags.length - 2}</span>` : ''}
          </div>
          <div class="card-meta">
            <span class="post-date">📅 ${postDate}</span>
            <span class="collab-type">${typeIcon} ${typeDisplay}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Get currently visible cards
function getVisibleCards() {
  return document.querySelectorAll(`.${currentCarouselType}-card`);
}

// Update carousel position with enhanced 3D effects and spacing
function updateCarouselPosition() {
  const visibleCards = getVisibleCards();
  
  if (visibleCards.length === 0) return;
  
  visibleCards.forEach((card, index) => {
    const offset = index - currentSlide;
    const absOffset = Math.abs(offset);
    
    // Reduced 3D transforms with better spacing and reduced scale
    const translateX = offset * 300; // Reduced horizontal spacing
    const rotateY = offset * 10; // Reduced rotation
    const scale = absOffset === 0 ? 1.05 : Math.max(0.75, 1 - (absOffset * 0.15)); // Reduced scale for active card
    const translateZ = absOffset === 0 ? 40 : -absOffset * 40; // Reduced depth
    const blur = absOffset === 0 ? 0 : Math.min(absOffset * 1.2, 3); // Reduced blur
    
    // Apply smooth transforms with better easing
    card.style.transform = `
      translateX(${translateX}px) 
      translateZ(${translateZ}px) 
      rotateY(${rotateY}deg) 
      scale(${scale})
    `;
    
    // Apply blur filter with smooth transitions
    card.style.filter = `blur(${blur}px)`;
    
    // Enhanced active card highlighting
    if (absOffset === 0) {
      card.classList.add('active-card');
    } else {
      card.classList.remove('active-card');
    }
    
    // Better z-index layering
    card.style.zIndex = 100 - absOffset * 10;
    
    // Opacity adjustments for better depth perception
    card.style.opacity = absOffset === 0 ? 1 : Math.max(0.5, 1 - (absOffset * 0.25));
  });
  
  // Update navigation button states
  prevBtn.disabled = currentSlide === 0;
  nextBtn.disabled = currentSlide >= visibleCards.length - 1;
}

// Carousel navigation with smooth transitions
prevBtn.addEventListener('click', () => {
  if (currentSlide > 0) {
    currentSlide--;
    updateCarouselPosition();
  }
});

nextBtn.addEventListener('click', () => {
  const visibleCards = getVisibleCards();
  if (currentSlide < visibleCards.length - 1) {
    currentSlide++;
    updateCarouselPosition();
  }
});

// Enhanced mouse wheel navigation with faster scrolling (increased by 50%)
const carouselContainer = document.querySelector('.knowledge-carousel');
let isScrolling = false;

carouselContainer.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  // Prevent multiple rapid scrolls
  if (isScrolling) return;
  isScrolling = true;
  
  const visibleCards = getVisibleCards();
  
  if (e.deltaY > 0 && currentSlide < visibleCards.length - 1) {
    // Scroll down/right - next card
    currentSlide++;
    updateCarouselPosition();
  } else if (e.deltaY < 0 && currentSlide > 0) {
    // Scroll up/left - previous card
    currentSlide--;
    updateCarouselPosition();
  }
  
  // Reset scroll lock after animation completes - reduced from 600ms to 400ms for 50% faster scrolling
  setTimeout(() => {
    isScrolling = false;
  }, 400);
});

// Add click handler for carousel cards to increment view count and navigate to post
carouselContainer.addEventListener('click', async (e) => {
  const card = e.target.closest('.knowledge-card');
  if (!card) return;
  
  const postId = card.dataset.postId;
  const postType = card.dataset.type;
  
  if (postId && postType) {
    // Increment view count in database
    try {
      const table = postType === 'archive' ? 'archive_posts' : 'collab_posts';
      
      // First, get the current view count
      const { data: currentPost, error: selectError } = await supabase
        .from(table)
        .select('views')
        .eq('id', postId)
        .single();
      
      if (selectError) {
        console.error('Error fetching current view count:', selectError);
        
        // Enhanced error handling for specific error types
        if (selectError.code === 'PGRST116') {
          console.warn('Post not found in database:', postId);
          // Update the user interface to reflect this
          showNotification('This post is no longer available', 'error');
        } else if (selectError.code?.startsWith('PGRST')) {
          console.warn('Database query error:', selectError.code, selectError.message);
          // Handle PostgreSQL REST errors
          showNotification('Database query error. Please try again later.', 'error');
        } else {
          // Generic database error
          console.warn('Database error:', selectError);
        }
      } else {
        // Increment the view count
        const newViewCount = (currentPost.views || 0) + 1;
        
        // Update the database with the new view count
        const { error: updateError } = await supabase
          .from(table)
          .update({ views: newViewCount })
          .eq('id', postId);
        
        if (!updateError) {
          // Update display
          const viewCountElement = card.querySelector('.view-count');
          if (viewCountElement) {
            viewCountElement.textContent = `${newViewCount} views`;
          }
        } else {
          console.error('Error updating view count:', updateError);
          
          // Specific handling for permission issues
          if (updateError.code === '42501' || updateError.message?.includes('permission')) {
            console.warn('Permission error updating view count');
            showNotification('You don\'t have permission to update this post', 'error');
          } else {
            // Generic database update error - don't bother the user, just log it
            console.warn('Failed to update view count, but continuing navigation');
          }
        }
      }
    } catch (error) {
      console.error('Error updating view count:', error);
      
      // Enhanced error handling for network errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn('Network error during view count update:', error.message);
        showNotification('Network issue detected. Please check your internet connection.', 'error');
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.warn('Connection timeout during view count update');
        showNotification('Connection timeout. Please try again later.', 'error');
      } else if (error.message?.includes('NetworkError')) {
        console.warn('Network error:', error);
        showNotification('Network error. Please check your connection.', 'error');
      } else {
        // Log other types of errors but don't block navigation
        console.warn('Unexpected error:', error);
      }
    } finally {
      // Always navigate to the post, even if view count update fails
      try {
        // Record the page visit before navigation
        recordPageVisit({
          type: postType,
          title: card.querySelector('h3')?.textContent || 'Post',
          url: `/view-post.html?id=${postId}&type=${postType}`,
          postId: postId,
          metadata: { action: 'viewed' }
        });
      } catch (recordError) {
        // If activity tracking fails, just log it but continue navigation
        console.warn('Failed to record page visit:', recordError);
      }
      
      // Navigate to the post in the same tab
      window.location.href = `/view-post.html?id=${postId}&type=${postType}`;
    }
  }
});

// Archive Search Functionality with Filters
async function fetchArchivePosts(query, filters = {}) {
  try {
    if (!query.trim()) {
      return [];
    }

    // Build query with filters
    let supabaseQuery = supabase
      .from('archive_posts')
      .select('*');

    // Apply search filter
    supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%,prompt.ilike.%${query}%,tags.cs.{${query}}`);

    // Apply AI model filters
    if (filters.aiModel && filters.aiModel.length > 0) {
      const modelConditions = filters.aiModel.map(model => {
        if (model === 'gpt-4') {
          return 'ai_model.ilike.%gpt-4%,ai_model.ilike.%gpt4%';
        } else if (model === 'claude') {
          return 'ai_model.ilike.%claude%';
        } else if (model === 'gemini') {
          return 'ai_model.ilike.%gemini%,ai_model.ilike.%bard%';
        } else if (model === 'other') {
          return '!ai_model.ilike.%gpt%,!ai_model.ilike.%claude%,!ai_model.ilike.%gemini%,!ai_model.ilike.%bard%';
        }
        return `ai_model.ilike.%${model}%`;
      }).join(',');
      supabaseQuery = supabaseQuery.or(modelConditions);
    }

    // Apply content type filter
    if (filters.contentType === 'text') {
      supabaseQuery = supabaseQuery.is('embed_url', null);
    } else if (filters.contentType === 'embedded') {
      supabaseQuery = supabaseQuery.not('embed_url', 'is', null);
    }

    // Apply date range filters
    if (filters.dateFrom) {
      supabaseQuery = supabaseQuery.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setDate(endDate.getDate() + 1);
      supabaseQuery = supabaseQuery.lt('created_at', endDate.toISOString().split('T')[0]);
    }

    // Apply view count filters
    if (filters.viewsMin) {
      supabaseQuery = supabaseQuery.gte('views', parseInt(filters.viewsMin));
    }
    if (filters.viewsMax) {
      supabaseQuery = supabaseQuery.lte('views', parseInt(filters.viewsMax));
    }

    const { data, error } = await supabaseQuery
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Search error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected search error:', error);
    return [];
  }
}

// Collab Search Functionality
async function fetchCollabPosts(query) {
  try {
    if (!query.trim()) {
      return [];
    }

    // Search across multiple fields using OR condition
    const { data, error } = await supabase
      .from('collab_posts')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Search error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected search error:', error);
    return [];
  }
}

function getEmbedUrl(originalUrl) {
  let embedUrl = originalUrl;
  
  // Handle Google Docs URLs
  if (embedUrl.includes('docs.google.com/document')) {
    // Extract document ID from the URL
    const docIdMatch = embedUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (docIdMatch) {
      const docId = docIdMatch[1];
      // Use the proper embed format for Google Docs
      embedUrl = `https://docs.google.com/document/d/${docId}/embed`;
    }
  }
  // Handle ChatGPT share URLs
  else if (embedUrl.includes('chatgpt.com/share/') || embedUrl.includes('chat.openai.com/share/')) {
    // ChatGPT shares might need special handling
    embedUrl = originalUrl; // Keep original for now
  }
  
  return embedUrl;
}

function isGoogleDocsUrl(url) {
  return url.includes('docs.google.com') || 
         url.includes('drive.google.com') ||
         url.includes('sheets.google.com') ||
         url.includes('slides.google.com');
}

function displayPosts(posts, query, postType) {
  const searchResultsHeader = document.querySelector('.search-results-header h2');
  
  // Update header based on post type
  if (postType === 'archive') {
    searchResultsHeader.textContent = 'Archive Search Results';
  } else {
    searchResultsHeader.textContent = 'Collab Search Results';
  }

  if (posts.length === 0) {
    searchResults.innerHTML = `
      <div class="no-results">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#067273" stroke-width="1">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <h3>No results found</h3>
        <p>Try different keywords, adjust your filters, or check your spelling</p>
      </div>
    `;
    return;
  }

  searchResults.innerHTML = `
    <div class="search-summary">
      <p>Found ${posts.length} result${posts.length !== 1 ? 's' : ''} for "${query}"</p>
    </div>
    ${posts.map(post => {
      if (postType === 'archive') {
        return renderArchivePost(post, query);
      } else {
        return renderCollabPost(post, query);
      }
    }).join('')}
  `;
}

function renderArchivePost(post, query) {
  let postContent = '';
  
  // If there's an embed URL, show it with proper embedding and fallbacks
  if (post.embed_url) {
    const embedUrl = getEmbedUrl(post.embed_url);
    const isGoogleDoc = isGoogleDocsUrl(post.embed_url);
    const isChatGPT = post.embed_url.includes('chatgpt.com') || post.embed_url.includes('chat.openai.com');
    
    postContent = `
      <div class="post-embed">
        <div class="embed-header">
          <div class="embed-type">
            ${isGoogleDoc ? '📄 Google Document' : isChatGPT ? '🤖 ChatGPT Conversation' : '🔗 External Link'}
          </div>
          <a href="${post.embed_url}" target="_blank" rel="noopener noreferrer" class="open-external">
            Open Original <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15,3 21,3 21,9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
        
        <div class="embed-container">
          ${isGoogleDoc ? `
            <!-- Google Docs cannot be embedded due to security restrictions -->
            <div class="embed-blocked" style="text-align: center; padding: 60px 20px; background: rgba(6, 114, 115, 0.03); border-radius: 8px; border: 1px solid rgba(6, 114, 115, 0.1);">
              <div style="color: #067273; margin-bottom: 20px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#067273" stroke-width="1">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              <h4 style="color: #067273; margin-bottom: 15px; font-size: 18px; font-weight: 600;">Google Document Available</h4>
              <p style="color: #666; margin-bottom: 25px; font-size: 15px; line-height: 1.5;">
                This Google Document cannot be embedded directly due to security restrictions, but you can access the full content by clicking the button below.
              </p>
              <a href="${post.embed_url}" target="_blank" rel="noopener noreferrer" 
                 style="display: inline-flex; align-items: center; gap: 10px; background: #067273; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; transition: all 0.2s ease;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15,3 21,3 21,9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                View Document
              </a>
            </div>
          ` : `
            <!-- Try to embed non-Google content -->
            <iframe 
              src="${embedUrl}" 
              width="100%" 
              height="500" 
              frameborder="0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              loading="lazy"
              onload="this.style.opacity='1'"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='block'"
              style="border-radius: 8px; border: 1px solid rgba(6, 114, 115, 0.1); opacity: 0; transition: opacity 0.3s ease;">
            </iframe>
            
            <div class="embed-error" style="display: none; text-align: center; padding: 40px; background: rgba(6, 114, 115, 0.05); border-radius: 8px; border: 1px solid rgba(6, 114, 115, 0.1);">
              <div style="color: #666; margin-bottom: 15px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h4 style="color: #067273; margin-bottom: 10px;">Preview not available</h4>
              <p style="color: #666; margin-bottom: 20px; font-size: 14px;">
                This content cannot be embedded directly due to security restrictions.
              </p>
              <a href="${post.embed_url}" target="_blank" rel="noopener noreferrer" 
                 style="display: inline-flex; align-items: center; gap: 8px; background: #067273; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15,3 21,3 21,9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                View Original Content
              </a>
            </div>
          `}
        </div>
      </div>
    `;
  } else {
    // Show text content with search highlighting
    let content = post.content;
    if (query && content && content.toLowerCase().includes(query.toLowerCase())) {
      const regex = new RegExp(`(${query})`, 'gi');
      content = content.replace(regex, '<mark>$1</mark>');
    }
    
    postContent = `
      <div class="post-content">
        <div class="content-header">
          <span class="content-type">📝 Text Content</span>
        </div>
        <div class="content-text">
          <p>${content && content.length > 400 ? content.substring(0, 400) + '...' : content || 'No content available'}</p>
        </div>
      </div>
    `;
  }

  // Highlight search terms in title and prompt
  let title = post.title || 'Untitled Post';
  let prompt = post.prompt || '';
  
  if (query) {
    const regex = new RegExp(`(${query})`, 'gi');
    title = title.replace(regex, '<mark>$1</mark>');
    if (prompt) {
      prompt = prompt.replace(regex, '<mark>$1</mark>');
    }
  }

  return `
    <div class="search-post-item">
      <div class="post-header">
        <h4>${title}</h4>
        <div class="post-meta">
          <span>Posted ${new Date(post.created_at).toLocaleDateString()}</span>
          <span>•</span>
          <span>AI Model: ${post.ai_model || 'Not specified'}</span>
          ${post.generation_date ? `<span>•</span><span>Generated: ${new Date(post.generation_date).toLocaleDateString()}</span>` : ''}
        </div>
      </div>
      
      ${postContent}
      
      ${prompt ? `
        <div class="post-prompt">
          <strong>Original Prompt:</strong>
          <p>${prompt.length > 200 ? prompt.substring(0, 200) + '...' : prompt}</p>
        </div>
      ` : ''}
      
      <div class="post-tags">
        ${post.tags && Array.isArray(post.tags) ? post.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
      </div>
      
      <div class="post-actions">
        <button class="view-full-post-btn" onclick="window.location.href='/view-post.html?id=${post.id}&type=archive'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h6v6"/>
            <path d="M10 14L21 3"/>
            <path d="M21 9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h11"/>
          </svg>
          View Full Post
        </button>
      </div>
    </div>
  `;
}

function renderCollabPost(post, query) {
  // Highlight search terms in title and description
  let title = post.title || 'Untitled Post';
  let description = post.description || '';
  
  if (query) {
    const regex = new RegExp(`(${query})`, 'gi');
    title = title.replace(regex, '<mark>$1</mark>');
    if (description) {
      description = description.replace(regex, '<mark>$1</mark>');
    }
  }

  // Format the type for display
  const typeDisplay = post.type === 'request' ? 'Looking for Collaboration' : 'Offering to Collaborate';
  const typeIcon = post.type === 'request' ? '🔍' : '🎯';

  return `
    <div class="search-post-item">
      <div class="post-header">
        <h4>${title}</h4>
        <div class="post-meta">
          <span>Posted ${new Date(post.created_at).toLocaleDateString()}</span>
          <span>•</span>
          <span>${typeIcon} ${typeDisplay}</span>
        </div>
      </div>
      
      <div class="post-content">
        <div class="content-header">
          <span class="content-type">🤝 Collaboration Post</span>
        </div>
        <div class="content-text">
          <p>${description && description.length > 400 ? description.substring(0, 400) + '...' : description || 'No description available'}</p>
        </div>
      </div>
      
      <div class="post-prompt">
        <strong>Contact Information:</strong>
        <p>
          <a href="mailto:${post.contact_email}" style="color: #067273; text-decoration: none;">
            📧 ${post.contact_email || 'No contact email provided'}
          </a>
        </p>
      </div>
      
      <div class="post-tags">
        ${post.tags && Array.isArray(post.tags) ? post.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
      </div>
      
      <div class="post-actions">
        <button class="view-full-post-btn" onclick="window.location.href='/view-post.html?id=${post.id}&type=collab'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h6v6"/>
            <path d="M10 14L21 3"/>
            <path d="M21 9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h11"/>
          </svg>
          View Full Post
        </button>
      </div>
    </div>
  `;
}

async function performSearch() {
  const query = searchInput.value.trim();
  
  if (!query) {
    searchResults.innerHTML = '<p class="empty-state">Enter a search term to find posts</p>';
    return;
  }

  // Show loading state
  searchLoading.style.display = 'block';
  searchResults.style.display = 'none';
  archiveResultsContainer.classList.add('active');

  try {
    // Update filters from current form state
    updateCurrentFilters();

    let posts;
    if (currentCarouselType === 'archive') {
      posts = await fetchArchivePosts(query, currentFilters);
    } else {
      posts = await fetchCollabPosts(query);
    }
    
    displayPosts(posts, query, currentCarouselType);
  } catch (error) {
    console.error('Search error:', error);
    
    // Enhanced error handling for network issues
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      searchResults.innerHTML = `
        <div class="error-state">
          <p>Network error: Could not connect to the search service. Please check your internet connection and try again.</p>
          <button onclick="performSearch()" class="retry-button">Retry Search</button>
        </div>`;
    } else {
      searchResults.innerHTML = `
        <div class="error-state">
          <p>An error occurred while searching. Please try again.</p>
          <p class="error-details">${error.message || 'Unknown error'}</p>
        </div>`;
    }
  } finally {
    searchLoading.style.display = 'none';
    searchResults.style.display = 'block';
  }
}

// Search event listeners
searchButton.addEventListener('click', performSearch);

searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    performSearch();
  }
});

// Browse button functionality - Updated to use new browse pages
browseButton.addEventListener('click', () => {
  if (currentCarouselType === 'archive') {
    window.location.href = '/browse-archive.html';
  } else {
    window.location.href = '/browse-collab.html';
  }
});

// Close search results
closeSearchBtn.addEventListener('click', () => {
  archiveResultsContainer.classList.remove('active');
  searchInput.value = '';
  searchResults.innerHTML = '<p class="empty-state">Enter a search term to find posts</p>';
});

// Handle nav item clicks
navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    // Remove active class from all nav items
    navItems.forEach(nav => nav.classList.remove('active'));
    // Add active class to clicked item
    item.classList.add('active');
    
    const isCollab = item.classList.contains('collab-nav');
    const isArchives = item.classList.contains('archives-nav');
    
    if (isCollab) {
      searchInput.placeholder = 'Search WikiDeep.io Vibe Coder Collab';
      browseButton.textContent = 'Browse Collab';
      currentCarouselType = 'collab';
    } else if (isArchives) {
      searchInput.placeholder = 'Search WikiDeep.io Open AI Archives';
      browseButton.textContent = 'Browse Archive';
      currentCarouselType = 'archive';
    }
    
    updateCarouselContent();
  });
});

document.addEventListener('click', (e) => {
  if (!menuHeader.contains(e.target)) {
    const dropdowns = document.getElementsByClassName('archives-content');
    for (const dropdown of dropdowns) {
      if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
      }
    }
  }
});

// Animation variables and logic
let startTime = null;
const animationDuration = 3000;
const slideInDuration = 1100;

function animate(currentTime) {
  if (!startTime) startTime = currentTime;
  const elapsed = currentTime - startTime;
  const progress = Math.min(elapsed / animationDuration, 1);

  if (elapsed < slideInDuration) {
    middleImage.style.opacity = 0;
    menuHeader.style.opacity = 0;
    topCenterImage.style.opacity = 0;
    searchContainer.style.opacity = 0;
    knowledgeCarousel.style.opacity = 0;
    carouselNavigationContainer.style.opacity = 0;
    footer.style.opacity = 0;
    if (boltBadge) boltBadge.style.opacity = 0;
  } 
  else if (progress <= 0.8) {
    const rotationProgress = (elapsed - slideInDuration) / (animationDuration * 0.8 - slideInDuration);
    const rotationSpeed = rotationProgress * 1440;
    const scale = 1 - (rotationProgress * 0.75);
    const moveY = -rotationProgress * 100;

    middleImage.style.opacity = 1;
    middleImage.style.transform = `translate(-50%, calc(-50% + ${moveY}vh)) rotate(${rotationSpeed}deg) scale(${scale})`;
    menuHeader.style.opacity = 0;
    topCenterImage.style.opacity = 0;
    searchContainer.style.opacity = 0;
    knowledgeCarousel.style.opacity = 0;
    carouselNavigationContainer.style.opacity = 0;
    footer.style.opacity = 0;
    if (boltBadge) boltBadge.style.opacity = 0;
  } else {
    middleImage.style.opacity = 0;
    menuHeader.style.opacity = 1;
    topCenterImage.style.opacity = 1;
    
    if (progress > 0.9) {
      searchContainer.style.opacity = 1;
      searchContainer.classList.add('visible');
      knowledgeCarousel.style.opacity = 1;
      knowledgeCarousel.classList.add('visible');
      carouselNavigationContainer.style.opacity = 1;
      carouselNavigationContainer.classList.add('visible');
      
      if (progress > 0.95) {
        footer.style.opacity = 1;
        footer.classList.add('visible');
        
        if (boltBadge) {
          boltBadge.style.opacity = 1;
        }
      }
    }
  }

  if (progress < 1) {
    requestAnimationFrame(animate);
  }
  
  menuHeader.classList.add('visible');
}

// Initialize carousel and start animation
initializeCarousel();
requestAnimationFrame(animate);

// Set initial page state
if (isCollabPage) {
  document.querySelector('.collab-nav').classList.add('active');
  searchInput.placeholder = 'Search WikiDeep.io Vibe Coder Collab';
  browseButton.textContent = 'Browse Collab';
  currentCarouselType = 'collab';
  updateCarouselContent();
} else {
  document.querySelector('.archives-nav').classList.add('active');
}