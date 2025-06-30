/**
 * Enhanced error handler for Supabase operations
 * Provides detailed error reporting and recovery suggestions
 */

// Map of common Supabase error codes to user-friendly messages
const errorMessages = {
  // Auth errors
  'auth/invalid-email': 'The email address is badly formatted.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'This email is already in use by another account.',
  
  // Database errors
  'PGRST116': 'No data found.',
  '23505': 'A record with this information already exists.',
  '42P01': 'Table does not exist. The database schema might be outdated.',
  '42501': 'Insufficient permissions to perform this action.',
  
  // Storage errors
  'storage/object-not-found': 'The requested file does not exist.',
  'storage/unauthorized': 'Not authorized to access this file.',
  'storage/quota-exceeded': 'Storage quota exceeded.',
  
  // Network errors
  'Failed to fetch': 'Network error. Please check your internet connection.',
  'NetworkError': 'Network error. Please check your internet connection.',
  
  // General errors
  'JWT expired': 'Your session has expired. Please sign in again.',
  '401': 'Authentication error. Please sign in again.',
  '403': 'You don\'t have permission to perform this action.',
  '404': 'The requested resource was not found.',
  '500': 'Server error. Please try again later.',
  '503': 'Service unavailable. Please try again later.'
};

/**
 * Handles Supabase errors and returns user-friendly information
 * @param {Error} error - The error object from Supabase
 * @param {string} context - Optional context about the operation that failed
 * @returns {Object} User-friendly error info with recovery suggestions
 */
export function handleSupabaseError(error, context = '') {
  if (!error) return { message: 'Unknown error occurred' };

  console.error(`Supabase error in ${context}:`, error);
  
  const errorCode = error.code || error.status || error.message || 'unknown';
  
  // Find a matching error message or use the original message
  let message = errorMessages[errorCode] || error.message || 'An unexpected error occurred';
  let suggestion = '';
  
  // Add context to the error message if provided
  if (context) {
    message = `Error ${context}: ${message}`;
  }
  
  // Identify error category and provide suggestions
  if (errorCode.includes('auth') || errorCode === '401' || errorCode.includes('JWT')) {
    suggestion = 'Try signing out and signing in again.';
  } else if (errorCode === '403' || errorCode === '42501') {
    suggestion = 'You may not have permission to perform this action. Please contact support if you believe this is a mistake.';
  } else if (errorCode.includes('storage')) {
    suggestion = 'There was a problem accessing files. Try refreshing the page.';
  } else if (errorCode.includes('NetworkError') || errorCode === 'Failed to fetch' || errorCode === '503') {
    suggestion = 'Please check your internet connection and try again. If the problem persists, the service might be temporarily unavailable.';
  } else if (errorCode === '500') {
    suggestion = 'This appears to be a server issue. Please try again later or contact support if the problem persists.';
  }
  
  return {
    originalError: error,
    message,
    suggestion,
    code: errorCode,
    context
  };
}

/**
 * Shows an error notification to the user
 * @param {Error|Object} error - The error object or error details
 * @param {string} context - Context information
 */
export function showErrorNotification(error, context = '') {
  const errorInfo = typeof error === 'object' && error.message 
    ? handleSupabaseError(error, context)
    : { message: error, suggestion: '' };
  
  // Create a notification element
  const notification = document.createElement('div');
  notification.className = 'error-notification';
  
  notification.innerHTML = `
    <div class="error-content">
      <div class="error-icon">⚠️</div>
      <div class="error-message">
        <strong>${errorInfo.message}</strong>
        ${errorInfo.suggestion ? `<p class="error-suggestion">${errorInfo.suggestion}</p>` : ''}
      </div>
      <button class="close-error">&times;</button>
    </div>
  `;
  
  // Style the notification
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(220, 53, 69, 0.95);
    color: white;
    padding: 12px 18px;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    max-width: 400px;
    opacity: 0;
    transform: translateX(30px);
    transition: all 0.3s ease;
    font-size: 14px;
  `;
  
  // Add styles for internal elements
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .error-notification .error-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .error-notification .error-icon {
      font-size: 20px;
      margin-top: 2px;
    }
    .error-notification .error-message {
      flex: 1;
      padding-right: 10px;
    }
    .error-notification .error-suggestion {
      margin: 5px 0 0 0;
      opacity: 0.9;
      font-size: 13px;
    }
    .error-notification .close-error {
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      margin-top: -3px;
      opacity: 0.7;
      transition: opacity 0.2s;
    }
    .error-notification .close-error:hover {
      opacity: 1;
    }
  `;
  document.head.appendChild(styleElement);
  
  // Add to the DOM
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Add close button functionality
  const closeButton = notification.querySelector('.close-error');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(30px)';
      setTimeout(() => {
        notification.remove();
        styleElement.remove();
      }, 300);
    });
  }
  
  // Auto-remove after 8 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(30px)';
      setTimeout(() => {
        notification.remove();
        styleElement.remove();
      }, 300);
    }
  }, 8000);
}

/**
 * Centralized error handling function for Supabase operations
 * @param {Function} operation - Async function that performs a Supabase operation
 * @param {string} context - Description of the operation
 * @param {boolean} showNotification - Whether to show a notification to the user
 * @returns {Promise<Object>} The result of the operation or error info
 */
export async function safeSupabaseOperation(operation, context = '', showNotification = true) {
  try {
    return await operation();
  } catch (error) {
    const errorInfo = handleSupabaseError(error, context);
    
    if (showNotification) {
      showErrorNotification(errorInfo);
    }
    
    return { error: errorInfo };
  }
}