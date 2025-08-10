import { createClient } from '@supabase/supabase-js';
import { initMenu } from './utils/menu.js';
import { recordPageVisit, getPageTitle, getPageTypeFromUrl } from './utils/activityTracker.js';
import { restrictAllDateInputs } from './utils/dateRestriction.js';
import { debounce } from './utils/performance.js';

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
let activeFilters = {
  search: '',
  sort: 'alphabetical',
  aiModel: [],
  contentType: 'all',
  promptVisibility: 'all',
  dateFrom: '',
  dateTo: '',
  viewsMin: '',
  viewsMax: '',
  tags: []
};

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize the menu
  initMenu();
  
  // Record page visit
  recordPageVisit({
    type: getPageTypeFromUrl(window.location.href),
    title: getPageTitle(),
    url: window.location.href
  });
  
  // Restrict date inputs to today or earlier
  restrictAllDateInputs();
  
  // Check authentication status
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  
  // Load posts and setup event listeners
  await loadPosts();
  setupEventListeners();
  setupFilters();
  
  // Initialize filter toggle functionality
  initializeFilterToggle();
});

function initializeFilterToggle() {
  const filtersToggle = document.getElementById('filters-toggle');
  const filtersContent = document.getElementById('search-filters-content');
  
  if (filtersToggle && filtersContent) {
    filtersToggle.addEventListener('click', function() {
      const isVisible = filtersContent.style.display !== 'none';
      
      if (isVisible) {
        filtersContent.style.display = 'none';
        filtersToggle.textContent = 'Show Filters';
        filtersToggle.classList.remove('active');
        
        // Add the icon back after changing text
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
        
        filtersToggle.insertBefore(iconSvg, filtersToggle.firstChild);
      } else {
        filtersContent.style.display = 'block';
        filtersContent.classList.add('visible');
        filtersToggle.textContent = 'Hide Filters';
        filtersToggle.classList.add('active');
        
        // Add the icon back after changing text
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
        
        filtersToggle.insertBefore(iconSvg, filtersToggle.firstChild);
      }
    });
  }
}

async function loadPosts() {
  if (isLoading) return;
  
  isLoading = true;
  showLoading();
  
  try {
    // Add connection test before main query
    console.log('Testing Supabase connection...');
    const { testSupabaseConnection } = await import('./utils/supabaseHealthChecker.js');
    const connectionTest = await testSupabaseConnection();
    
    if (!connectionTest.success) {
      console.error('Supabase connection test failed:', connectionTest.errors);
      throw new Error('Database connection failed. Your Supabase project might be paused.');
    }
    
    const { data: posts, error } = await supabase
      .from('archive_posts')
      .select(`
        *,
        users:user_id (
          email,
          raw_user_meta_data
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Database query error:', error);
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to database. Please check your internet connection or try refreshing the page. Your Supabase project might be paused.');
      }
      throw error;
    }
    
    allPosts = posts || [];
    filteredPosts = [...allPosts];
    
    // Load popular tags
    loadPopularTags();
    
    applyFiltersAndSort();
    updateStats();
    
  } catch (error) {
    console.error('Error loading posts:', error);
    showError(error.message || 'Failed to load archive posts. Please try again.');
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

function setupEventListeners() {
  // Search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
  }
  
  // Sort filter
  const sortFilter = document.getElementById('sort-filter');
  if (sortFilter) {
    sortFilter.addEventListener('change', handleSortChange);
  }
  
  // Clear filters
  const clearFiltersBtn = document.getElementById('clear-filters');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearAllFilters);
  }

  // Apply filters button
  const applyFiltersBtn = document.getElementById('apply-filters');
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', applyFiltersAndSort);
  }
}

function setupFilters() {
  // AI Model filters
  const aiModelFilters = document.querySelectorAll('input[name="ai-model"]');
  aiModelFilters.forEach(filter => {
    filter.addEventListener('change', () => {
      updateArrayFilter('aiModel', filter.value, filter.checked);
    });
  });
  
  // Content type filters
  const contentTypeFilters = document.querySelectorAll('input[name="content-type"]');
  contentTypeFilters.forEach(filter => {
    filter.addEventListener('change', () => {
      activeFilters.contentType = filter.value;
    });
  });
  
  // Prompt visibility filters
  const promptVisibilityFilters = document.querySelectorAll('input[name="prompt-visibility"]');
  promptVisibilityFilters.forEach(filter => {
    filter.addEventListener('change', () => {
      activeFilters.promptVisibility = filter.value;
    });
  });
  
  // Date range filters
  const dateFromInput = document.querySelector('input[name="date-from"]');
  const dateToInput = document.querySelector('input[name="date-to"]');
  
  if (dateFromInput) {
    dateFromInput.addEventListener('change', () => {
      activeFilters.dateFrom = dateFromInput.value;
    });
  }
  
  if (dateToInput) {
    dateToInput.addEventListener('change', () => {
      activeFilters.dateTo = dateToInput.value;
    });
  }
  
  // Views range filters
  const viewsMinInput = document.querySelector('input[name="views-min"]');
  const viewsMaxInput = document.querySelector('input[name="views-max"]');
  
  if (viewsMinInput) {
    viewsMinInput.addEventListener('input', debounce(() => {
      activeFilters.viewsMin = viewsMinInput.value;
    }, 500));
  }
  
  if (viewsMaxInput) {
    viewsMaxInput.addEventListener('input', debounce(() => {
      activeFilters.viewsMax = viewsMaxInput.value;
    }, 500));
  }
  
  // Tag search
  const tagSearchInput = document.getElementById('tag-search-input');
  if (tagSearchInput) {
    tagSearchInput.addEventListener('input', debounce(handleTagSearch, 300));
  }
}

function updateArrayFilter(filterName, value, isChecked) {
  if (isChecked) {
    if (!activeFilters[filterName].includes(value)) {
      activeFilters[filterName].push(value);
    }
  } else {
    activeFilters[filterName] = activeFilters[filterName].filter(item => item !== value);
  }
}

function toggleTagFilter(tag, buttonElement) {
  const isActive = buttonElement.classList.contains('active');
  
  if (isActive) {
    buttonElement.classList.remove('active');
    activeFilters.tags = activeFilters.tags.filter(t => t !== tag);
  } else {
    buttonElement.classList.add('active');
    if (!activeFilters.tags.includes(tag)) {
      activeFilters.tags.push(tag);
    }
  }
}

function handleSearch(e) {
  activeFilters.search = e.target.value.toLowerCase().trim();
  currentPage = 1;
  applyFiltersAndSort();
}

function handleSortChange(e) {
  activeFilters.sort = e.target.value;
  applyFiltersAndSort();
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

function applyFiltersAndSort() {
  let filtered = [...allPosts];
  
  // Apply search filter
  if (activeFilters.search) {
    filtered = filtered.filter(post => 
      post.title.toLowerCase().includes(activeFilters.search) ||
      post.content?.toLowerCase().includes(activeFilters.search) ||
      (post.tags && post.tags.some(tag => tag.toLowerCase().includes(activeFilters.search)))
    );
  }
  
  // Apply AI model filter
  if (activeFilters.aiModel.length > 0) {
    filtered = filtered.filter(post => {
      const modelKey = getModelKey(post.ai_model);
      return activeFilters.aiModel.includes(modelKey);
    });
  }
  
  // Apply content type filter
  if (activeFilters.contentType !== 'all') {
    if (activeFilters.contentType === 'text') {
      filtered = filtered.filter(post => !post.embed_url);
    } else if (activeFilters.contentType === 'embedded') {
      filtered = filtered.filter(post => post.embed_url);
    }
  }
  
  // Apply prompt visibility filter
  if (activeFilters.promptVisibility !== 'all') {
    if (activeFilters.promptVisibility === 'public') {
      filtered = filtered.filter(post => post.prompt_is_public);
    } else if (activeFilters.promptVisibility === 'private') {
      filtered = filtered.filter(post => !post.prompt_is_public);
    }
  }
  
  // Apply date range filter
  if (activeFilters.dateFrom) {
    const fromDate = new Date(activeFilters.dateFrom);
    filtered = filtered.filter(post => new Date(post.created_at) >= fromDate);
  }
  
  if (activeFilters.dateTo) {
    const toDate = new Date(activeFilters.dateTo);
    toDate.setHours(23, 59, 59, 999); // End of day
    filtered = filtered.filter(post => new Date(post.created_at) <= toDate);
  }
  
  // Apply views range filter
  if (activeFilters.viewsMin !== '') {
    const minViews = parseInt(activeFilters.viewsMin) || 0;
    filtered = filtered.filter(post => (post.views || 0) >= minViews);
  }
  
  if (activeFilters.viewsMax !== '') {
    const maxViews = parseInt(activeFilters.viewsMax) || Infinity;
    filtered = filtered.filter(post => (post.views || 0) <= maxViews);
  }
  
  // Apply tags filter
  if (activeFilters.tags.length > 0) {
    filtered = filtered.filter(post => 
      post.tags && activeFilters.tags.some(tag => post.tags.includes(tag))
    );
  }
  
  // Apply sorting
  filtered = sortPosts(filtered, activeFilters.sort);
  
  filteredPosts = filtered;
  currentPage = 1;
  displayPosts();
  updateStats();
}

function sortPosts(posts, sortType) {
  switch (sortType) {
    case 'alphabetical':
      return posts.sort((a, b) => a.title.localeCompare(b.title));
    case 'newest':
      return posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    case 'oldest':
      return posts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    case 'most-viewed':
      return posts.sort((a, b) => (b.views || 0) - (a.views || 0));
    case 'most-favorited':
      return posts.sort((a, b) => (b.favorites_count || 0) - (a.favorites_count || 0));
    default:
      return posts;
  }
}

function getModelKey(aiModel) {
  const model = aiModel?.toLowerCase() || '';
  if (model.includes('gpt') || model.includes('chatgpt')) return 'gpt-4';
  if (model.includes('claude')) return 'claude';
  if (model.includes('gemini') || model.includes('bard')) return 'gemini';
  return 'other';
}

function displayPosts() {
  const container = document.getElementById('posts-container');
  
  if (filteredPosts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#067273" stroke-width="1">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        <h3>No posts found</h3>
        <p>Try adjusting your search criteria or filters to find more content.</p>
        <a href="/publish.html?tab=archive" class="create-post-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14"/>
            <path d="M5 12h14"/>
          </svg>
          Publish Archive Post
        </a>
      </div>
    `;
    return;
  }
  
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const postsToShow = filteredPosts.slice(startIndex, endIndex);
  
  const postsHTML = postsToShow.map(post => createPostCard(post)).join('');
  
  container.innerHTML = `
    <div class="posts-grid">
      ${postsHTML}
    </div>
  `;
  
  displayPagination();
  
  // Add event listeners for favorite buttons
  container.querySelectorAll('.favorite-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFavorite(btn.dataset.postId, btn);
    });
  });
  
  // Add event listeners for action buttons (download or open link)
  container.querySelectorAll('.download-btn, .open-link-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const postId = btn.dataset.postId;
      // Find the post to determine if it has an embed_url
      const post = allPosts.find(p => p.id === postId);
      if (post?.embed_url) {
        // Open link in new tab
        window.open(post.embed_url, '_blank');
        // Record activity
        recordPageVisit({
          type: 'archive',
          title: post.title,
          url: post.embed_url,
          postId: post.id,
          metadata: { action: 'opened_link' }
        });
      } else {
        // Download as text
        downloadPost(postId);
      }
    });
  });
  
  // Add click handlers for post cards
  container.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', () => {
      const postId = card.dataset.postId;
      window.location.href = `/view-post.html?type=archive&id=${postId}`;
    });
  });
}

function createPostCard(post) {
  const authorName = post.users?.raw_user_meta_data?.display_name || 
                    post.users?.raw_user_meta_data?.full_name || 
                    post.users?.email?.split('@')[0] || 
                    'Community Member';
  
  const postDate = new Date(post.created_at).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric'
  });
  
  // Determine if post has embed_url or content
  const hasEmbedUrl = !!post.embed_url;
  const hasContent = !!post.content && post.content.trim() !== '';
  
  // Display content or URL indication
  let contentPreview = '';
  if (hasEmbedUrl) {
    contentPreview = 'This post contains a link to external content.';
  } else if (hasContent) {
    const content = post.content || '';
    contentPreview = content.length > 150 ? content.substring(0, 150) + '...' : content;
  } else {
    contentPreview = 'No content available';
  }
  
  const tagsHTML = post.tags && post.tags.length > 0 ? 
    post.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('') : '';
  
  // Create action button based on content type
  const actionButton = hasEmbedUrl 
    ? `<button class="open-link-btn" data-post-id="${post.id}" title="Open external link">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
           <polyline points="15 3 21 3 21 9"/>
           <line x1="10" y1="14" x2="21" y2="3"/>
         </svg>
       </button>`
    : `<button class="download-btn" data-post-id="${post.id}" title="Download as text file">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
           <polyline points="7,10 12,15 17,10"/>
           <line x1="12" y1="15" x2="12" y2="3"/>
         </svg>
       </button>`;
  
  return `
    <div class="post-card" data-post-id="${post.id}">
      <div class="post-card-header">
        <div class="post-type-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          ${hasEmbedUrl ? 'Link' : 'Archive'}
        </div>
      </div>
      
      <h4 class="post-card-title">${post.title}</h4>
      
      <div class="post-card-meta">
        <span>👤 ${authorName}</span>
        <span>•</span>
        <span>🤖 ${post.ai_model}</span>
        <span>•</span>
        <span>👁️ ${post.views || 0}</span>
        <span>•</span>
        <span>❤️ ${post.favorites_count || 0}</span>
      </div>
      
      <div class="post-card-content">
        ${contentPreview}
      </div>
      
      ${tagsHTML ? `<div class="post-card-tags">${tagsHTML}</div>` : ''}
      
      <div class="post-card-footer">
        <span class="post-card-date">${postDate}</span>
        <div class="post-card-actions">
          <a href="/view-post.html?type=archive&id=${post.id}" class="view-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h6v6"/>
              <path d="M10 14L21 3"/>
              <path d="M21 9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h11"/>
            </svg>
            View
          </a>
          ${actionButton}
          <button class="favorite-btn" data-post-id="${post.id}" title="Add to favorites">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function displayPagination() {
  const container = document.getElementById('pagination-container');
  if (!container) return;
  
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  let paginationHTML = '<div class="pagination">';
  
  // Previous button
  paginationHTML += `
    <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
            onclick="changePage(${currentPage - 1})" 
            ${currentPage === 1 ? 'disabled' : ''}>
      Previous
    </button>
  `;
  
  // Page numbers
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
              onclick="changePage(${i})">
        ${i}
      </button>
    `;
  }
  
  // Next button
  paginationHTML += `
    <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
            onclick="changePage(${currentPage + 1})" 
            ${currentPage === totalPages ? 'disabled' : ''}>
      Next
    </button>
  `;
  
  paginationHTML += '</div>';
  container.innerHTML = paginationHTML;
}

// Make changePage globally available
window.changePage = function(page) {
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  displayPosts();
  
  // Scroll to top of posts
  document.querySelector('.posts-grid')?.scrollIntoView({ behavior: 'smooth' });
};

async function toggleFavorite(postId, buttonElement) {
  if (!currentUser) {
    alert('Please sign in to add favorites.');
    window.location.href = '/login.html';
    return;
  }
  
  try {
    const isFavorited = buttonElement.classList.contains('favorited');
    
    if (isFavorited) {
      // Remove from favorites
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('post_id', postId)
        .eq('post_type', 'archive');
      
      if (error) throw error;
      
      buttonElement.classList.remove('favorited');
      buttonElement.title = 'Add to favorites';
      
    } else {
      // Add to favorites
      const post = allPosts.find(p => p.id === postId);
      if (!post) return;
      
      const { error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: currentUser.id,
          post_id: postId,
          post_type: 'archive',
          post_title: post.title,
          post_data: {
            ai_model: post.ai_model,
            created_at: post.created_at,
            tags: post.tags
          }
        });
      
      if (error) throw error;
      
      buttonElement.classList.add('favorited');
      buttonElement.title = 'Remove from favorites';
    }
    
  } catch (error) {
    console.error('Error toggling favorite:', error);
    alert('Failed to update favorites. Please try again.');
  }
}

function downloadPost(postId) {
  const post = allPosts.find(p => p.id === postId);
  if (!post) return;
  
  // UPDATED: Handle posts with embed_url differently
  if (post.embed_url) {
    // Open the URL in a new tab instead of downloading
    window.open(post.embed_url, '_blank');
    
    // Record the action
    recordPageVisit({
      type: 'archive',
      title: post.title,
      url: post.embed_url,
      postId: post.id,
      metadata: { action: 'opened_link' }
    });
    
    return;
  }
  
  // Continue with the download functionality for posts with content
  let content = `Title: ${post.title}\n`;
  content += `AI Model: ${post.ai_model}\n`;
  content += `Created: ${new Date(post.created_at).toLocaleDateString()}\n`;
  if (post.tags && post.tags.length > 0) {
    content += `Tags: ${post.tags.join(', ')}\n`;
  }
  content += '\n--- Content ---\n\n';
  
  content += post.content || 'No content available';
  
  if (post.prompt_is_public && post.prompt) {
    content += '\n\n--- Original Prompt ---\n\n';
    content += post.prompt;
  }
  
  // Create and download file
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${post.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  // Record download
  recordPageVisit({
    type: 'archive',
    title: post.title,
    url: window.location.href,
    postId: post.id,
    metadata: { action: 'downloaded' }
  });
}

function clearAllFilters() {
  // Reset filter state
  activeFilters = {
    search: '',
    sort: 'alphabetical',
    aiModel: [],
    contentType: 'all',
    promptVisibility: 'all',
    dateFrom: '',
    dateTo: '',
    viewsMin: '',
    viewsMax: '',
    tags: []
  };
  
  // Reset form inputs
  document.getElementById('search-input').value = '';
  document.getElementById('sort-filter').value = 'alphabetical';
  
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
  
  // Reset date and number inputs
  document.querySelectorAll('input[type="date"], input[type="number"]').forEach(input => {
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
  applyFiltersAndSort();
}

function updateStats() {
  const statsElement = document.getElementById('browse-stats');
  if (statsElement) {
    const totalPosts = allPosts.length;
    const filteredCount = filteredPosts.length;
    
    if (filteredCount === totalPosts) {
      statsElement.innerHTML = `<p>Showing all ${totalPosts} archive posts</p>`;
    } else {
      statsElement.innerHTML = `<p>Showing ${filteredCount} of ${totalPosts} archive posts</p>`;
    }
  }
}

function showLoading() {
  const container = document.getElementById('posts-container');
  if (container) {
    container.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading archive posts...</p>
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