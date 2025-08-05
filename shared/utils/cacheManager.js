/**
 * Cache Management System
 * Cache-busting and cache management utilities to prevent navigation issues
 */

const { safeDebugLog, safeDebugError, safeDebugWarn } = require('./errorHandler');

class CacheManager {
  constructor() {
    this.cacheVersion = Date.now();
    this.isDebugMode = this.detectDebugMode();
    
    // Initialize cache detection
    this.initializeCacheDetection();
  }

  /**
   * Detect if we're in debug/development mode
   */
  detectDebugMode() {
    if (typeof window !== 'undefined') {
      return window.location.hostname === 'localhost' || 
             window.location.hostname === '127.0.0.1' ||
             window.location.search.includes('debug=true');
    }
    return false;
  }

  /**
   * Initialize cache detection and management
   */
  initializeCacheDetection() {
    if (typeof window !== 'undefined') {
      // Check for environment mismatches on load
      this.detectEnvironmentMismatch();
      
      // Set up version checking
      this.checkAppVersion();
      
      safeDebugLog('Cache manager initialized', {
        debugMode: this.isDebugMode,
        cacheVersion: this.cacheVersion,
        userAgent: navigator.userAgent
      });
    }
  }

  /**
   * Detect environment mismatches (localhost URLs in production, etc.)
   */
  detectEnvironmentMismatch() {
    try {
      if (typeof window === 'undefined') return false;

      const currentUrl = window.location.href;
      const hostname = window.location.hostname;
      
      // Check if we're using localhost URLs in a non-localhost environment
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      
      // Look for localhost references in the page
      const scripts = document.querySelectorAll('script[src]');
      const links = document.querySelectorAll('link[href]');
      
      let hasLocalhostReferences = false;
      
      scripts.forEach(script => {
        if (script.src.includes('localhost:5001') && !isLocalhost) {
          safeDebugWarn('Found localhost script reference in non-localhost environment', script.src);
          hasLocalhostReferences = true;
        }
      });
      
      links.forEach(link => {
        if (link.href.includes('localhost') && !isLocalhost) {
          safeDebugWarn('Found localhost link reference in non-localhost environment', link.href);
          hasLocalhostReferences = true;
        }
      });

      // Check for API URL mismatches
      if (window.FoamUrlConfig) {
        const apiUrl = window.FoamUrlConfig.getApiUrl();
        if (apiUrl.includes('localhost:5001') && !isLocalhost) {
          safeDebugWarn('API URL mismatch detected', { apiUrl, currentHostname: hostname });
          hasLocalhostReferences = true;
        }
      }

      if (hasLocalhostReferences) {
        safeDebugError('Environment mismatch detected - cache clearing recommended');
        return true;
      }

      return false;
    } catch (error) {
      safeDebugError('Error detecting environment mismatch', error);
      return false;
    }
  }

  /**
   * Clear all application caches
   */
  async clearAppCache() {
    try {
      safeDebugLog('Starting cache clearing process...');
      
      // Clear Cache API
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames.map(name => {
          safeDebugLog(`Deleting cache: ${name}`);
          return caches.delete(name);
        });
        await Promise.all(deletePromises);
        safeDebugLog(`Cleared ${cacheNames.length} cache stores`);
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        const unregisterPromises = registrations.map(registration => {
          safeDebugLog('Unregistering service worker');
          return registration.unregister();
        });
        await Promise.all(unregisterPromises);
        safeDebugLog(`Unregistered ${registrations.length} service workers`);
      }

      // Clear storage
      this.clearStorage();
      
      safeDebugLog('Cache clearing completed successfully');
      return true;
    } catch (error) {
      safeDebugError('Error clearing cache', error);
      return false;
    }
  }

  /**
   * Clear browser storage
   */
  clearStorage() {
    try {
      // Clear localStorage
      if (typeof localStorage !== 'undefined') {
        const localStorageKeys = Object.keys(localStorage);
        localStorage.clear();
        safeDebugLog(`Cleared localStorage (${localStorageKeys.length} items)`);
      }

      // Clear sessionStorage
      if (typeof sessionStorage !== 'undefined') {
        const sessionStorageKeys = Object.keys(sessionStorage);
        sessionStorage.clear();
        safeDebugLog(`Cleared sessionStorage (${sessionStorageKeys.length} items)`);
      }

      // Clear IndexedDB (basic clearing)
      this.clearIndexedDB();
      
    } catch (error) {
      safeDebugError('Error clearing storage', error);
    }
  }

  /**
   * Clear IndexedDB databases
   */
  async clearIndexedDB() {
    try {
      if ('indexedDB' in window) {
        // Get all databases (if supported)
        if (indexedDB.databases) {
          const databases = await indexedDB.databases();
          const deletePromises = databases.map(db => {
            return new Promise((resolve, reject) => {
              const deleteReq = indexedDB.deleteDatabase(db.name);
              deleteReq.onsuccess = () => resolve(db.name);
              deleteReq.onerror = () => reject(deleteReq.error);
            });
          });
          
          const deletedDbs = await Promise.all(deletePromises);
          safeDebugLog(`Cleared IndexedDB databases: ${deletedDbs.join(', ')}`);
        }
      }
    } catch (error) {
      safeDebugError('Error clearing IndexedDB', error);
    }
  }

  /**
   * Emergency cache clear with page reload
   */
  emergencyCacheClear() {
    try {
      safeDebugWarn('Emergency cache clear initiated');
      
      // Clear what we can synchronously
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }

      // Clear async caches and reload
      this.clearAppCache().then(() => {
        safeDebugLog('Emergency cache clear completed, reloading page...');
        setTimeout(() => {
          window.location.reload(true);
        }, 500);
      }).catch(error => {
        safeDebugError('Emergency cache clear failed, forcing reload', error);
        window.location.reload(true);
      });

    } catch (error) {
      safeDebugError('Emergency cache clear error, forcing reload', error);
      window.location.reload(true);
    }
  }

  /**
   * Add cache busting parameter to URL
   */
  addCacheBust(url, customVersion = null) {
    try {
      const version = customVersion || this.cacheVersion;
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}v=${version}`;
    } catch (error) {
      safeDebugError('Error adding cache bust parameter', error);
      return url;
    }
  }

  /**
   * Load script with cache busting
   */
  loadScript(src, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const script = document.createElement('script');
        const cacheBustedSrc = options.cacheBust !== false ? this.addCacheBust(src) : src;
        
        script.src = cacheBustedSrc;
        script.async = options.async !== false;
        script.defer = options.defer || false;
        
        script.onload = () => {
          safeDebugLog(`Script loaded successfully: ${src}`);
          resolve(script);
        };
        
        script.onerror = (error) => {
          safeDebugError(`Script load error: ${src}`, error);
          reject(new Error(`Failed to load script: ${src}`));
        };
        
        document.head.appendChild(script);
      } catch (error) {
        safeDebugError('Error creating script element', error);
        reject(error);
      }
    });
  }

  /**
   * Load CSS with cache busting
   */
  loadCSS(href, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const link = document.createElement('link');
        const cacheBustedHref = options.cacheBust !== false ? this.addCacheBust(href) : href;
        
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = cacheBustedHref;
        
        link.onload = () => {
          safeDebugLog(`CSS loaded successfully: ${href}`);
          resolve(link);
        };
        
        link.onerror = (error) => {
          safeDebugError(`CSS load error: ${href}`, error);
          reject(new Error(`Failed to load CSS: ${href}`));
        };
        
        document.head.appendChild(link);
      } catch (error) {
        safeDebugError('Error creating link element', error);
        reject(error);
      }
    });
  }

  /**
   * Check application version and clear cache if needed
   */
  checkAppVersion() {
    try {
      const STORAGE_KEY = 'foam_app_version';
      const currentVersion = this.getCurrentAppVersion();
      const storedVersion = localStorage.getItem(STORAGE_KEY);
      
      if (storedVersion && storedVersion !== currentVersion) {
        safeDebugWarn('App version mismatch detected', {
          stored: storedVersion,
          current: currentVersion
        });
        
        // Clear cache and update version
        this.clearAppCache().then(() => {
          localStorage.setItem(STORAGE_KEY, currentVersion);
          safeDebugLog('Cache cleared due to version mismatch');
        });
      } else if (!storedVersion) {
        // First time - just store the version
        localStorage.setItem(STORAGE_KEY, currentVersion);
      }
    } catch (error) {
      safeDebugError('Error checking app version', error);
    }
  }

  /**
   * Get current app version (could be from meta tag, package.json, etc.)
   */
  getCurrentAppVersion() {
    try {
      // Try to get version from meta tag
      const versionMeta = document.querySelector('meta[name="app-version"]');
      if (versionMeta) {
        return versionMeta.content;
      }
      
      // Fallback to build date or cache version
      return this.cacheVersion.toString();
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Create cache-safe URL for assets
   */
  createAssetUrl(path, baseUrl = '') {
    try {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      const fullUrl = `${baseUrl}${cleanPath}`;
      return this.addCacheBust(fullUrl);
    } catch (error) {
      safeDebugError('Error creating asset URL', error);
      return path;
    }
  }

  /**
   * Preload critical resources with cache busting
   */
  preloadResources(resources) {
    try {
      resources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = this.addCacheBust(resource.href);
        link.as = resource.as || 'fetch';
        
        if (resource.type) {
          link.type = resource.type;
        }
        
        document.head.appendChild(link);
      });
      
      safeDebugLog(`Preloaded ${resources.length} resources`);
    } catch (error) {
      safeDebugError('Error preloading resources', error);
    }
  }

  /**
   * Monitor for cache-related issues
   */
  monitorCacheIssues() {
    if (typeof window === 'undefined') return;

    // Monitor for fetch errors that might indicate cache issues
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      return originalFetch.apply(this, args).catch(error => {
        if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
          safeDebugWarn('Fetch error detected - possible cache issue', {
            url: args[0],
            error: error.message
          });
        }
        throw error;
      });
    };

    // Monitor for script load errors
    window.addEventListener('error', (event) => {
      if (event.target && event.target.tagName === 'SCRIPT') {
        safeDebugWarn('Script load error detected', {
          src: event.target.src,
          error: event.message
        });
      }
    });
  }

  /**
   * Get cache status information
   */
  async getCacheStatus() {
    try {
      const status = {
        cacheAPI: 'caches' in window,
        serviceWorker: 'serviceWorker' in navigator,
        localStorage: typeof localStorage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        indexedDB: 'indexedDB' in window,
        cacheCount: 0,
        serviceWorkerCount: 0,
        storageUsed: {
          localStorage: 0,
          sessionStorage: 0
        }
      };

      // Get cache count
      if (status.cacheAPI) {
        const cacheNames = await caches.keys();
        status.cacheCount = cacheNames.length;
        status.cacheNames = cacheNames;
      }

      // Get service worker count
      if (status.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        status.serviceWorkerCount = registrations.length;
      }

      // Get storage usage
      if (status.localStorage) {
        status.storageUsed.localStorage = Object.keys(localStorage).length;
      }
      if (status.sessionStorage) {
        status.storageUsed.sessionStorage = Object.keys(sessionStorage).length;
      }

      return status;
    } catch (error) {
      safeDebugError('Error getting cache status', error);
      return null;
    }
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

// Export convenience functions
function clearAppCache() {
  return cacheManager.clearAppCache();
}

function emergencyCacheClear() {
  return cacheManager.emergencyCacheClear();
}

function addCacheBust(url, version) {
  return cacheManager.addCacheBust(url, version);
}

function loadScript(src, options) {
  return cacheManager.loadScript(src, options);
}

function loadCSS(href, options) {
  return cacheManager.loadCSS(href, options);
}

function createAssetUrl(path, baseUrl) {
  return cacheManager.createAssetUrl(path, baseUrl);
}

function preloadResources(resources) {
  return cacheManager.preloadResources(resources);
}

function getCacheStatus() {
  return cacheManager.getCacheStatus();
}

function detectEnvironmentMismatch() {
  return cacheManager.detectEnvironmentMismatch();
}

module.exports = {
  CacheManager,
  cacheManager,
  clearAppCache,
  emergencyCacheClear,
  addCacheBust,
  loadScript,
  loadCSS,
  createAssetUrl,
  preloadResources,
  getCacheStatus,
  detectEnvironmentMismatch
};

// Make available globally and set up automatic cache management
if (typeof window !== 'undefined') {
  window.FoamCacheManager = module.exports;
  
  // Set up global cache clearing function as specified in the plan
  window.clearAppCache = clearAppCache;
  
  // Monitor for cache issues
  cacheManager.monitorCacheIssues();
  
  // Auto-check for environment mismatches on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (cacheManager.detectEnvironmentMismatch()) {
        safeDebugWarn('Environment mismatch detected on page load');
      }
    });
  } else {
    if (cacheManager.detectEnvironmentMismatch()) {
      safeDebugWarn('Environment mismatch detected');
    }
  }
}