import { createClient } from '@supabase/supabase-js';
import { checkSupabaseHealth, testDatabaseTable, getSupabaseConfig } from './utils/supabaseHealthChecker.js';
import { initMenu } from './utils/menu.js';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

let currentUser = null;
let isAdmin = false;
let systemErrors = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize the menu
  initMenu();
  
  // Check if user is logged in and is an admin
  await checkAdminAccess();
  
  if (!isAdmin) {
    document.body.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; text-align: center;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="1">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h1 style="color: #dc3545; margin: 20px 0;">Access Denied</h1>
        <p style="margin-bottom: 20px; max-width: 500px;">You do not have permission to access the admin panel. Please contact a system administrator if you believe this is a mistake.</p>
        <a href="/" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: #07717c; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
          Return to Home
        </a>
      </div>
    `;
    return;
  }
  
  // Load dashboard data
  await loadDashboardData();
  
  // Set up event listeners
  setupEventListeners();
});

async function checkAdminAccess() {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user;
    
    if (!currentUser) {
      isAdmin = false;
      return;
    }
    
    // Check if user is in admins table or has admin role
    const { data: userData, error } = await supabase
      .from('users')
      .select('raw_user_meta_data')
      .eq('id', currentUser.id)
      .single();
    
    if (error) throw error;
    
    // Check if user has admin role in metadata
    isAdmin = userData?.raw_user_meta_data?.role === 'admin';
    
  } catch (error) {
    console.error('Error checking admin access:', error);
    isAdmin = false;
  }
}

async function loadDashboardData() {
  // Load all dashboard sections in parallel
  await Promise.all([
    loadDatabaseStatus(),
    loadUserStats(),
    loadContentStats(),
    loadDatabaseHealth(),
    loadSystemErrors()
  ]);
}

async function loadDatabaseStatus() {
  const container = document.getElementById('db-status-content');
  if (!container) return;
  
  try {
    // Check Supabase health
    const healthResults = await checkSupabaseHealth();
    
    let statusClass = 'success';
    let statusText = 'Healthy';
    
    if (!healthResults.healthy) {
      statusClass = 'danger';
      statusText = 'Issues Detected';
    } else if (healthResults.errors && healthResults.errors.length > 0) {
      statusClass = 'warning';
      statusText = 'Partial Issues';
    }
    
    // Create the HTML
    container.innerHTML = `
      <div class="status-badge ${statusClass}">
        <span class="status-indicator ${statusClass === 'success' ? 'green' : statusClass === 'warning' ? 'yellow' : 'red'}"></span>
        ${statusText}
      </div>
      
      <div class="admin-card-stat">${
        healthResults.healthy ? 
        "100%" : 
        `${Math.round((Object.values(healthResults).filter(v => v === true).length / 
                       (Object.values(healthResults).filter(v => typeof v === 'boolean').length)) * 100)}%`
      }</div>
      
      <div class="admin-card-details">
        <div class="detail-item">
          <span class="detail-item-label">Connection:</span>
          <span class="detail-item-value">
            ${healthResults.connection ? 
              `<span class="status-indicator green"></span> Connected` : 
              `<span class="status-indicator red"></span> Disconnected`
            }
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-item-label">Database:</span>
          <span class="detail-item-value">
            ${healthResults.database ? 
              `<span class="status-indicator green"></span> Online` : 
              `<span class="status-indicator red"></span> Issues`
            }
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-item-label">Auth Service:</span>
          <span class="detail-item-value">
            ${healthResults.auth ? 
              `<span class="status-indicator green"></span> Working` : 
              `<span class="status-indicator red"></span> Issues`
            }
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-item-label">Storage:</span>
          <span class="detail-item-value">
            ${healthResults.storage ? 
              `<span class="status-indicator green"></span> Online` : 
              `<span class="status-indicator red"></span> Issues`
            }
          </span>
        </div>
        ${healthResults.details.connectionLatency ? `
        <div class="detail-item">
          <span class="detail-item-label">Latency:</span>
          <span class="detail-item-value">${healthResults.details.connectionLatency}ms</span>
        </div>
        ` : ''}
      </div>
    `;
  } catch (error) {
    console.error('Error loading database status:', error);
    container.innerHTML = `
      <div class="status-badge danger">
        <span class="status-indicator red"></span>
        Error
      </div>
      <div class="admin-card-details">
        <p>Error loading database status: ${error.message}</p>
      </div>
    `;
  }
}

async function loadUserStats() {
  const container = document.getElementById('user-stats-content');
  if (!container) return;
  
  try {
    // Get total users count
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (usersError) throw usersError;
    
    // Get users who accepted terms
    const { count: termsAcceptedUsers, error: termsError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('terms_accepted', true);
    
    if (termsError) throw termsError;
    
    // Get new users in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: newUsers, error: newUsersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', sevenDaysAgo.toISOString());
    
    if (newUsersError) throw newUsersError;
    
    container.innerHTML = `
      <div class="admin-card-stat">${totalUsers || 0}</div>
      <div class="status-badge success">
        <span class="status-indicator green"></span>
        ${newUsers || 0} new in last 7 days
      </div>
      
      <div class="admin-card-details">
        <div class="detail-item">
          <span class="detail-item-label">Terms Accepted:</span>
          <span class="detail-item-value">${termsAcceptedUsers || 0} (${Math.round(((termsAcceptedUsers || 0) / (totalUsers || 1)) * 100)}%)</span>
        </div>
        <div class="detail-item">
          <span class="detail-item-label">Terms Pending:</span>
          <span class="detail-item-value">${(totalUsers || 0) - (termsAcceptedUsers || 0)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-item-label">New Users (7d):</span>
          <span class="detail-item-value">${newUsers || 0}</span>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading user stats:', error);
    container.innerHTML = `
      <div class="status-badge danger">
        <span class="status-indicator red"></span>
        Error
      </div>
      <div class="admin-card-details">
        <p>Error loading user statistics: ${error.message}</p>
      </div>
    `;
  }
}

async function loadContentStats() {
  const container = document.getElementById('content-stats-content');
  if (!container) return;
  
  try {
    // Get counts for different types of content
    const { count: archivePosts, error: archiveError } = await supabase
      .from('archive_posts')
      .select('*', { count: 'exact', head: true });
    
    if (archiveError) throw archiveError;
    
    const { count: collabPosts, error: collabError } = await supabase
      .from('collab_posts')
      .select('*', { count: 'exact', head: true });
    
    if (collabError) throw collabError;
    
    const { count: forumPosts, error: forumError } = await supabase
      .from('forum_posts')
      .select('*', { count: 'exact', head: true });
    
    if (forumError) throw forumError;
    
    // Get total views across all archive posts
    const { data: archiveViewsData, error: viewsError } = await supabase
      .from('archive_posts')
      .select('views');
    
    if (viewsError) throw viewsError;
    
    const totalViews = archiveViewsData?.reduce((sum, post) => sum + (post.views || 0), 0) || 0;
    
    container.innerHTML = `
      <div class="admin-card-stat">${(archivePosts || 0) + (collabPosts || 0) + (forumPosts || 0)}</div>
      <div class="status-badge success">
        <span class="status-indicator green"></span>
        ${totalViews} total views
      </div>
      
      <div class="admin-card-details">
        <div class="detail-item">
          <span class="detail-item-label">Archive Posts:</span>
          <span class="detail-item-value">${archivePosts || 0}</span>
        </div>
        <div class="detail-item">
          <span class="detail-item-label">Collab Posts:</span>
          <span class="detail-item-value">${collabPosts || 0}</span>
        </div>
        <div class="detail-item">
          <span class="detail-item-label">Forum Posts:</span>
          <span class="detail-item-value">${forumPosts || 0}</span>
        </div>
        <div class="detail-item">
          <span class="detail-item-label">Avg. Views/Post:</span>
          <span class="detail-item-value">${archivePosts ? Math.round(totalViews / archivePosts) : 0}</span>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading content stats:', error);
    container.innerHTML = `
      <div class="status-badge danger">
        <span class="status-indicator red"></span>
        Error
      </div>
      <div class="admin-card-details">
        <p>Error loading content statistics: ${error.message}</p>
      </div>
    `;
  }
}

async function loadDatabaseHealth() {
  const container = document.getElementById('db-health-content');
  if (!container) return;
  
  try {
    // Test database tables
    const tables = ['users', 'archive_posts', 'collab_posts', 'forum_posts', 'user_favorites', 'user_follows', 'user_notifications'];
    const tableStatuses = await Promise.all(tables.map(table => testDatabaseTable(table)));
    
    // Get auth service status
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    // Create HTML for database table status
    const tablesHTML = `
      <div class="db-table-status">
        ${tableStatuses.map(status => `
          <div class="db-table-item">
            <div class="db-table-header">
              <div class="db-table-name">${status.table}</div>
              <div class="status-indicator ${status.success ? 'green' : 'red'}"></div>
            </div>
            <div class="db-table-count">${status.count || 0}</div>
            <div class="db-table-details">
              ${status.success 
                ? `${status.message || 'Accessible'}`
                : `<span style="color: #dc3545;">${status.error || 'Error'}</span>`
              }
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="auth-status">
        <h3>Auth Service Status</h3>
        <div class="status-badge ${authError ? 'danger' : 'success'}">
          <span class="status-indicator ${authError ? 'red' : 'green'}"></span>
          ${authError ? 'Auth Service Error' : 'Auth Service Online'}
        </div>
        ${authError ? `
          <div class="session-info">
            Error: ${authError.message}
          </div>
        ` : `
          <div class="session-info">
            <pre>${JSON.stringify({ 
              sessionExists: !!session, 
              userAuthenticated: !!session?.user,
              authMethods: session?.user?.app_metadata?.providers || [],
              expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A'
            }, null, 2)}</pre>
          </div>
        `}
      </div>
    `;
    
    container.innerHTML = tablesHTML;
    
  } catch (error) {
    console.error('Error loading database health:', error);
    container.innerHTML = `
      <div class="error-message">
        <p>Error loading database health information: ${error.message}</p>
      </div>
    `;
  }
}

function loadSystemErrors() {
  const container = document.getElementById('system-errors-content');
  if (!container) return;
  
  // For now, just show the mock errors since we don't have a real error logging system
  if (systemErrors.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #28a745;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 10px;">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <p>No system errors have been logged recently.</p>
      </div>
    `;
    return;
  }
  
  const errorsHTML = systemErrors.map(error => `
    <div class="error-item">
      <div class="error-header">
        <div class="error-type">${error.type}</div>
        <div class="error-time">${new Date(error.timestamp).toLocaleString()}</div>
      </div>
      <div class="error-message">${error.message}</div>
      <div class="error-details">${JSON.stringify(error.details)}</div>
    </div>
  `).join('');
  
  container.innerHTML = `
    ${errorsHTML}
    <button class="clear-logs-btn" id="clear-errors-btn">Clear Error Logs</button>
  `;
  
  // Add event listener for clear button
  const clearBtn = container.querySelector('#clear-errors-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      systemErrors = [];
      loadSystemErrors();
    });
  }
}

function setupEventListeners() {
  // Refresh button listeners
  const refreshDbStatusBtn = document.getElementById('refresh-db-status');
  if (refreshDbStatusBtn) {
    refreshDbStatusBtn.addEventListener('click', loadDatabaseStatus);
  }
  
  const refreshUserStatsBtn = document.getElementById('refresh-user-stats');
  if (refreshUserStatsBtn) {
    refreshUserStatsBtn.addEventListener('click', loadUserStats);
  }
  
  const refreshContentStatsBtn = document.getElementById('refresh-content-stats');
  if (refreshContentStatsBtn) {
    refreshContentStatsBtn.addEventListener('click', loadContentStats);
  }
  
  // Action buttons
  const clearCacheBtn = document.getElementById('clear-cache-btn');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', clearCache);
  }
  
  const testConnectionBtn = document.getElementById('test-connection-btn');
  if (testConnectionBtn) {
    testConnectionBtn.addEventListener('click', runConnectionTest);
  }
  
  const repairDbBtn = document.getElementById('repair-db-btn');
  if (repairDbBtn) {
    repairDbBtn.addEventListener('click', repairDatabase);
  }
  
  const exportLogsBtn = document.getElementById('export-logs-btn');
  if (exportLogsBtn) {
    exportLogsBtn.addEventListener('click', exportLogs);
  }
  
  const wakeSupabaseBtn = document.getElementById('wake-supabase-btn');
  if (wakeSupabaseBtn) {
    wakeSupabaseBtn.addEventListener('click', wakeSupabase);
  }
}

async function wakeSupabase() {
  try {
    showNotification('Attempting to wake up Supabase project...', 'info');
    
    // Import the test function
    const { testSupabaseConnection } = await import('./utils/supabaseHealthChecker.js');
    
    // Run multiple connection attempts
    for (let i = 0; i < 3; i++) {
      showNotification(`Wake attempt ${i + 1}/3...`, 'info');
      
      const result = await testSupabaseConnection();
      
      if (result.success) {
        showNotification('Supabase project is now awake and responding!', 'success');
        // Reload the dashboard
        setTimeout(() => window.location.reload(), 1500);
        return;
      }
      
      // Wait between attempts
      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    showNotification('Unable to wake Supabase project. Please visit your Supabase dashboard manually.', 'warning');
    
    // Open Supabase dashboard
    setTimeout(() => {
      window.open('https://supabase.com/dashboard', '_blank');
    }, 2000);
    
  } catch (error) {
    console.error('Error waking Supabase:', error);
    showNotification('Error attempting to wake Supabase: ' + error.message, 'error');
  }
}

async function clearCache() {
  try {
    // Clear localStorage
    localStorage.clear();
    
    // Show confirmation
    showNotification('Cache cleared successfully!', 'success');
    
    // Reload page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error('Error clearing cache:', error);
    showNotification('Failed to clear cache: ' + error.message, 'error');
  }
}

async function runConnectionTest() {
  try {
    // Import the enhanced test function
    const { testSupabaseConnection } = await import('./utils/supabaseHealthChecker.js');
    
    showNotification('Running enhanced connection test...', 'info');
    
    // Run both the basic connection test and full health check
    const [connectionTest, healthCheck] = await Promise.all([
      testSupabaseConnection(),
      checkSupabaseHealth()
    ]);
    
    if (connectionTest.success && healthCheck.healthy) {
      showNotification(`Connection test successful! Latency: ${connectionTest.details.latency}ms`, 'success');
    } else if (!connectionTest.success) {
      // Show specific connection issues and suggestions
      const suggestions = connectionTest.suggestions.join(' ');
      showNotification(`Connection failed: ${connectionTest.errors[0]?.message}. ${suggestions}`, 'error');
      
      // Auto-open Supabase dashboard if it seems like the project is paused
      if (connectionTest.errors.some(e => e.message.includes('Failed to fetch'))) {
        setTimeout(() => {
          const shouldOpenDashboard = confirm('Your Supabase project might be paused. Would you like to open the Supabase dashboard to wake it up?');
          if (shouldOpenDashboard) {
            window.open('https://supabase.com/dashboard', '_blank');
          }
        }, 3000);
      }
    } else {
      showNotification(`Health check completed with issues. Check console for details.`, 'warning');
      console.log('Detailed results:', { connectionTest, healthCheck });
    }
  } catch (error) {
    console.error('Error running connection test:', error);
    showNotification('Failed to run connection test: ' + error.message, 'error');
  }
}

function repairDatabase() {
  // This would typically call a stored procedure or function to repair the database
  // For now, we'll just show a notification
  showNotification('Database repair functionality is not yet implemented.', 'info');
}

function exportLogs() {
  // Generate a log file with all the errors and general info
  const logData = {
    timestamp: new Date().toISOString(),
    errors: systemErrors,
    config: getSupabaseConfig(),
    browser: navigator.userAgent,
    url: window.location.href
  };
  
  // Convert to JSON string with pretty printing
  const jsonString = JSON.stringify(logData, null, 2);
  
  // Create a blob and download it
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wikideep-logs-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showNotification('Logs exported successfully!', 'success');
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#067273'};
    color: ${type === 'warning' ? '#212529' : 'white'};
    padding: 15px 25px;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
  
  // Remove after delay
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}