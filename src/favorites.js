import { createClient } from '@supabase/supabase-js';
import { initMenu } from './utils/menu.js';
import { recordPageVisit, getPageTitle, getPageTypeFromUrl } from './utils/activityTracker.js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

let currentUser = null;
let favorites = [];
let currentFilter = 'all';

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
  
  if (!currentUser) {
    // Show message to sign in
    showSignInMessage();
    return;
  }
  
  // Setup event listeners
  setupEventListeners();
  
  // Load user favorites
  await loadFavorites();
});

function setupEventListeners() {
  // Close button
  const closeBtn = document.getElementById('favorites-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.history.back();
    });
  }
  
  // Filter buttons
  const filterButtons = document.querySelectorAll('.filter-button');
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      setActiveFilter(filter);
      displayFavorites();
    });
  });
}

function setActiveFilter(filter) {
  currentFilter = filter;
  
  // Update button states
  const filterButtons = document.querySelectorAll('.filter-button');
  filterButtons.forEach(button => {
    if (button.dataset.filter === filter) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

async function loadFavorites() {
  if (!currentUser) return;
  
  try {
    const { data: userFavorites, error } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    favorites = userFavorites || [];
    displayFavorites();
    
  } catch (error) {
    console.error('Error loading favorites:', error);
    showError('Failed to load favorites');
  }
}

function displayFavorites() {
  const favoritesContent = document.getElementById('favorites-content');
  if (!favoritesContent) return;
  
  // Filter favorites based on current filter
  let filteredFavorites = favorites;
  if (currentFilter !== 'all') {
    filteredFavorites = favorites.filter(fav => fav.post_type === currentFilter);
  }
  
  if (filteredFavorites.length === 0) {
    showEmptyState();
    return;
  }
  
  const favoritesHTML = `
    <div class="favorites-grid">
      ${filteredFavorites.map(favorite => createFavoriteCard(favorite)).join('')}
    </div>
  `;
  
  favoritesContent.innerHTML = favoritesHTML;
  
  // Add event listeners for remove buttons
  favoritesContent.querySelectorAll('.remove-favorite').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      removeFavorite(btn.dataset.favoriteId);
    });
  });
  
  // Add click handlers for favorite cards
  favoritesContent.querySelectorAll('.favorite-item').forEach(card => {
    card.addEventListener('click', () => {
      const postId = card.dataset.postId;
      const postType = card.dataset.postType;
      window.location.href = `/view-post.html?type=${postType}&id=${postId}`;
    });
  });
}

function createFavoriteCard(favorite) {
  const favoriteDate = new Date(favorite.created_at).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  
  const typeIcon = favorite.post_type === 'archive' ? 
    '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>' :
    '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>';
  
  const description = favorite.post_data?.description || 
                     (favorite.post_data?.content ? favorite.post_data.content.substring(0, 150) + '...' : '');
  
  const tags = favorite.post_data?.tags || [];
  const tagsHTML = tags.length > 0 ? 
    tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('') : '';
  
  return `
    <div class="favorite-item" data-type="${favorite.post_type}" data-post-id="${favorite.post_id}" data-post-type="${favorite.post_type}">
      <div class="favorite-header">
        <div class="favorite-type">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${typeIcon}
          </svg>
          ${favorite.post_type.toUpperCase()} Post
        </div>
        <button class="remove-favorite" data-favorite-id="${favorite.id}" title="Remove from favorites">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <h4>${favorite.post_title}</h4>
      <div class="favorite-meta">
        <span>📅 Saved ${favoriteDate}</span>
        ${favorite.post_data?.ai_model ? `<span>• 🤖 AI Model: ${favorite.post_data.ai_model}</span>` : ''}
      </div>
      ${description ? `<div class="favorite-description">${description}</div>` : ''}
      ${tagsHTML ? `<div class="favorite-tags">${tagsHTML}</div>` : ''}
      <div class="favorite-actions">
        <a href="/view-post.html?type=${favorite.post_type}&id=${favorite.post_id}" class="view-favorite-btn" onclick="event.stopPropagation()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h6v6"/>
            <path d="M10 14L21 3"/>
            <path d="M21 9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h11"/>
          </svg>
          View Post
        </a>
        <span class="favorite-date">Added on ${favoriteDate}</span>
      </div>
    </div>
  `;
}

async function removeFavorite(favoriteId) {
  if (!currentUser) return;
  
  if (!confirm('Are you sure you want to remove this from your favorites?')) {
    return;
  }
  
  try {
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('id', favoriteId)
      .eq('user_id', currentUser.id);
    
    if (error) throw error;
    
    // Remove from local array
    favorites = favorites.filter(fav => fav.id !== favoriteId);
    
    // Refresh display
    displayFavorites();
    
    showNotification('Removed from favorites', 'success');
    
  } catch (error) {
    console.error('Error removing favorite:', error);
    showNotification('Failed to remove favorite', 'error');
  }
}

function showSignInMessage() {
  const favoritesContent = document.getElementById('favorites-content');
  if (favoritesContent) {
    favoritesContent.innerHTML = `
      <div class="empty-favorites">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#067273" stroke-width="1">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <h3>Sign in to view favorites</h3>
        <p>Please sign in to your account to view and manage your favorite posts.</p>
        <a href="/login.html?returnTo=${encodeURIComponent(window.location.href)}" class="browse-content-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          Sign In
        </a>
      </div>
    `;
  }
}

function showEmptyState() {
  const favoritesContent = document.getElementById('favorites-content');
  if (favoritesContent) {
    const filterText = currentFilter === 'all' ? '' : ` ${currentFilter}`;
    favoritesContent.innerHTML = `
      <div class="empty-favorites">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#067273" stroke-width="1">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <h3>No${filterText} favorites yet</h3>
        <p>Start adding posts to your favorites by clicking the heart icon on archive and collab posts you find interesting.</p>
        <a href="/index.html" class="browse-content-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          Browse Archive
        </a>
      </div>
    `;
  }
}

function showError(message) {
  const favoritesContent = document.getElementById('favorites-content');
  if (favoritesContent) {
    favoritesContent.innerHTML = `
      <div class="empty-favorites">
        <h3>Error Loading Favorites</h3>
        <p>${message}</p>
        <button onclick="window.location.reload()" class="browse-content-btn">
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