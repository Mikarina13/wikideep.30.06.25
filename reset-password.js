import { initMenu } from './src/utils/menu.js';
import { recordPageVisit, getPageTitle, getPageTypeFromUrl } from './src/utils/activityTracker.js';
import supabase from './src/utils/supabaseClient.js';

document.addEventListener('DOMContentLoaded', async () => {
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
});

function setupEventListeners() {
  // Password visibility toggle
  const toggleButtons = document.querySelectorAll('.toggle-password');
  toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
      togglePasswordVisibility(button);
    });
  });

  // Form submission
  const resetForm = document.getElementById('reset-password-form');
  if (resetForm) {
    resetForm.addEventListener('submit', handlePasswordReset);
  }
}

function togglePasswordVisibility(toggleButton) {
  const passwordInput = toggleButton.previousElementSibling;
  const isPasswordVisible = passwordInput.type === 'text';
  
  if (isPasswordVisible) {
    passwordInput.type = 'password';
    toggleButton.classList.remove('fa-eye');
    toggleButton.classList.add('fa-eye-slash');
  } else {
    passwordInput.type = 'text';
    toggleButton.classList.remove('fa-eye-slash');
    toggleButton.classList.add('fa-eye');
  }
}

async function handlePasswordReset(e) {
  e.preventDefault();
  
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const submitButton = e.target.querySelector('.submit-button');
  
  // Validation
  if (!newPassword || !confirmPassword) {
    showNotification('Please fill in all fields.', 'error');
    return;
  }

  if (newPassword.length < 6) {
    showNotification('Password must be at least 6 characters long.', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    showNotification('Passwords do not match.', 'error');
    return;
  }

  try {
    // Disable submit button and show loading
    submitButton.disabled = true;
    submitButton.textContent = 'Updating Password...';

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    showNotification('Password updated successfully! Redirecting...', 'success');
    
    // Redirect after short delay
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);

  } catch (error) {
    console.error('Password reset error:', error);
    let errorMessage = 'Failed to update password. Please try again.';
    
    if (error.message.includes('Password should be at least')) {
      errorMessage = 'Password is too weak. Please choose a stronger password.';
    } else if (error.message.includes('session_not_found')) {
      errorMessage = 'Reset session has expired. Please request a new password reset.';
    }
    
    showNotification(errorMessage, 'error');
  } finally {
    // Re-enable submit button
    submitButton.disabled = false;
    submitButton.textContent = 'Update Password';
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