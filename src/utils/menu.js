import supabase from './supabaseClient';
import { getFilteredActivity, getActivityStats } from './activityTracker.js';

export async function initMenu() {
  // Select existing menu elements
  const menuLogo = document.querySelector('.menu-logo');
  let menuOptions = document.querySelector('.menu-options');
  let menuOverlay = document.querySelector('.menu-overlay');
  
  // Create menu overlay if it doesn't exist
  if (!menuOverlay) {
    menuOverlay = document.createElement('div');
    menuOverlay.className = 'menu-overlay';
    document.body.appendChild(menuOverlay);
  }
  
  // Check if menu container exists; if not, create it
  if (!menuOptions) {
    menuOptions = document.createElement('div');
    menuOptions.className = 'menu-options';
    document.body.appendChild(menuOptions);
  }
  
  // Get authentication status
  const { data: { session } } = await supabase.auth.getSession();
  
  // Track if menu is locked open (clicked open)
  let isMenuLockedOpen = false;
  
  // Helper functions for opening and closing the menu
  function openMenu() {
    menuOptions.classList.add('active');
    menuOverlay.classList.add('active');
  }

  function closeMenu() {
    menuOptions.classList.remove('active');
    menuOverlay.classList.remove('active');
  }
  
  // Function to animate the menu icon
  function animateMenuIcon() {
    menuLogo.classList.add('spinning');
    menuLogo.addEventListener('animationend', () => {
      menuLogo.classList.remove('spinning');
    }, { once: true });
  }

  // Function to load and display recent activity in menu
  function loadMenuActivity() {
    const activityList = document.getElementById('menu-activity-list');
    if (!activityList) return;
    
    const recentActivities = getFilteredActivity('all').slice(0, 5); // Show last 5 activities
    
    if (recentActivities.length === 0) {
      activityList.innerHTML = '<div class="empty-state">No recent activity</div>';
      return;
    }
    
    const activityHTML = recentActivities.map(activity => {
      const timeAgo = getTimeAgo(activity.timestamp);
      const typeIcon = getActivityTypeIcon(activity.type);
      
      return `
        <div class="menu-activity-item" data-url="${activity.url}">
          <div class="activity-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${typeIcon}
            </svg>
          </div>
          <div class="activity-content">
            <div class="activity-title">${truncateText(activity.title, 30)}</div>
            <div class="activity-time">${timeAgo}</div>
          </div>
        </div>
      `;
    }).join('');
    
    activityList.innerHTML = activityHTML;
    
    // Add click handlers to activity items
    activityList.querySelectorAll('.menu-activity-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.dataset.url;
        if (url && url !== window.location.href) {
          window.location.href = url;
        }
      });
    });
  }
  
  // Helper function to get activity type icon
  function getActivityTypeIcon(type) {
    const icons = {
      page: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>',
      archive: '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>',
      collab: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>'
    };
    return icons[type] || icons.page;
  }
  
  // Helper function to get time ago string
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
  
  // Helper function to truncate text
  function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Function to load and display unread notifications count
  async function loadUnreadNotificationsCount() {
    if (!session) return;
    
    try {
      // Get count of unread notifications
      const { count, error } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);
      
      if (error) throw error;
      
      // Update notification badge
      updateNotificationBadge(count || 0);
      
    } catch (error) {
      console.error('Error loading unread notifications count:', error);
    }
  }

  // Function to update the notification badge in the menu
  function updateNotificationBadge(count) {
    // Find or create notification badge container
    let notificationLink = menuOptions.querySelector('.notification-link');
    
    if (!notificationLink) {
      // Create notification link if it doesn't exist
      notificationLink = document.createElement('a');
      notificationLink.className = 'menu-footer-item notification-link';
      notificationLink.href = '/notifications.html';
      notificationLink.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        Notifications
        <span class="notification-badge" style="display: none;">0</span>
      `;
      
      // Insert before the help link or as last item if not found
      const helpLink = menuOptions.querySelector('.menu-footer-item[href="/help.html"]');
      if (helpLink) {
        helpLink.parentNode.insertBefore(notificationLink, helpLink);
      } else {
        const menuFooter = menuOptions.querySelector('.menu-footer');
        if (menuFooter) {
          menuFooter.appendChild(notificationLink);
        }
      }
    }
    
    // Update badge
    const badge = notificationLink.querySelector('.notification-badge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'inline-flex';
        // Add pulsing animation
        badge.classList.add('pulse');
      } else {
        badge.style.display = 'none';
        badge.classList.remove('pulse');
      }
    }
  }

  // Add styles for notification badge if not already present
  if (!document.getElementById('notification-badge-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-badge-styles';
    style.textContent = `
      .notification-badge {
        background: #dc3545;
        color: white;
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 10px;
        position: absolute;
        top: -3px;
        right: -5px;
        min-width: 16px;
        height: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }
      
      .menu-footer-item {
        position: relative;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      
      .pulse {
        animation: pulse 2s infinite;
      }
    `;
    document.head.appendChild(style);
  }

  // Generate common menu elements if they don't exist
  if (!menuOptions.querySelector('.auth-section')) {
    // Create auth section (top part)
    const menuTop = document.createElement('div');
    menuTop.className = 'menu-top';
    
    const authSection = document.createElement('div');
    authSection.className = 'auth-section';
    authSection.innerHTML = `
      <a href="/login.html" class="sign-in" ${session ? 'style="display: none;"' : ''}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/>
          <line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        Sign in
      </a>
      <a href="/login.html?tab=signup" class="sign-up" ${session ? 'style="display: none;"' : ''}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/>
          <line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
        Sign up
      </a>
      <a href="#" class="logout" ${!session ? 'style="display: none;"' : ''}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Logout
      </a>
    `;
    
    menuTop.appendChild(authSection);
    
    // Check if we already have menu content (like info-nav in info-hub.html)
    const existingChildren = Array.from(menuOptions.children);
    
    if (existingChildren.length > 0) {
      // Insert at the beginning
      menuOptions.insertBefore(menuTop, existingChildren[0]);
    } else {
      menuOptions.appendChild(menuTop);
      
      // Add recent activity section (replacing recent searches)
      const recentActivity = document.createElement('div');
      recentActivity.className = 'recent-activity';
      recentActivity.innerHTML = `
        <h3>Recent Activity</h3>
        <div id="menu-activity-list" class="activity-list">
          <div class="empty-state">No recent activity</div>
        </div>
        <button class="show-more" id="menu-show-more-activity">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          View All Activity
        </button>
      `;
      
      // Add menu footer
      const menuFooter = document.createElement('div');
      menuFooter.className = 'menu-footer';
      menuFooter.innerHTML = `
        <a href="/profile.html" class="menu-footer-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
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
        <a href="/notifications.html" class="menu-footer-item notification-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          Notifications
          <span class="notification-badge" style="display: none;">0</span>
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
        <a href="/" class="menu-footer-item return-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19 12H5M5 12L12 19M5 12L12 5"/>
          </svg>
          Return to Home
        </a>
      `;
      
      menuOptions.appendChild(recentActivity);
      menuOptions.appendChild(menuFooter);
    }
  } else {
    // Update auth section visibility based on session
    const signInLink = menuOptions.querySelector('.sign-in');
    const signUpLink = menuOptions.querySelector('.sign-up');
    const logoutLink = menuOptions.querySelector('.logout');
    
    if (session) {
      if (signInLink) signInLink.style.display = 'none';
      if (signUpLink) signUpLink.style.display = 'none';
      if (logoutLink) logoutLink.style.display = 'flex';
    } else {
      if (signInLink) signInLink.style.display = 'flex';
      if (signUpLink) signUpLink.style.display = 'flex';
      if (logoutLink) logoutLink.style.display = 'none';
    }
  }

  // Add notification link if it doesn't exist
  if (session && !menuOptions.querySelector('.notification-link')) {
    // Find the menu footer
    const menuFooter = menuOptions.querySelector('.menu-footer');
    if (menuFooter) {
      // Create notification link
      const notificationLink = document.createElement('a');
      notificationLink.className = 'menu-footer-item notification-link';
      notificationLink.href = '/notifications.html';
      notificationLink.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        Notifications
        <span class="notification-badge" style="display: none;">0</span>
      `;
      
      // Insert after activity link or before settings link
      const activityLink = menuFooter.querySelector('a[href="/activity.html"]');
      const settingsLink = menuFooter.querySelector('a[href="/settings.html"]');
      
      if (activityLink) {
        activityLink.after(notificationLink);
      } else if (settingsLink) {
        menuFooter.insertBefore(notificationLink, settingsLink);
      } else {
        menuFooter.appendChild(notificationLink);
      }
    }
  }

  // Remove any existing "recent-searches" sections and replace with activity
  const existingRecentSearches = menuOptions.querySelector('.recent-searches');
  if (existingRecentSearches) {
    existingRecentSearches.remove();
  }

  // Add recent activity section if it doesn't exist and this isn't the info-hub page
  if (!menuOptions.querySelector('.recent-activity') && !document.querySelector('.info-nav')) {
    const recentActivity = document.createElement('div');
    recentActivity.className = 'recent-activity';
    recentActivity.innerHTML = `
      <h3>Recent Activity</h3>
      <div id="menu-activity-list" class="activity-list">
        <div class="empty-state">No recent activity</div>
      </div>
      <button class="show-more" id="menu-show-more-activity">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        View All Activity
      </button>
    `;
    
    // Insert activity section in the middle of the menu (after auth section, before footer)
    const menuFooter = menuOptions.querySelector('.menu-footer');
    if (menuFooter) {
      menuOptions.insertBefore(recentActivity, menuFooter);
    } else {
      menuOptions.appendChild(recentActivity);
    }
  }

  // Load and display recent activity
  if (document.querySelector('.recent-activity')) {
    loadMenuActivity();
    
    // Add click handler for "View All Activity" button
    const showMoreBtn = document.getElementById('menu-show-more-activity');
    if (showMoreBtn) {
      showMoreBtn.addEventListener('click', () => {
        window.location.href = '/activity.html';
      });
    }
  }

  // Load notification count for badge
  if (session) {
    loadUnreadNotificationsCount();
    
    // Set up real-time subscription to notifications
    const notificationSubscription = supabase
      .channel('public:user_notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${session.user.id}`
      }, () => {
        // When notifications change, refresh the count
        loadUnreadNotificationsCount();
      })
      .subscribe();
  }

  // Menu toggle functionality - now with locking
  menuLogo.addEventListener('click', () => {
    // Always animate the icon, regardless of whether opening or closing
    animateMenuIcon();
    
    if (menuOptions.classList.contains('active')) {
      // If already open, set isMenuLockedOpen to false and then close
      isMenuLockedOpen = false;
      closeMenu();
    } else {
      // If closed, open it and lock it open
      openMenu();
      isMenuLockedOpen = true;
      
      // Refresh activity when menu opens
      if (document.querySelector('.recent-activity')) {
        loadMenuActivity();
      }
      
      // Refresh notification count
      if (session) {
        loadUnreadNotificationsCount();
      }
    }
  });

  menuOverlay.addEventListener('click', () => {
    isMenuLockedOpen = false; // Clicking overlay always unlocks
    closeMenu();
  });

  // Handle logout
  const logoutLink = menuOptions.querySelector('.logout');
  if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.reload();
      } catch (error) {
        alert(error.message);
      }
    });
  }

  // Create left-edge trigger if it doesn't exist
  if (!document.querySelector('.left-edge-trigger')) {
    const leftEdgeTrigger = document.createElement('div');
    leftEdgeTrigger.className = 'left-edge-trigger';
    document.body.appendChild(leftEdgeTrigger);
  }

  // Create hamburger icon if it doesn't exist
  if (!document.querySelector('.menu-hamburger-indicator')) {
    const hamburgerIcon = document.createElement('div');
    hamburgerIcon.className = 'menu-hamburger-indicator';
    
    // Create three lines for the hamburger icon
    for (let i = 0; i < 3; i++) {
      const line = document.createElement('span');
      line.className = 'hamburger-line';
      hamburgerIcon.appendChild(line);
    }
    
    document.body.appendChild(hamburgerIcon);
  }

  // Add hover functionality to left edge trigger
  const leftEdgeTrigger = document.querySelector('.left-edge-trigger');
  leftEdgeTrigger.addEventListener('mouseenter', () => {
    if (!isMenuLockedOpen) {
      openMenu();
      // Refresh activity when menu opens via hover
      if (document.querySelector('.recent-activity')) {
        loadMenuActivity();
      }
      
      // Refresh notification count
      if (session) {
        loadUnreadNotificationsCount();
      }
    }
  });

  // Make sure menu doesn't close when hovering over hamburger indicator
  const hamburgerIcon = document.querySelector('.menu-hamburger-indicator');
  hamburgerIcon.addEventListener('mouseenter', () => {
    if (!isMenuLockedOpen) {
      openMenu();
      // Refresh activity when menu opens via hover
      if (document.querySelector('.recent-activity')) {
        loadMenuActivity();
      }
      
      // Refresh notification count
      if (session) {
        loadUnreadNotificationsCount();
      }
    }
  });

  // Handle mouse leaving the menu
  menuOptions.addEventListener('mouseleave', (e) => {
    // Don't close if moving to the left edge trigger or hamburger icon
    if (e.relatedTarget !== leftEdgeTrigger && e.relatedTarget !== hamburgerIcon && !isMenuLockedOpen) {
      closeMenu();
    }
  });
}