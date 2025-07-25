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

  // Check if user is already logged in
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // User is already logged in, redirect to home page
      window.location.href = '/';
      return;
    }
  } catch (error) {
    // If there's an error getting the session (e.g., invalid refresh token),
    // clear the invalid session data
    console.error('Error getting session:', error);
    await supabase.auth.signOut();
  }

  // Check URL parameters for specific tab
  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get('tab');
  if (tab === 'signup') {
    switchTab('signup');
  }

  // Setup event listeners
  setupEventListeners();
});

function setupEventListeners() {
  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      switchTab(tab);
    });
  });

  // Password visibility toggle
  const toggleButtons = document.querySelectorAll('.toggle-password');
  toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
      togglePasswordVisibility(button);
    });
  });

  // Form submissions
  const signinForm = document.getElementById('signin-form');
  const signupForm = document.getElementById('signup-form');
  
  if (signinForm) {
    signinForm.addEventListener('submit', handleSignIn);
  }
  
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignUp);
  }

  // Forgot password link
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', handleForgotPassword);
  }
}

function switchTab(tabName) {
  // Update tab buttons
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    if (button.dataset.tab === tabName) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });

  // Update forms
  const forms = document.querySelectorAll('.auth-form');
  forms.forEach(form => {
    if (form.id === `${tabName}-form`) {
      form.classList.add('active');
    } else {
      form.classList.remove('active');
    }
  });

  // Clear any messages
  clearMessages();
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

async function handleSignIn(e) {
  e.preventDefault();
  
  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;
  const submitButton = e.target.querySelector('.submit-button');
  const messageElement = document.getElementById('signin-message');
  
  // Validation
  if (!email || !password) {
    showMessage(messageElement, 'Please fill in all fields.', 'error');
    return;
  }

  if (!isValidEmail(email)) {
    showMessage(messageElement, 'Please enter a valid email address.', 'error');
    return;
  }

  try {
    // Disable submit button and show loading
    submitButton.disabled = true;
    submitButton.textContent = 'Signing In...';
    clearMessages();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) throw error;

    if (data.user) {
      showMessage(messageElement, 'Sign in successful! Redirecting...', 'success');
      
      // Redirect after short delay
      setTimeout(() => {
        const returnTo = new URLSearchParams(window.location.search).get('returnTo') || '/';
        window.location.href = returnTo;
      }, 1500);
    }

  } catch (error) {
    console.error('Sign in error:', error);
    let errorMessage = 'Sign in failed. Please try again.';
    
    if (error.message.includes('Invalid login credentials')) {
      errorMessage = 'Invalid email or password. Please check your credentials and try again.';
    } else if (error.message.includes('Email not confirmed')) {
      errorMessage = 'Please check your email and click the confirmation link before signing in.';
    } else if (error.message.includes('Too many requests')) {
      errorMessage = 'Too many sign in attempts. Please wait a few minutes before trying again.';
    }
    
    showMessage(messageElement, errorMessage, 'error');
  } finally {
    // Re-enable submit button
    submitButton.disabled = false;
    submitButton.textContent = 'Sign In';
  }
}

async function handleSignUp(e) {
  e.preventDefault();
  
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;
  const submitButton = e.target.querySelector('.submit-button');
  const messageElement = document.getElementById('signup-message');
  
  // Validation
  if (!email || !password || !confirmPassword) {
    showMessage(messageElement, 'Please fill in all fields.', 'error');
    return;
  }

  if (!isValidEmail(email)) {
    showMessage(messageElement, 'Please enter a valid email address.', 'error');
    return;
  }

  if (password.length < 6) {
    showMessage(messageElement, 'Password must be at least 6 characters long.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showMessage(messageElement, 'Passwords do not match.', 'error');
    return;
  }

  try {
    // Disable submit button and show loading
    submitButton.disabled = true;
    submitButton.textContent = 'Creating Account...';
    clearMessages();

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });

    if (error) throw error;

    if (data.user) {
      // Check if email confirmation is required
      if (data.user.email_confirmed_at) {
        showMessage(messageElement, 'Account created successfully! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        showMessage(messageElement, 'Account created! Please check your email for a confirmation link.', 'success');
        
        // Switch to sign in tab after delay
        setTimeout(() => {
          switchTab('signin');
          document.getElementById('signin-email').value = email;
        }, 3000);
      }
    }

  } catch (error) {
    console.error('Sign up error:', error);
    let errorMessage = 'Account creation failed. Please try again.';
    
    if (error.message.includes('User already registered')) {
      errorMessage = 'An account with this email already exists. Please sign in instead.';
    } else if (error.message.includes('Password should be at least')) {
      errorMessage = 'Password is too weak. Please choose a stronger password.';
    } else if (error.message.includes('Invalid email')) {
      errorMessage = 'Please enter a valid email address.';
    }
    
    showMessage(messageElement, errorMessage, 'error');
  } finally {
    // Re-enable submit button
    submitButton.disabled = false;
    submitButton.textContent = 'Sign Up';
  }
}

async function handleForgotPassword(e) {
  e.preventDefault();
  
  const email = document.getElementById('signin-email').value.trim();
  
  if (!email) {
    showNotification('Please enter your email address in the email field first.', 'error');
    document.getElementById('signin-email').focus();
    return;
  }

  if (!isValidEmail(email)) {
    showNotification('Please enter a valid email address.', 'error');
    return;
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`
    });

    if (error) throw error;

    showNotification('Password reset email sent! Please check your inbox.', 'success');

  } catch (error) {
    console.error('Password reset error:', error);
    showNotification('Failed to send password reset email. Please try again.', 'error');
  }
}

function showMessage(element, message, type) {
  if (!element) return;
  
  element.textContent = message;
  element.className = type === 'error' ? 'error-message' : 'success-message';
  element.style.display = 'block';
}

function clearMessages() {
  const messageElements = document.querySelectorAll('#signin-message, #signup-message');
  messageElements.forEach(element => {
    element.style.display = 'none';
    element.textContent = '';
    element.className = '';
  });
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

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}