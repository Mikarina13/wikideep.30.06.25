/**
 * Security utility functions for client-side protection
 */

/**
 * Sanitizes a string to prevent XSS attacks
 * @param {string} unsafe - Potentially unsafe input
 * @returns {string} Sanitized string
 */
export function sanitizeHTML(unsafe) {
  if (!unsafe) return '';
  
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates an email address format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email format is valid
 */
export function isValidEmail(email) {
  if (!email) return false;
  
  // Basic email validation regex
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * Validates URL safety
 * @param {string} url - URL to validate
 * @param {Array} allowedDomains - Array of allowed domains (optional)
 * @returns {boolean} True if URL is valid and safe
 */
export function isValidUrl(url, allowedDomains = []) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    
    // Check protocol (only allow http and https)
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }
    
    // If allowedDomains is provided, check against it
    if (allowedDomains && allowedDomains.length > 0) {
      const hostname = urlObj.hostname.toLowerCase();
      return allowedDomains.some(domain => 
        hostname === domain || hostname.endsWith(`.${domain}`)
      );
    }
    
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result with score and feedback
 */
export function validatePassword(password, options = {}) {
  const {
    minLength = 8,
    requireLowercase = true,
    requireUppercase = true, 
    requireNumber = true,
    requireSpecial = false
  } = options;
  
  if (!password) return { valid: false, score: 0, feedback: 'Password is required' };
  
  const result = {
    valid: true,
    score: 0, // 0-4 score, 0 being very weak, 4 being very strong
    feedback: '',
    checks: {
      length: password.length >= minLength,
      lowercase: !requireLowercase || /[a-z]/.test(password),
      uppercase: !requireUppercase || /[A-Z]/.test(password),
      number: !requireNumber || /[0-9]/.test(password),
      special: !requireSpecial || /[^A-Za-z0-9]/.test(password)
    }
  };
  
  // Calculate score based on passed checks
  result.score = Object.values(result.checks).filter(Boolean).length;
  
  // Normalize score to 0-4 range
  result.score = Math.min(4, Math.floor(result.score * 4 / Object.keys(result.checks).length));
  
  // Check if password meets all required criteria
  result.valid = result.checks.length && 
                 result.checks.lowercase && 
                 result.checks.uppercase && 
                 result.checks.number && 
                 result.checks.special;
  
  // Generate feedback
  if (!result.valid) {
    const feedback = [];
    if (!result.checks.length) feedback.push(`Password must be at least ${minLength} characters`);
    if (requireLowercase && !result.checks.lowercase) feedback.push('Include at least one lowercase letter');
    if (requireUppercase && !result.checks.uppercase) feedback.push('Include at least one uppercase letter');
    if (requireNumber && !result.checks.number) feedback.push('Include at least one number');
    if (requireSpecial && !result.checks.special) feedback.push('Include at least one special character');
    
    result.feedback = feedback.join('. ');
  } else {
    // Provide feedback based on strength score
    switch (result.score) {
      case 0:
      case 1:
        result.feedback = 'Very weak password. Consider using a stronger one.';
        break;
      case 2:
        result.feedback = 'Weak password. Add more variety for better security.';
        break;
      case 3:
        result.feedback = 'Good password strength.';
        break;
      case 4:
        result.feedback = 'Strong password!';
        break;
    }
  }
  
  return result;
}

/**
 * Generate a secure random string for CSRF tokens, nonces, etc.
 * @param {number} length - Length of the random string
 * @returns {string} Random string
 */
export function generateRandomString(length = 32) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  // Use crypto API if available for better randomness
  if (window.crypto && window.crypto.getRandomValues) {
    const values = new Uint32Array(length);
    window.crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += characters.charAt(values[i] % characters.length);
    }
    return result;
  }
  
  // Fallback to Math.random (less secure)
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * Check if browser supports modern security features
 * @returns {Object} Object with support status for various features
 */
export function checkSecuritySupport() {
  return {
    secureContext: window.isSecureContext,
    contentSecurityPolicy: !!window.trustedTypes,
    httpsOnly: window.location.protocol === 'https:',
    webCrypto: !!window.crypto && !!window.crypto.subtle,
    serviceWorker: 'serviceWorker' in navigator,
    localStorage: (() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    })(),
    permissions: 'permissions' in navigator
  };
}