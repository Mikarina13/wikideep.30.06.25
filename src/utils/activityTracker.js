/**
 * Activity Tracker Utility
 * Manages user activity tracking in localStorage
 */

const ACTIVITY_STORAGE_KEY = 'wikideep_activity_log';
const MAX_ACTIVITY_ITEMS = 100; // Limit to prevent localStorage bloat

/**
 * Record a page visit
 * @param {Object} options - Visit details
 * @param {string} options.type - Type of activity ('page', 'archive', 'collab')
 * @param {string} options.title - Page/post title
 * @param {string} options.url - Current URL
 * @param {string} [options.postId] - Post ID for archive/collab posts
 * @param {Object} [options.metadata] - Additional metadata
 */
export function recordPageVisit({ type, title, url, postId = null, metadata = {} }) {
  try {
    const activity = getActivityLog();
    
    // Create activity entry
    const entry = {
      id: generateId(),
      type,
      title,
      url,
      postId,
      metadata,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      viewed: false // Mark as unread by default
    };
    
    // Remove duplicate entries (same URL within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const filteredActivity = activity.filter(item => {
      if (item.url === url) {
        const itemTime = new Date(item.timestamp);
        return itemTime < fiveMinutesAgo;
      }
      return true;
    });
    
    // Add new entry at the beginning
    filteredActivity.unshift(entry);
    
    // Limit the number of stored items
    const limitedActivity = filteredActivity.slice(0, MAX_ACTIVITY_ITEMS);
    
    // Save to localStorage
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(limitedActivity));
    
  } catch (error) {
    console.error('Error recording activity:', error);
  }
}

/**
 * Get all activity log entries
 * @returns {Array} Array of activity entries
 */
export function getActivityLog() {
  try {
    const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading activity log:', error);
    // If there's a parse error, clear the corrupted data
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    return [];
  }
}

/**
 * Get filtered activity entries
 * @param {string} filter - Filter type ('all', 'archive', 'collab')
 * @returns {Array} Filtered activity entries
 */
export function getFilteredActivity(filter = 'all') {
  const activity = getActivityLog();
  
  if (filter === 'all') {
    return activity;
  }
  
  return activity.filter(entry => entry.type === filter);
}

/**
 * Clear all activity log entries
 */
export function clearActivityLog() {
  try {
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing activity log:', error);
  }
}

/**
 * Get activity statistics
 * @returns {Object} Statistics about user activity
 */
export function getActivityStats() {
  const activity = getActivityLog();
  
  const stats = {
    total: activity.length,
    today: 0,
    thisWeek: 0,
    unread: 0,
    byType: {
      archive: 0,
      collab: 0,
      page: 0
    }
  };
  
  const today = new Date().toDateString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  activity.forEach(entry => {
    const entryDate = new Date(entry.timestamp);
    
    // Count by type
    const type = entry.type || 'page';
    stats.byType[type] = (stats.byType[type] || 0) + 1;
    
    // Count today's activities
    if (entryDate.toDateString() === today) {
      stats.today++;
    }
    
    // Count this week's activities
    if (entryDate >= weekAgo) {
      stats.thisWeek++;
    }
    
    // Count unread activities
    if (entry.viewed === false) {
      stats.unread++;
    }
  });
  
  return stats;
}

/**
 * Mark activity as viewed/read
 * @param {string} activityId - ID of the activity to mark
 * @returns {boolean} Success status
 */
export function markActivityAsViewed(activityId) {
  try {
    const activity = getActivityLog();
    const index = activity.findIndex(item => item.id === activityId);
    
    if (index !== -1) {
      activity[index].viewed = true;
      localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activity));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error marking activity as viewed:', error);
    return false;
  }
}

/**
 * Mark all activities as viewed/read
 * @returns {boolean} Success status
 */
export function markAllActivitiesAsViewed() {
  try {
    const activity = getActivityLog();
    const updatedActivity = activity.map(item => ({ ...item, viewed: true }));
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(updatedActivity));
    return true;
  } catch (error) {
    console.error('Error marking all activities as viewed:', error);
    return false;
  }
}

/**
 * Generate a unique ID for activity entries
 * @returns {string} Unique identifier
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Get page type from URL
 * @param {string} url - Current URL
 * @returns {string} Page type
 */
export function getPageTypeFromUrl(url) {
  const path = new URL(url).pathname;
  
  if (path.includes('view-post.html')) {
    const params = new URLSearchParams(new URL(url).search);
    return params.get('type') || 'archive';
  }
  
  if (path.includes('browse-archive.html') || path === '/' || path === '/index.html') {
    return 'archive';
  }
  
  if (path.includes('browse-collab.html') || path.includes('collab.html')) {
    return 'collab';
  }
  
  if (path.includes('forum.html')) {
    return 'forum';
  }
  
  return 'page';
}

/**
 * Get page title from document or URL
 * @returns {string} Page title
 */
export function getPageTitle() {
  // Try to get title from document
  if (document.title && document.title !== 'WikiDeep.io') {
    return document.title.replace(' - WikiDeep.io', '');
  }
  
  // Fallback to URL-based title
  const path = window.location.pathname;
  const pathMap = {
    '/': 'Home',
    '/index.html': 'Archive',
    '/collab.html': 'Collaboration',
    '/browse-archive.html': 'Browse Archive',
    '/browse-collab.html': 'Browse Collaborations',
    '/publish.html': 'Publish Content',
    '/profile.html': 'My Profile',
    '/settings.html': 'Settings',
    '/favorites.html': 'Favorites',
    '/activity.html': 'Activity',
    '/help.html': 'Help',
    '/contact.html': 'Contact Us',
    '/support.html': 'Support WikiDeep.io',
    '/info-hub.html': 'Info Hub',
    '/login.html': 'Login',
    '/reset-password.html': 'Reset Password',
    '/forum.html': 'Forum',
    '/admin-panel.html': 'Admin Panel',
    '/notifications.html': 'Notifications',
    '/accept-terms.html': 'Accept Terms'
  };
  
  return pathMap[path] || 'WikiDeep.io';
}

/**
 * Search activity log by keyword
 * @param {string} query - Search query
 * @returns {Array} Matching activity entries
 */
export function searchActivity(query) {
  if (!query || query.trim() === '') {
    return getActivityLog();
  }
  
  const queryLower = query.toLowerCase().trim();
  const activity = getActivityLog();
  
  return activity.filter(entry => {
    return (entry.title && entry.title.toLowerCase().includes(queryLower)) || 
           (entry.url && entry.url.toLowerCase().includes(queryLower)) || 
           (entry.type && entry.type.toLowerCase().includes(queryLower));
  });
}