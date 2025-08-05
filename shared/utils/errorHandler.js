/**
 * Centralized Error Handling & Logging System
 * Defensive functions for safe logging and error management
 */

class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 1000;
    this.debugMode = this.isDebugMode();
    
    // Set up global error handlers
    this.setupGlobalErrorHandlers();
  }

  /**
   * Detect if we're in debug mode
   */
  isDebugMode() {
    if (typeof window !== 'undefined') {
      return window.location.hostname === 'localhost' || 
             window.location.hostname === '127.0.0.1' ||
             window.location.search.includes('debug=true');
    }
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Safe debug logging function
   */
  safeDebugLog(message, data = null) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level: 'DEBUG',
        message,
        data
      };

      // Add to internal log
      this.addToLog(logEntry);

      // Try to use global FoamUtils debugLog first
      if (typeof window !== 'undefined' && window.FoamUtils && window.FoamUtils.debugLog) {
        window.FoamUtils.debugLog(message, data);
      } else if (console && console.log) {
        if (this.debugMode) {
          if (data !== null) {
            console.log(`[DEBUG ${timestamp}] ${message}`, data);
          } else {
            console.log(`[DEBUG ${timestamp}] ${message}`);
          }
        }
      }
    } catch (e) {
      // Silent fail - no error logging in error logger
    }
  }

  /**
   * Safe error logging function
   */
  safeDebugError(message, error = null) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level: 'ERROR',
        message,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code
        } : null
      };

      // Add to internal log
      this.addToLog(logEntry);

      // Try to use global FoamUtils debugError first
      if (typeof window !== 'undefined' && window.FoamUtils && window.FoamUtils.debugError) {
        window.FoamUtils.debugError(message, error);
      } else if (console && console.error) {
        if (error) {
          console.error(`[ERROR ${timestamp}] ${message}`, error);
        } else {
          console.error(`[ERROR ${timestamp}] ${message}`);
        }
      }

      // In production, could send to error tracking service
      if (!this.debugMode && error) {
        this.reportErrorToService(message, error);
      }
    } catch (e) {
      // Silent fail - no error logging in error logger
    }
  }

  /**
   * Safe warning logging function
   */
  safeDebugWarn(message, data = null) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level: 'WARN',
        message,
        data
      };

      // Add to internal log
      this.addToLog(logEntry);

      // Try to use global FoamUtils debugWarn first
      if (typeof window !== 'undefined' && window.FoamUtils && window.FoamUtils.debugWarn) {
        window.FoamUtils.debugWarn(message, data);
      } else if (console && console.warn) {
        if (data !== null) {
          console.warn(`[WARN ${timestamp}] ${message}`, data);
        } else {
          console.warn(`[WARN ${timestamp}] ${message}`);
        }
      }
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Safe info logging function
   */
  safeDebugInfo(message, data = null) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level: 'INFO',
        message,
        data
      };

      // Add to internal log
      this.addToLog(logEntry);

      if (console && console.info) {
        if (this.debugMode) {
          if (data !== null) {
            console.info(`[INFO ${timestamp}] ${message}`, data);
          } else {
            console.info(`[INFO ${timestamp}] ${message}`);
          }
        }
      }
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Add entry to internal log
   */
  addToLog(logEntry) {
    try {
      this.errorLog.push(logEntry);
      
      // Trim log if it gets too large
      if (this.errorLog.length > this.maxLogSize) {
        this.errorLog = this.errorLog.slice(-this.maxLogSize / 2);
      }
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Handle unhandled errors gracefully
   */
  handleError(error, context = 'Unknown') {
    try {
      const errorInfo = {
        context,
        timestamp: new Date().toISOString(),
        error: {
          name: error.name || 'UnknownError',
          message: error.message || 'No error message',
          stack: error.stack || 'No stack trace',
          code: error.code || null
        },
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
        url: typeof window !== 'undefined' ? window.location.href : null
      };

      this.safeDebugError(`Unhandled error in ${context}`, error);
      
      // Store error for debugging
      this.addToLog({
        timestamp: errorInfo.timestamp,
        level: 'CRITICAL',
        message: `Unhandled error in ${context}`,
        error: errorInfo.error,
        context: errorInfo
      });

      return errorInfo;
    } catch (e) {
      // Last resort - try basic console.error
      try {
        console.error('Critical error in error handler:', e);
        console.error('Original error:', error);
      } catch (e2) {
        // Complete failure - silent
      }
    }
  }

  /**
   * Wrap a function with error handling
   */
  wrapFunction(fn, context = 'Function') {
    return (...args) => {
      try {
        const result = fn.apply(this, args);
        
        // Handle async functions
        if (result && typeof result.catch === 'function') {
          return result.catch(error => {
            this.handleError(error, context);
            throw error;
          });
        }
        
        return result;
      } catch (error) {
        this.handleError(error, context);
        throw error;
      }
    };
  }

  /**
   * Wrap an async function with error handling
   */
  wrapAsync(fn, context = 'AsyncFunction') {
    return async (...args) => {
      try {
        return await fn.apply(this, args);
      } catch (error) {
        this.handleError(error, context);
        throw error;
      }
    };
  }

  /**
   * Setup global error handlers
   */
  setupGlobalErrorHandlers() {
    if (typeof window !== 'undefined') {
      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, 'UnhandledPromiseRejection');
      });

      // Handle regular JavaScript errors
      window.addEventListener('error', (event) => {
        this.handleError(event.error || new Error(event.message), 'GlobalError');
      });
    }

    // Node.js environment
    if (typeof process !== 'undefined') {
      process.on('unhandledRejection', (reason, promise) => {
        this.handleError(reason, 'UnhandledPromiseRejection');
      });

      process.on('uncaughtException', (error) => {
        this.handleError(error, 'UncaughtException');
      });
    }
  }

  /**
   * Report error to external service (placeholder)
   */
  reportErrorToService(message, error) {
    try {
      // This would typically send to a service like Sentry, LogRocket, etc.
      // For now, just store locally
      const errorReport = {
        message,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : null,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : null
      };

      // Store in localStorage for debugging
      if (typeof window !== 'undefined' && window.localStorage) {
        const existingReports = JSON.parse(localStorage.getItem('foam_error_reports') || '[]');
        existingReports.push(errorReport);
        
        // Keep only last 50 reports
        const trimmedReports = existingReports.slice(-50);
        localStorage.setItem('foam_error_reports', JSON.stringify(trimmedReports));
      }
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Get recent error logs
   */
  getRecentLogs(count = 50) {
    try {
      return this.errorLog.slice(-count);
    } catch (e) {
      return [];
    }
  }

  /**
   * Clear error logs
   */
  clearLogs() {
    try {
      this.errorLog = [];
      
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('foam_error_reports');
      }
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    try {
      const stats = {
        total: this.errorLog.length,
        byLevel: {},
        recent: {
          lastHour: 0,
          lastDay: 0
        }
      };

      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      const oneDay = 24 * oneHour;

      this.errorLog.forEach(log => {
        // Count by level
        stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;

        // Count recent errors
        const logTime = new Date(log.timestamp).getTime();
        if (now - logTime < oneHour) {
          stats.recent.lastHour++;
        }
        if (now - logTime < oneDay) {
          stats.recent.lastDay++;
        }
      });

      return stats;
    } catch (e) {
      return { total: 0, byLevel: {}, recent: { lastHour: 0, lastDay: 0 } };
    }
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Export convenience functions (matching the plan's API)
function safeDebugLog(message, data) {
  errorHandler.safeDebugLog(message, data);
}

function safeDebugError(message, error) {
  errorHandler.safeDebugError(message, error);
}

function safeDebugWarn(message, data) {
  errorHandler.safeDebugWarn(message, data);
}

function safeDebugInfo(message, data) {
  errorHandler.safeDebugInfo(message, data);
}

function handleError(error, context) {
  return errorHandler.handleError(error, context);
}

function wrapFunction(fn, context) {
  return errorHandler.wrapFunction(fn, context);
}

function wrapAsync(fn, context) {
  return errorHandler.wrapAsync(fn, context);
}

function getRecentLogs(count) {
  return errorHandler.getRecentLogs(count);
}

function clearErrorLogs() {
  return errorHandler.clearLogs();
}

function getErrorStats() {
  return errorHandler.getErrorStats();
}

module.exports = {
  ErrorHandler,
  errorHandler,
  safeDebugLog,
  safeDebugError,
  safeDebugWarn,
  safeDebugInfo,
  handleError,
  wrapFunction,
  wrapAsync,
  getRecentLogs,
  clearErrorLogs,
  getErrorStats
};

// Make available globally
if (typeof window !== 'undefined') {
  window.FoamErrorHandler = module.exports;
  
  // Set up global debugging utilities as specified in the plan
  window.FoamUtils = {
    debugLog: safeDebugLog,
    debugError: safeDebugError,
    debugWarn: safeDebugWarn,
    debugInfo: safeDebugInfo
  };
}