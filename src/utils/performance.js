/**
 * Performance monitoring and optimization utilities
 */

/**
 * Debounce function to limit the frequency of function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to ensure function is called at most once in specified interval
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Measure and log function execution time
 * @param {Function} fn - Function to measure
 * @param {string} name - Name to identify the function in logs
 * @returns {Function} Wrapped function that logs execution time
 */
export function measurePerformance(fn, name = 'Function') {
  return function(...args) {
    const start = performance.now();
    const result = fn.apply(this, args);
    const end = performance.now();
    
    console.info(`${name} execution time: ${(end - start).toFixed(2)}ms`);
    return result;
  };
}

/**
 * Measure and log async function execution time
 * @param {Function} fn - Async function to measure
 * @param {string} name - Name to identify the function in logs
 * @returns {Function} Wrapped async function that logs execution time
 */
export function measureAsyncPerformance(fn, name = 'Async Function') {
  return async function(...args) {
    const start = performance.now();
    
    try {
      const result = await fn.apply(this, args);
      const end = performance.now();
      console.info(`${name} execution time: ${(end - start).toFixed(2)}ms`);
      return result;
    } catch (error) {
      const end = performance.now();
      console.error(`${name} failed after ${(end - start).toFixed(2)}ms:`, error);
      throw error;
    }
  };
}

/**
 * Cache function results for better performance
 * @param {Function} fn - Function to cache
 * @param {Function} keyGenerator - Function to generate cache key from args (default: JSON.stringify)
 * @returns {Function} Cached function
 */
export function memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  
  return function(...args) {
    const key = keyGenerator(...args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Cache async function results for better performance
 * @param {Function} fn - Async function to cache
 * @param {Object} options - Cache options
 * @returns {Function} Cached async function
 */
export function memoizeAsync(fn, options = {}) {
  const {
    maxSize = 100,
    ttl = 0, // 0 means no expiration
    keyGenerator = (...args) => JSON.stringify(args)
  } = options;
  
  const cache = new Map();
  const timestamps = new Map();
  
  return async function(...args) {
    const key = keyGenerator(...args);
    const now = Date.now();
    
    // Check if we have a valid cached result
    if (cache.has(key)) {
      if (ttl === 0 || now - timestamps.get(key) < ttl) {
        return cache.get(key);
      }
    }
    
    // If cache is full, remove oldest entry
    if (ttl > 0 && cache.size >= maxSize) {
      let oldestKey = null;
      let oldestTime = Infinity;
      
      for (const [k, time] of timestamps.entries()) {
        if (time < oldestTime) {
          oldestTime = time;
          oldestKey = k;
        }
      }
      
      if (oldestKey) {
        cache.delete(oldestKey);
        timestamps.delete(oldestKey);
      }
    }
    
    // Calculate the result
    const result = await fn.apply(this, args);
    
    // Cache the result
    cache.set(key, result);
    timestamps.set(key, now);
    
    return result;
  };
}

/**
 * Utility to detect slow operations and log them
 */
export function setupPerformanceMonitoring() {
  if (typeof window !== 'undefined') {
    // Monitor slow rendering
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 100) { // Report long tasks (>100ms)
          console.warn(`Long task detected: ${entry.name || 'Unnamed task'} took ${entry.duration.toFixed(2)}ms`);
        }
      }
    });
    
    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.info('LongTask API not supported in this browser');
    }
    
    // Monitor navigation and resource loading
    const navObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          console.info(`Page load metrics:
            - DOM Content Loaded: ${entry.domContentLoadedEventEnd - entry.startTime}ms
            - DOM Interactive: ${entry.domInteractive - entry.startTime}ms
            - Load Event: ${entry.loadEventEnd - entry.startTime}ms
            - First Paint: ${performance.getEntriesByType('paint')[0]?.startTime || 'N/A'}ms
          `);
        } else if (entry.entryType === 'resource' && entry.duration > 500) {
          console.warn(`Slow resource: ${entry.name} took ${entry.duration.toFixed(2)}ms to load`);
        }
      }
    });
    
    try {
      navObserver.observe({ entryTypes: ['navigation', 'resource'] });
    } catch (e) {
      console.info('Navigation or Resource timing API not supported in this browser');
    }
  }
}