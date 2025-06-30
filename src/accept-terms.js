import { initMenu } from './utils/menu.js';
import { recordPageVisit, getPageTitle, getPageTypeFromUrl } from './utils/activityTracker.js';
import supabase from './utils/supabaseClient.js';

let currentUser = null;

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
    // Redirect to login if not authenticated
    window.location.href = '/login.html?returnTo=' + encodeURIComponent(window.location.href);
    return;
  }

  // Check if user has already accepted terms
  await checkExistingTermsAcceptance();
  
  // Setup event listeners
  setupEventListeners();
});

async function checkExistingTermsAcceptance() {
  if (!currentUser) return;
  
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('terms_accepted')
      .eq('id', currentUser.id)
      .single();
    
    if (error) throw error;
    
    if (user?.terms_accepted) {
      // User has already accepted terms, redirect to return URL or home
      const returnTo = new URLSearchParams(window.location.search).get('returnTo') || '/';
      window.location.href = returnTo;
      return;
    }
    
  } catch (error) {
    console.error('Error checking terms acceptance:', error);
    showNotification('Failed to check terms status. Please try again.', 'error');
  }
}

function setupEventListeners() {
  // Terms checkbox
  const checkbox = document.getElementById('terms-checkbox');
  const acceptButton = document.getElementById('accept-button');
  const checkboxContainer = document.getElementById('checkbox-container');
  
  if (checkbox && acceptButton) {
    // Update button state based on checkbox
    function updateButtonState() {
      acceptButton.disabled = !checkbox.checked;
      acceptButton.classList.toggle('enabled', checkbox.checked);
    }
    
    // Initial state
    updateButtonState();
    
    // Checkbox change handler
    checkbox.addEventListener('change', updateButtonState);
    
    // Checkbox container click handler (for better UX)
    if (checkboxContainer) {
      checkboxContainer.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          updateButtonState();
        }
      });
    }
    
    // Accept button click handler
    acceptButton.addEventListener('click', handleTermsAcceptance);
  }
}

async function handleTermsAcceptance() {
  if (!currentUser) {
    showNotification('Please sign in to accept terms.', 'error');
    window.location.href = '/login.html';
    return;
  }
  
  const checkbox = document.getElementById('terms-checkbox');
  const acceptButton = document.getElementById('accept-button');
  const loadingState = document.getElementById('loading-state');
  
  if (!checkbox.checked) {
    showNotification('Please check the terms acceptance checkbox.', 'error');
    return;
  }
  
  try {
    // Show loading state
    acceptButton.disabled = true;
    acceptButton.textContent = 'Processing...';
    if (loadingState) {
      loadingState.style.display = 'block';
    }
    
    // Update user's terms acceptance in the database
    const { error } = await supabase
      .from('users')
      .upsert({
        id: currentUser.id,
        email: currentUser.email,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        raw_user_meta_data: currentUser.user_metadata || {}
      }, {
        onConflict: 'id'
      });
    
    if (error) throw error;
    
    showNotification('Terms accepted successfully! Redirecting...', 'success');
    
    // Get the return URL from query parameter
    const returnTo = new URLSearchParams(window.location.search).get('returnTo') || '/publish.html';
    
    // Redirect after short delay
    setTimeout(() => {
      window.location.href = returnTo;
    }, 1500);
    
  } catch (error) {
    console.error('Error accepting terms:', error);
    showNotification('Failed to accept terms. Please try again.', 'error');
    
    // Reset button state
    acceptButton.disabled = false;
    acceptButton.textContent = 'Accept and Continue to Publishing';
    if (loadingState) {
      loadingState.style.display = 'none';
    }
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
    max-width: 300px;
    word-wrap: break-word;
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