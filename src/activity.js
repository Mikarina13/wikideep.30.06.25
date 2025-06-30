import { initMenu } from './utils/menu.js';
import { recordPageVisit, getPageTitle, getPageTypeFromUrl, getFilteredActivity, clearActivityLog, getActivityStats } from './utils/activityTracker.js';

let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the menu
  initMenu();
  
  // Record page visit
  recordPageVisit({
    type: getPageTypeFromUrl(window.location.href),
    title: getPageTitle(),
    url: window.location.href
  });
  
  // Setup event listeners
  setupEventListeners();
  
  // Load and display activity
  loadActivity();
  
  // Update stats
  updateActivityStats();
});

function setupEventListeners() {
  // Close button
  const closeBtn = document.getElementById('activity-close-btn');
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
      loadActivity();
    });
  });
  
  // Clear activity button
  const clearBtn = document.getElementById('clear-activity-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', handleClearActivity);
  }
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

function loadActivity() {
  const activityFeed = document.getElementById('activity-feed');
  if (!activityFeed) return;
  
  const activities = getFilteredActivity(currentFilter);
  
  if (activities.length === 0) {
    activityFeed.innerHTML = `
      <div class="empty-state">
        <p>No ${currentFilter === 'all' ? '' : currentFilter + ' '}activity found</p>
      </div>
    `;
    return;
  }
  
  const activityHTML = activities.map(activity => {
    const timeAgo = getTimeAgo(activity.timestamp);
    const typeIcon = getActivityTypeIcon(activity.type);
    
    return `
      <div class="activity-item" onclick="navigateToActivity('${activity.url}')">
        <div class="activity-item-header">
          <div class="activity-type-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${typeIcon}
            </svg>
            ${activity.type.toUpperCase()}
          </div>
          <div class="activity-time">${timeAgo}</div>
        </div>
        <div class="activity-title">${activity.title}</div>
        ${activity.url ? `<div class="activity-url">${activity.url}</div>` : ''}
      </div>
    `;
  }).join('');
  
  activityFeed.innerHTML = activityHTML;
}

function updateActivityStats() {
  const statsElement = document.getElementById('activity-stats');
  if (!statsElement) return;
  
  const stats = getActivityStats();
  const filteredCount = getFilteredActivity(currentFilter).length;
  
  statsElement.innerHTML = `
    Showing ${filteredCount} ${currentFilter === 'all' ? '' : currentFilter + ' '}activities
    (${stats.total} total, ${stats.today} today)
  `;
}

function handleClearActivity() {
  if (confirm('Are you sure you want to clear all activity? This action cannot be undone.')) {
    clearActivityLog();
    loadActivity();
    updateActivityStats();
    showNotification('Activity log cleared successfully!', 'success');
  }
}

function navigateToActivity(url) {
  if (url && url !== window.location.href) {
    window.location.href = url;
  }
}

function getActivityTypeIcon(type) {
  const icons = {
    page: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>',
    archive: '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>',
    collab: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>'
  };
  return icons[type] || icons.page;
}

function getTimeAgo(timestamp) {
  const now = new Date();
  const activityTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return activityTime.toLocaleDateString();
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

// Make navigateToActivity globally available
window.navigateToActivity = navigateToActivity;