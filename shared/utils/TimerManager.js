/**
 * Timer Management System
 * Automatic cleanup of timeouts and intervals to prevent memory leaks
 */

class TimerManager {
  constructor() {
    this.timeouts = new Map();
    this.intervals = new Map();
    this.nextId = 1;
    
    // Automatic cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.clearAll();
      });
    }
  }

  /**
   * Safe setTimeout with automatic tracking and cleanup
   * @param {Function} callback - Function to execute
   * @param {number} delay - Delay in milliseconds
   * @param {string} name - Optional name for debugging
   * @returns {number} Timer ID for manual cleanup
   */
  safeSetTimeout(callback, delay, name = 'unnamed') {
    const id = this.nextId++;
    
    try {
      const timerId = setTimeout(() => {
        // Remove from tracking when executed
        this.timeouts.delete(id);
        
        try {
          callback();
        } catch (error) {
          console.error(`Error in timeout callback '${name}':`, error);
        }
      }, delay);
      
      // Track the timeout
      this.timeouts.set(id, {
        timerId,
        name,
        createdAt: Date.now(),
        delay
      });
      
      return id;
    } catch (error) {
      console.error(`Error creating timeout '${name}':`, error);
      return null;
    }
  }

  /**
   * Safe setInterval with automatic tracking and cleanup
   * @param {Function} callback - Function to execute
   * @param {number} delay - Interval in milliseconds
   * @param {string} name - Optional name for debugging
   * @returns {number} Timer ID for manual cleanup
   */
  safeSetInterval(callback, delay, name = 'unnamed') {
    const id = this.nextId++;
    
    try {
      const timerId = setInterval(() => {
        try {
          callback();
        } catch (error) {
          console.error(`Error in interval callback '${name}':`, error);
          // Consider clearing the interval on repeated errors
          this.clearInterval(id);
        }
      }, delay);
      
      // Track the interval
      this.intervals.set(id, {
        timerId,
        name,
        createdAt: Date.now(),
        delay
      });
      
      return id;
    } catch (error) {
      console.error(`Error creating interval '${name}':`, error);
      return null;
    }
  }

  /**
   * Clear a specific timeout
   * @param {number} id - Timer ID returned by safeSetTimeout
   */
  clearTimeout(id) {
    const timer = this.timeouts.get(id);
    if (timer) {
      clearTimeout(timer.timerId);
      this.timeouts.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Clear a specific interval
   * @param {number} id - Timer ID returned by safeSetInterval
   */
  clearInterval(id) {
    const timer = this.intervals.get(id);
    if (timer) {
      clearInterval(timer.timerId);
      this.intervals.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Clear all timeouts
   */
  clearAllTimeouts() {
    this.timeouts.forEach((timer, id) => {
      clearTimeout(timer.timerId);
    });
    this.timeouts.clear();
  }

  /**
   * Clear all intervals
   */
  clearAllIntervals() {
    this.intervals.forEach((timer, id) => {
      clearInterval(timer.timerId);
    });
    this.intervals.clear();
  }

  /**
   * Clear all timers (timeouts and intervals)
   */
  clearAll() {
    this.clearAllTimeouts();
    this.clearAllIntervals();
  }

  /**
   * Get information about active timers
   */
  getActiveTimers() {
    return {
      timeouts: Array.from(this.timeouts.entries()).map(([id, timer]) => ({
        id,
        name: timer.name,
        createdAt: timer.createdAt,
        delay: timer.delay,
        age: Date.now() - timer.createdAt
      })),
      intervals: Array.from(this.intervals.entries()).map(([id, timer]) => ({
        id,
        name: timer.name,
        createdAt: timer.createdAt,
        delay: timer.delay,
        age: Date.now() - timer.createdAt
      }))
    };
  }

  /**
   * Clean up old timers (for debugging)
   * @param {number} maxAge - Maximum age in milliseconds
   */
  cleanupOldTimers(maxAge = 300000) { // 5 minutes default
    const now = Date.now();
    
    // Clean up old timeouts
    this.timeouts.forEach((timer, id) => {
      if (now - timer.createdAt > maxAge) {
        console.warn(`Cleaning up old timeout '${timer.name}' (${now - timer.createdAt}ms old)`);
        this.clearTimeout(id);
      }
    });
    
    // Clean up old intervals
    this.intervals.forEach((timer, id) => {
      if (now - timer.createdAt > maxAge) {
        console.warn(`Cleaning up old interval '${timer.name}' (${now - timer.createdAt}ms old)`);
        this.clearInterval(id);
      }
    });
  }

  /**
   * Delayed execution with automatic cleanup
   * @param {Function} callback - Function to execute
   * @param {number} delay - Delay in milliseconds
   * @param {string} name - Optional name for debugging
   * @returns {Promise} Promise that resolves when callback completes
   */
  delay(callback, delay, name = 'delay') {
    return new Promise((resolve, reject) => {
      const timerId = this.safeSetTimeout(async () => {
        try {
          const result = await callback();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay, name);
      
      if (!timerId) {
        reject(new Error('Failed to create timeout'));
      }
    });
  }

  /**
   * Debounced function execution
   * @param {Function} callback - Function to execute
   * @param {number} delay - Debounce delay in milliseconds
   * @param {string} name - Optional name for debugging
   * @returns {Function} Debounced function
   */
  debounce(callback, delay, name = 'debounce') {
    let timerId = null;
    
    return (...args) => {
      if (timerId) {
        this.clearTimeout(timerId);
      }
      
      timerId = this.safeSetTimeout(() => {
        callback.apply(this, args);
        timerId = null;
      }, delay, name);
    };
  }

  /**
   * Throttled function execution
   * @param {Function} callback - Function to execute
   * @param {number} delay - Throttle delay in milliseconds
   * @param {string} name - Optional name for debugging
   * @returns {Function} Throttled function
   */
  throttle(callback, delay, name = 'throttle') {
    let lastExecution = 0;
    let timerId = null;
    
    return (...args) => {
      const now = Date.now();
      const timeSinceLastExecution = now - lastExecution;
      
      if (timeSinceLastExecution >= delay) {
        lastExecution = now;
        callback.apply(this, args);
      } else if (!timerId) {
        timerId = this.safeSetTimeout(() => {
          lastExecution = Date.now();
          callback.apply(this, args);
          timerId = null;
        }, delay - timeSinceLastExecution, name);
      }
    };
  }
}

// Create singleton instance
const timerManager = new TimerManager();

// Export convenience functions
function safeSetTimeout(callback, delay, name) {
  return timerManager.safeSetTimeout(callback, delay, name);
}

function safeSetInterval(callback, delay, name) {
  return timerManager.safeSetInterval(callback, delay, name);
}

function safeClearTimeout(id) {
  return timerManager.clearTimeout(id);
}

function safeClearInterval(id) {
  return timerManager.clearInterval(id);
}

function clearAllTimers() {
  return timerManager.clearAll();
}

function getActiveTimers() {
  return timerManager.getActiveTimers();
}

function delay(callback, delayMs, name) {
  return timerManager.delay(callback, delayMs, name);
}

function debounce(callback, delayMs, name) {
  return timerManager.debounce(callback, delayMs, name);
}

function throttle(callback, delayMs, name) {
  return timerManager.throttle(callback, delayMs, name);
}

module.exports = {
  TimerManager,
  timerManager,
  safeSetTimeout,
  safeSetInterval,
  safeClearTimeout,
  safeClearInterval,
  clearAllTimers,
  getActiveTimers,
  delay,
  debounce,
  throttle
};

// Make available globally
if (typeof window !== 'undefined') {
  window.FoamTimerManager = module.exports;
}