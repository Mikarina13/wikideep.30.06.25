import { createClient } from '@supabase/supabase-js';
import { initMenu } from './utils/menu.js';
import { recordPageVisit, getPageTitle, getPageTypeFromUrl } from './utils/activityTracker.js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

let currentUser = null;
let notifications = [];
let notificationCount = { total: 0, unread: 0 };

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
    showLoginMessage();
    return;
  }
  
  // Setup event listeners
  setupEventListeners();
  
  // Load notifications
  await loadNotifications();
});

function setupEventListeners() {
  // Close button
  const closeBtn = document.getElementById('notifications-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      window.history.back();
    });
  }
  
  // Mark all as read button
  const markAllReadBtn = document.getElementById('mark-all-read-btn');
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', handleMarkAllRead);
  }
  
  // Clear all notifications button
  const clearAllBtn = document.getElementById('clear-notifications-btn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', handleClearAll);
  }
}

async function loadNotifications() {
  if (!currentUser) return;
  
  try {
    // Show loading state
    showLoading();
    
    // Get notifications for current user
    const { data, error } = await supabase
      .from('user_notifications')
      .select(`
        *,
        sender:sender_id (
          email,
          raw_user_meta_data
        )
      `)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    notifications = data || [];
    notificationCount = {
      total: notifications.length,
      unread: notifications.filter(n => !n.is_read).length
    };
    
    // Display notifications
    displayNotifications();
    updateStats();
    
  } catch (error) {
    console.error('Error loading notifications:', error);
    showError('Failed to load notifications. Please try again.');
  }
}

function displayNotifications() {
  const container = document.getElementById('notifications-content');
  if (!container) return;
  
  if (notifications.length === 0) {
    container.innerHTML = `
      <div class="empty-notifications">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <h3>No Notifications</h3>
        <p>You don't have any notifications at the moment.</p>
        <a href="/settings.html#notification-preferences" class="empty-notifications-btn">
          Notification Settings
        </a>
      </div>
    `;
    return;
  }
  
  const notificationsList = document.createElement('div');
  notificationsList.className = 'notification-list';
  
  notifications.forEach(notification => {
    const notificationElement = createNotificationItem(notification);
    notificationsList.appendChild(notificationElement);
  });
  
  container.innerHTML = '';
  container.appendChild(notificationsList);
}

function createNotificationItem(notification) {
  const isUnread = !notification.is_read;
  const timeAgo = getTimeAgo(notification.created_at);
  
  const item = document.createElement('div');
  item.className = `notification-item ${isUnread ? 'unread' : ''}`;
  item.dataset.id = notification.id;
  
  // Determine icon based on notification type
  const iconSvg = getNotificationIcon(notification.type);
  
  item.innerHTML = `
    <div class="notification-icon ${notification.type}">
      ${iconSvg}
    </div>
    <div class="notification-content">
      <div class="notification-message">${notification.content}</div>
      <div class="notification-time">${timeAgo}</div>
    </div>
    <div class="notification-actions">
      ${isUnread ? `
        <button class="mark-read-btn" title="Mark as read">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 11 12 14 22 4"></polyline>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        </button>
      ` : ''}
      <button class="delete-notification-btn" title="Delete notification">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3,6 5,6 21,6"/>
          <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
        </svg>
      </button>
    </div>
  `;
  
  // Add click event to navigate to related content
  item.addEventListener('click', (e) => {
    // Don't navigate if clicking on buttons
    if (e.target.closest('.mark-read-btn') || e.target.closest('.delete-notification-btn')) {
      return;
    }
    
    // Mark as read first
    if (isUnread) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type and data
    navigateToNotificationTarget(notification);
  });
  
  // Add mark as read button event
  const markReadBtn = item.querySelector('.mark-read-btn');
  if (markReadBtn) {
    markReadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      markAsRead(notification.id);
    });
  }
  
  // Add delete button event
  const deleteBtn = item.querySelector('.delete-notification-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNotification(notification.id);
    });
  }
  
  return item;
}

function getNotificationIcon(type) {
  switch (type) {
    case 'new_post':
      return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
        </svg>
      `;
    case 'new_follower':
      return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/>
          <line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
      `;
    case 'comment':
      return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      `;
    default:
      return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      `;
  }
}

function navigateToNotificationTarget(notification) {
  switch (notification.type) {
    case 'new_post':
      if (notification.post_id && notification.post_type) {
        window.location.href = `/view-post.html?type=${notification.post_type}&id=${notification.post_id}`;
      }
      break;
    
    case 'new_follower':
      if (notification.sender_id) {
        window.location.href = `/public-profile.html?id=${notification.sender_id}`;
      }
      break;
    
    case 'comment':
      if (notification.post_id && notification.post_type) {
        window.location.href = `/view-post.html?type=${notification.post_type}&id=${notification.post_id}#comments`;
      }
      break;
      
    default:
      // For other notification types, no navigation
      break;
  }
}

async function markAsRead(notificationId) {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', currentUser.id);
    
    if (error) throw error;
    
    // Update local notification data
    const index = notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      notifications[index].is_read = true;
      
      // Update DOM
      const notificationElement = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
      if (notificationElement) {
        notificationElement.classList.remove('unread');
        const markReadBtn = notificationElement.querySelector('.mark-read-btn');
        if (markReadBtn) markReadBtn.remove();
      }
      
      // Update counts
      notificationCount.unread = Math.max(0, notificationCount.unread - 1);
      updateStats();
    }
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    showNotification('Failed to mark notification as read.', 'error');
  }
}

async function deleteNotification(notificationId) {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', currentUser.id);
    
    if (error) throw error;
    
    // Remove from local array
    const index = notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      const wasUnread = !notifications[index].is_read;
      notifications.splice(index, 1);
      
      // Update DOM
      const notificationElement = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
      if (notificationElement) {
        notificationElement.style.height = '0';
        notificationElement.style.opacity = '0';
        notificationElement.style.marginBottom = '0';
        notificationElement.style.overflow = 'hidden';
        
        setTimeout(() => {
          notificationElement.remove();
          
          // Show empty state if no notifications left
          if (notifications.length === 0) {
            const container = document.getElementById('notifications-content');
            if (container) {
              container.innerHTML = createEmptyState();
            }
          }
        }, 300);
      }
      
      // Update counts
      notificationCount.total--;
      if (wasUnread) notificationCount.unread = Math.max(0, notificationCount.unread - 1);
      updateStats();
    }
    
  } catch (error) {
    console.error('Error deleting notification:', error);
    showNotification('Failed to delete notification.', 'error');
  }
}

async function handleMarkAllRead() {
  try {
    // Call the stored procedure to mark all as read
    const { error } = await supabase.rpc('mark_all_notifications_as_read');
    
    if (error) throw error;
    
    // Update local data
    notifications.forEach(notification => {
      notification.is_read = true;
    });
    
    notificationCount.unread = 0;
    
    // Update UI
    displayNotifications();
    updateStats();
    
    showNotification('All notifications marked as read.', 'success');
    
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    showNotification('Failed to mark all notifications as read.', 'error');
  }
}

async function handleClearAll() {
  if (!confirm('Are you sure you want to delete all notifications? This cannot be undone.')) {
    return;
  }
  
  try {
    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('user_id', currentUser.id);
    
    if (error) throw error;
    
    // Clear local data
    notifications = [];
    notificationCount = { total: 0, unread: 0 };
    
    // Update UI
    displayNotifications();
    updateStats();
    
    showNotification('All notifications cleared.', 'success');
    
  } catch (error) {
    console.error('Error clearing notifications:', error);
    showNotification('Failed to clear notifications.', 'error');
  }
}

function updateStats() {
  const statsElement = document.getElementById('notifications-stats');
  if (statsElement) {
    statsElement.textContent = `${notificationCount.total} total, ${notificationCount.unread} unread`;
  }
}

function getTimeAgo(timestamp) {
  const now = new Date();
  const notificationTime = new Date(timestamp);
  const diffInSeconds = Math.floor((now - notificationTime) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }
  
  // For older notifications, show the date
  return notificationTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function createEmptyState() {
  return `
    <div class="empty-notifications">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      <h3>No Notifications</h3>
      <p>You don't have any notifications at the moment.</p>
      <a href="/settings.html#notification-preferences" class="empty-notifications-btn">
        Notification Settings
      </a>
    </div>
  `;
}

function showLoginMessage() {
  const container = document.getElementById('notifications-content');
  if (container) {
    container.innerHTML = `
      <div class="empty-notifications">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/>
          <line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        <h3>Sign In Required</h3>
        <p>Please sign in to view your notifications.</p>
        <a href="/login.html?returnTo=${encodeURIComponent(window.location.href)}" class="empty-notifications-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          Sign In
        </a>
      </div>
    `;
    
    // Hide controls
    const controls = document.querySelector('.notifications-controls');
    if (controls) {
      controls.style.display = 'none';
    }
  }
}

function showLoading() {
  const container = document.getElementById('notifications-content');
  if (container) {
    container.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading notifications...</p>
      </div>
    `;
  }
}

function showError(message) {
  const container = document.getElementById('notifications-content');
  if (container) {
    container.innerHTML = `
      <div class="error-state">
        <h3>Error Loading Notifications</h3>
        <p>${message}</p>
        <button class="retry-button" onclick="window.location.reload()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 4v6h6"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
          Retry
        </button>
      </div>
    `;
  }
}

function showNotification(message, type = 'info') {
  // Check if a notification already exists and remove it
  const existingNotification = document.querySelector('.toast-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = `toast-notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#dc3545' : '#067273'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 100);

  // Remove notification
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}