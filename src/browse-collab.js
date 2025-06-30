import { createClient } from '@supabase/supabase-js';
import { initMenu } from './utils/menu.js';
import { recordPageVisit, getPageTitle, getPageTypeFromUrl } from './utils/activityTracker.js';
import SearchResultsView from './utils/searchResultsView.js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

let currentUser = null;
let allPosts = [];
let filteredPosts = [];
let currentPage = 1;
let postsPerPage = 12;
let isLoading = false;
let currentFilters = {
  search: '',
  sort: 'newest',
  type: 'all',
  skills: [],
  dateFrom: '',
  dateTo: '',
  tags: []
};

// View manager
let searchResultsView = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize the menu
  initMenu();
  
  // Record page visit
  recordPageVisit({
    type: getPageTypeFromUrl(window.location.href),
    title: getPageTitle(),
    url: window.location.href
  });
  
  // Check authentication status
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  
  // Load collaboration posts
  await loadCollabPosts();
  
  // Setup event listeners
  setupEventListeners();
  
  // Initialize filter toggle functionality
  initializeFilterToggle();
  
  // Initialize search results view manager
  initializeSearchResultsView();
});

function initializeSearchResultsView() {
  // Initialize the view manager after posts are loaded
  searchResultsView = new SearchResultsView('#posts-container', {
    nebulaContainerId: 'nebula-view-container',
    listToggleSelector: '.view-toggle-btn[data-view="list"]',
    nebulaToggleSelector: '.view-toggle-btn[data-view="nebula"]',
    resultsData: filteredPosts,
    onSwitchView: function(viewType) {
      console.log('Switched to', viewType, 'view');
      
      // If switching to nebula view, make sure we have the latest data
      if (viewType === 'nebula') {
        searchResultsView.updateResults(filteredPosts);
      }
    }
  });
}

function initializeFilterToggle() {
  const filtersToggle = document.getElementById('filters-toggle');
  const filtersContent = document.getElementById('search-filters-content');
  
  if (filtersToggle && filtersContent) {
    filtersToggle.addEventListener('click', function() {
      const isVisible = filtersContent.style.display !== 'none';
      
      if (isVisible) {
        filtersContent.style.display = 'none';
        filtersToggle.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
          </svg>
          Show Filters
        `;
        filtersToggle.classList.remove('active');
      } else {
        filtersContent.style.display = 'block';
        filtersContent.classList.add('visible');
        filtersToggle.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
          </svg>
          Hide Filters
        `;
        filtersToggle.classList.add('active');
      }
    });
  }
}

async function loadCollabPosts() {
  if (isLoading) return;
  
  isLoading = true;
  showLoading();
  
  try {
    // Get notifications for current user
    const { data, error } = await supabase
      .from('collab_posts')
      .select(`
        *,
        users:user_id (
          email,
          raw_user_meta_data
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    allPosts = data || [];
    applyFilters();
    
    // Load popular tags
    loadPopularTags();
    
  } catch (error) {
    console.error('Error loading collaboration posts:', error);
    showError('Failed to load collaboration posts. Please try again.');
  } finally {
    isLoading = false;
  }
}

function loadPopularTags() {
  const tagCounts = {};
  
  allPosts.forEach(post => {
    if (post.tags && Array.isArray(post.tags)) {
      post.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });
  
  // Get top 10 most popular tags
  const popularTags = Object.entries(tagCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([tag]) => tag);
  
  const tagsContainer = document.getElementById('popular-tags');
  if (tagsContainer && popularTags.length > 0) {
    tagsContainer.innerHTML = popularTags.map(tag => 
      `<button class="tag-filter" data-tag="${tag}">${tag}</button>`
    ).join('');
    
    // Add click handlers
    tagsContainer.querySelectorAll('.tag-filter').forEach(btn => {
      btn.addEventListener('click', () => toggleTagFilter(btn.dataset.tag, btn));
    });
  }
}

function toggleTagFilter(tag, buttonElement) {
  const isActive = buttonElement.classList.contains('active');
  
  if (isActive) {
    buttonElement.classList.remove('active');
    currentFilters.tags = currentFilters.tags.filter(t => t !== tag);
  } else {
    buttonElement.classList.add('active');
    if (!currentFilters.tags.includes(tag)) {
      currentFilters.tags.push(tag);
    }
  }
  
  applyFilters();
}

function applyFilters() {
  let filtered = [...allPosts];
  
  // Apply search filter
  if (currentFilters.search) {
    const searchTerm = currentFilters.search.toLowerCase();
    filtered = filtered.filter(post => 
      post.title.toLowerCase().includes(searchTerm) ||
      post.description.toLowerCase().includes(searchTerm) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }
  
  // Apply collaboration type filter
  if (currentFilters.type !== 'all') {
    filtered = filtered.filter(post => post.type === currentFilters.type);
  }
  
  // Apply skills filter
  if (currentFilters.skills.length > 0) {
    filtered = filtered.filter(post =>
      post.tags.some(tag => 
        currentFilters.skills.some(skill => 
          tag.toLowerCase().includes(skill.toLowerCase())
        )
      )
    );
  }
  
  // Apply date range filter
  if (currentFilters.dateFrom) {
    const fromDate = new Date(currentFilters.dateFrom);
    filtered = filtered.filter(post => new Date(post.created_at) >= fromDate);
  }
  
  if (currentFilters.dateTo) {
    const toDate = new Date(currentFilters.dateTo);
    toDate.setHours(23, 59, 59, 999); // End of day
    filtered = filtered.filter(post => new Date(post.created_at) <= toDate);
  }
  
  // Apply tag filters
  if (currentFilters.tags.length > 0) {
    filtered = filtered.filter(post =>
      currentFilters.tags.some(filterTag =>
        post.tags.some(postTag => postTag.toLowerCase().includes(filterTag.toLowerCase()))
      )
    );
  }
  
  // Apply sorting
  switch (currentFilters.sort) {
    case 'newest':
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
    case 'oldest':
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
    case 'alphabetical':
      filtered.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'most-viewed':
      filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
      break;
    case 'most-favorited':
      filtered.sort((a, b) => (b.favorites_count || 0) - (a.favorites_count || 0));
      break;
  }
  
  filteredPosts = filtered;
  currentPage = 1;
  displayPosts();
  updateStats();
  
  // Update nebula view if it's active
  if (searchResultsView) {
    searchResultsView.updateResults(filteredPosts);
  }
}

function displayPosts() {
  const container = document.getElementById('posts-container');
  
  if (filteredPosts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#067273" stroke-width="1">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/>
          <path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <h3>No collaboration posts found</h3>
        <p>No collaboration opportunities match your current filters. Try adjusting your search or browse all posts.</p>
        <a href="/collab.html" class="browse-content-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14"/>
            <path d="M5 12h14"/>
          </svg>
          Post a Collaboration
        </a>
      </div>
    `;
    return;
  }
  
  // Calculate pagination
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const postsToShow = filteredPosts.slice(startIndex, endIndex);
  
  const postsGrid = document.createElement('div');
  postsGrid.className = 'posts-grid';
  
  postsToShow.forEach(post => {
    const postCard = createPostCard(post);
    postsGrid.appendChild(postCard);
  });
  
  container.innerHTML = '';
  container.appendChild(postsGrid);
  
  // Add pagination
  displayPagination();
}

function createPostCard(post) {
  const postDate = new Date(post.created_at).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  
  const authorName = post.users?.raw_user_meta_data?.display_name || 
                    post.users?.raw_user_meta_data?.full_name || 
                    post.users?.email?.split('@')[0] || 
                    'Community Member';
  
  const div = document.createElement('div');
  div.className = 'post-card';
  div.onclick = () => window.location.href = `/view-post.html?type=collab&id=${post.id}`;
  
  div.innerHTML = `
    <div class="post-card-header">
      <div class="post-type-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/>
          <path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
        ${post.type.toUpperCase()}
      </div>
    </div>
    
    <h4 class="post-card-title">${post.title}</h4>
    
    <div class="post-card-meta">
      <span>👤 ${authorName}</span>
      <span>•</span>
      <span>📅 ${postDate}</span>
      <span>•</span>
      <span>👁️ ${post.views || 0} views</span>
    </div>
    
    <div class="post-card-content">${post.description}</div>
    
    <div class="post-card-tags">
      ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
    </div>
    
    <div class="post-card-footer">
      <span class="post-card-date">Posted ${postDate}</span>
      <div class="post-card-actions">
        <a href="/view-post.html?type=collab&id=${post.id}" class="view-btn" onclick="event.stopPropagation()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h6v6"/>
            <path d="M10 14L21 3"/>
            <path d="M21 9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h11"/>
          </svg>
          View
        </a>
        <a href="mailto:${post.contact_email}" class="contact-btn" onclick="event.stopPropagation()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Contact
        </a>
        <button class="favorite-btn" onclick="event.stopPropagation(); toggleFavorite('${post.id}', 'collab', this)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  
  return div;
}

function displayPagination() {
  const paginationContainer = document.getElementById('pagination-container');
  if (!paginationContainer) return;
  
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }
  
  const pagination = document.createElement('div');
  pagination.className = 'pagination';
  
  // Previous button
  const prevBtn = document.createElement('button');
  prevBtn.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
  prevBtn.textContent = 'Previous';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      displayPosts();
    }
  };
  
  pagination.appendChild(prevBtn);
  
  // Page numbers
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.onclick = () => {
      currentPage = i;
      displayPosts();
    };
    
    pagination.appendChild(pageBtn);
  }
  
  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
  nextBtn.textContent = 'Next';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      displayPosts();
    }
  };
  
  pagination.appendChild(nextBtn);
  
  paginationContainer.innerHTML = '';
  paginationContainer.appendChild(pagination);
}

function setupEventListeners() {
  // Search functionality
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      currentFilters.search = e.target.value.trim();
      applyFilters();
    }, 300));
  }
  
  // Sort functionality
  const sortFilter = document.getElementById('sort-filter');
  if (sortFilter) {
    sortFilter.addEventListener('change', (e) => {
      currentFilters.sort = e.target.value;
      applyFilters();
    });
  }
  
  // Collab type filter
  const collabTypeFilters = document.querySelectorAll('input[name="collab-type"]');
  collabTypeFilters.forEach(filter => {
    filter.addEventListener('change', () => {
      currentFilters.type = filter.value;
      applyFilters();
    });
  });
  
  // Skills filters
  const skillFilters = document.querySelectorAll('input[name="skill"]');
  skillFilters.forEach(filter => {
    filter.addEventListener('change', () => {
      if (filter.checked) {
        if (!currentFilters.skills.includes(filter.value)) {
          currentFilters.skills.push(filter.value);
        }
      } else {
        currentFilters.skills = currentFilters.skills.filter(skill => skill !== filter.value);
      }
      applyFilters();
    });
  });
  
  // Date range filters
  const dateFromInput = document.querySelector('input[name="date-from"]');
  const dateToInput = document.querySelector('input[name="date-to"]');
  
  if (dateFromInput) {
    dateFromInput.addEventListener('change', () => {
      currentFilters.dateFrom = dateFromInput.value;
      applyFilters();
    });
  }
  
  if (dateToInput) {
    dateToInput.addEventListener('change', () => {
      currentFilters.dateTo = dateToInput.value;
      applyFilters();
    });
  }
  
  // Tag search
  const tagSearchInput = document.getElementById('tag-search-input');
  if (tagSearchInput) {
    tagSearchInput.addEventListener('input', debounce(handleTagSearch, 300));
  }
  
  // Clear filters button
  const clearFiltersBtn = document.getElementById('clear-filters');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearAllFilters);
  }
  
  // View toggle
  setupViewToggleListeners();
}

function setupViewToggleListeners() {
  const listViewBtn = document.querySelector('.view-toggle-btn[data-view="list"]');
  const nebulaViewBtn = document.querySelector('.view-toggle-btn[data-view="nebula"]');
  
  if (listViewBtn && nebulaViewBtn) {
    // These should be handled by the SearchResultsView class now,
    // but we'll keep the visual toggle in case the class isn't initialized
    listViewBtn.addEventListener('click', () => {
      listViewBtn.classList.add('active');
      nebulaViewBtn.classList.remove('active');
      
      if (!searchResultsView) {
        // Fallback behavior if the view manager isn't available
        const postsContainer = document.getElementById('posts-container');
        const nebulaContainer = document.getElementById('nebula-view-container');
        
        if (postsContainer) postsContainer.style.display = 'block';
        if (nebulaContainer) nebulaContainer.style.display = 'none';
      }
    });
    
    nebulaViewBtn.addEventListener('click', () => {
      nebulaViewBtn.classList.add('active');
      listViewBtn.classList.remove('active');
      
      if (!searchResultsView) {
        // Fallback behavior if the view manager isn't available
        const postsContainer = document.getElementById('posts-container');
        const nebulaContainer = document.getElementById('nebula-view-container');
        
        if (postsContainer) postsContainer.style.display = 'none';
        if (nebulaContainer) {
          nebulaContainer.style.display = 'block';
          // Render nebula view
          // This would normally be handled by the SearchResultsView class
        }
      }
    });
  }
}

function handleTagSearch(e) {
  const searchTerm = e.target.value.toLowerCase().trim();
  const tagButtons = document.querySelectorAll('.tag-filter');
  
  tagButtons.forEach(btn => {
    const tag = btn.dataset.tag.toLowerCase();
    if (tag.includes(searchTerm)) {
      btn.style.display = 'inline-block';
    } else {
      btn.style.display = 'none';
    }
  });
}

function clearAllFilters() {
  // Reset all filters
  currentFilters = {
    search: '',
    sort: 'newest',
    type: 'all',
    skills: [],
    dateFrom: '',
    dateTo: '',
    tags: []
  };
  
  // Reset form inputs
  document.getElementById('search-input').value = '';
  document.getElementById('sort-filter').value = 'newest';
  
  // Reset checkboxes and radio buttons
  document.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = false;
  });
  
  document.querySelectorAll('input[type="radio"]').forEach(input => {
    if (input.value === 'all') {
      input.checked = true;
    } else {
      input.checked = false;
    }
  });
  
  // Reset date inputs
  document.querySelectorAll('input[type="date"]').forEach(input => {
    input.value = '';
  });
  
  // Reset tag filters
  document.querySelectorAll('.tag-filter.active').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Reset tag search
  const tagSearchInput = document.getElementById('tag-search-input');
  if (tagSearchInput) {
    tagSearchInput.value = '';
    document.querySelectorAll('.tag-filter').forEach(btn => {
      btn.style.display = 'inline-block';
    });
  }
  
  // Apply filters (which will show all posts)
  applyFilters();
}

async function toggleFavorite(postId, postType, button) {
  if (!currentUser) {
    alert('Please sign in to add favorites.');
    window.location.href = '/login.html';
    return;
  }
  
  try {
    const isFavorited = button.classList.contains('favorited');
    
    if (isFavorited) {
      // Remove from favorites
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('post_id', postId)
        .eq('post_type', postType);
      
      if (error) throw error;
      
      button.classList.remove('favorited');
      button.querySelector('svg').setAttribute('fill', 'none');
      showNotification('Removed from favorites', 'success');
    } else {
      // Add to favorites
      const post = allPosts.find(p => p.id === postId);
      if (!post) return;
      
      const { error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: currentUser.id,
          post_id: postId,
          post_type: postType,
          post_title: post.title,
          post_data: {
            description: post.description,
            tags: post.tags,
            contact_email: post.contact_email
          }
        });
      
      if (error) throw error;
      
      button.classList.add('favorited');
      button.querySelector('svg').setAttribute('fill', 'currentColor');
      showNotification('Added to favorites', 'success');
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    showNotification('Failed to update favorites', 'error');
  }
}

// Make toggleFavorite globally available
window.toggleFavorite = toggleFavorite;

function updateStats() {
  const statsElement = document.getElementById('browse-stats');
  if (statsElement) {
    const total = allPosts.length;
    const filtered = filteredPosts.length;
    
    if (currentFilters.search || currentFilters.tags.length > 0 || 
        currentFilters.type !== 'all' || currentFilters.skills.length > 0) {
      statsElement.innerHTML = `<p>Showing ${filtered} of ${total} collaboration posts</p>`;
    } else {
      statsElement.innerHTML = `<p>Showing ${total} collaboration posts</p>`;
    }
  }
}

function showLoading() {
  const container = document.getElementById('posts-container');
  if (container) {
    container.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading collaboration posts...</p>
      </div>
    `;
  }
}

function showError(message) {
  const container = document.getElementById('posts-container');
  if (container) {
    container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading Posts</h3>
        <p>${message}</p>
        <button class="back-button" onclick="window.location.reload()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 4v6h6"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
          Try Again
        </button>
      </div>
    `;
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#dc3545' : '#067273'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 100);

  // Remove notification
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}