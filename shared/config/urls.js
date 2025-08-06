/**
 * Centralized URL Configuration Management
 * Environment-based URL handling for all applications
 */

// Environment detection
const isDevelopment = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const config = {
  development: {
    api: 'http://localhost:5000',
    frontend: 'http://localhost:3000',
    firebase: 'http://localhost:9099',
    functions: 'http://localhost:5001',
    emulator: {
      auth: 'http://localhost:9099',
      firestore: 'http://localhost:8080',
      functions: 'http://localhost:5001',
      storage: 'http://localhost:9199'
    }
  },
  production: {
    api: 'https://foam-fighters-2700b.web.app',
    frontend: 'https://foam-fighters-2700b.web.app',
            firebase: 'https://api-6swwnulcrq-nw.a.run.app',
        functions: 'https://api-6swwnulcrq-nw.a.run.app',
    emulator: null // No emulators in production
  }
};

/**
 * Get current environment configuration
 */
function getCurrentEnvironment() {
  return isDevelopment ? 'development' : 'production';
}

/**
 * Get current environment config object
 */
function getCurrentConfig() {
  return config[getCurrentEnvironment()];
}

/**
 * Get API base URL for current environment
 */
function getApiUrl() {
  return getCurrentConfig().api;
}

/**
 * Get frontend base URL for current environment
 */
function getFrontendUrl() {
  return getCurrentConfig().frontend;
}

/**
 * Get Firebase Functions base URL for current environment
 */
function getFunctionsUrl() {
  return getCurrentConfig().functions;
}

/**
 * Get specific Firebase Function URL
 * @param {string} functionName - Name of the function
 * @param {string} region - Firebase region (default: us-central1)
 */
function getFunctionUrl(functionName, region = 'us-central1') {
  const baseUrl = getFunctionsUrl();
  
  if (isDevelopment) {
    return `${baseUrl}/${functionName}`;
  } else {
    // Production: https://us-central1-projectid.cloudfunctions.net/functionName
    return `${baseUrl}/${functionName}`;
  }
}

/**
 * Get API endpoint URL
 * @param {string} endpoint - API endpoint path (e.g., '/quotes', '/inquiries')
 */
function getApiEndpoint(endpoint) {
  const baseUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Get static asset URL
 * @param {string} assetPath - Path to the asset
 */
function getAssetUrl(assetPath) {
  const baseUrl = getFrontendUrl();
  const cleanPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Cache busting utilities
 */
function getCacheBustParam() {
  return `?v=${Date.now()}`;
}

function addCacheBust(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${Date.now()}`;
}

/**
 * URL validation utilities
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function isLocalhost(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1';
  } catch (_) {
    return false;
  }
}

/**
 * Environment-specific cache detection
 * Detects mismatched environments (e.g., localhost URLs in production)
 */
function detectEnvironmentMismatch() {
  const currentConfig = getCurrentConfig();
  const apiUrl = getApiUrl();
  
  // Check if we're using localhost URLs in a non-localhost environment
  if (!isDevelopment && isLocalhost(apiUrl)) {
    console.warn('Environment mismatch detected: Using localhost URLs in production environment');
    return true;
  }
  
  // Check if we're using production URLs in localhost environment
  if (isDevelopment && !isLocalhost(apiUrl) && !apiUrl.includes('localhost')) {
    console.warn('Environment mismatch detected: Using production URLs in development environment');
    return true;
  }
  
  return false;
}

/**
 * Emergency cache clearing function
 */
function clearEnvironmentCache() {
  if (typeof window !== 'undefined') {
    // Clear browser caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    // Unregister service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
    }
    
    // Clear storage
    localStorage.clear();
    sessionStorage.clear();
    
    console.log('Environment cache cleared');
  }
}

/**
 * Auto-detect and handle environment mismatches
 */
function handleEnvironmentMismatch() {
  if (detectEnvironmentMismatch()) {
    console.warn('Clearing cache due to environment mismatch...');
    clearEnvironmentCache();
    
    // Reload page after a short delay
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload(true);
      }
    }, 1000);
  }
}

// Export all utilities
const urlConfig = {
  // Environment info
  isDevelopment,
  isProduction: !isDevelopment,
  getCurrentEnvironment,
  getCurrentConfig,
  
  // URL getters
  getApiUrl,
  getFrontendUrl,
  getFunctionsUrl,
  getFunctionUrl,
  getApiEndpoint,
  getAssetUrl,
  
  // Cache utilities
  getCacheBustParam,
  addCacheBust,
  
  // Validation utilities
  isValidUrl,
  isLocalhost,
  
  // Environment management
  detectEnvironmentMismatch,
  clearEnvironmentCache,
  handleEnvironmentMismatch,
  
  // Raw config access
  config
};

// Auto-check environment on load
if (typeof window !== 'undefined') {
  // Run environment check after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleEnvironmentMismatch);
  } else {
    handleEnvironmentMismatch();
  }
  
  // Make available globally for debugging
  window.FoamUrlConfig = urlConfig;
}

module.exports = urlConfig;