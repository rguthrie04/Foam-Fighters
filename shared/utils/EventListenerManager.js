/**
 * Event Listener Management System
 * Managed event listeners with automatic cleanup to prevent memory leaks
 */

class EventListenerManager {
  constructor() {
    this.listeners = new Map();
    this.nextId = 1;
    
    // Automatic cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.removeAllListeners();
      });
    }
  }

  /**
   * Safe addEventListener with automatic tracking and cleanup
   * @param {EventTarget} element - Element to attach listener to
   * @param {string} event - Event type
   * @param {Function} callback - Event handler function
   * @param {Object|boolean} options - Event listener options
   * @param {string} name - Optional name for debugging
   * @returns {number} Listener ID for manual cleanup
   */
  safeAddEventListener(element, event, callback, options = false, name = 'unnamed') {
    if (!element || typeof element.addEventListener !== 'function') {
      console.error('Invalid element provided to safeAddEventListener');
      return null;
    }

    const id = this.nextId++;
    
    try {
      // Wrap callback for error handling
      const wrappedCallback = (e) => {
        try {
          callback(e);
        } catch (error) {
          console.error(`Error in event listener '${name}' for event '${event}':`, error);
        }
      };

      // Add the event listener
      element.addEventListener(event, wrappedCallback, options);
      
      // Track the listener
      this.listeners.set(id, {
        element,
        event,
        callback: wrappedCallback,
        originalCallback: callback,
        options,
        name,
        createdAt: Date.now()
      });
      
      return id;
    } catch (error) {
      console.error(`Error adding event listener '${name}':`, error);
      return null;
    }
  }

  /**
   * Remove a specific event listener
   * @param {number} id - Listener ID returned by safeAddEventListener
   */
  removeEventListener(id) {
    const listener = this.listeners.get(id);
    if (listener) {
      try {
        listener.element.removeEventListener(listener.event, listener.callback, listener.options);
        this.listeners.delete(id);
        return true;
      } catch (error) {
        console.error(`Error removing event listener '${listener.name}':`, error);
        this.listeners.delete(id); // Remove from tracking even if removal failed
        return false;
      }
    }
    return false;
  }

  /**
   * Remove all event listeners for a specific element
   * @param {EventTarget} element - Element to remove listeners from
   */
  removeListenersForElement(element) {
    const removedIds = [];
    
    this.listeners.forEach((listener, id) => {
      if (listener.element === element) {
        if (this.removeEventListener(id)) {
          removedIds.push(id);
        }
      }
    });
    
    return removedIds;
  }

  /**
   * Remove all event listeners for a specific event type
   * @param {string} event - Event type to remove
   */
  removeListenersForEvent(event) {
    const removedIds = [];
    
    this.listeners.forEach((listener, id) => {
      if (listener.event === event) {
        if (this.removeEventListener(id)) {
          removedIds.push(id);
        }
      }
    });
    
    return removedIds;
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    const removedIds = [];
    
    this.listeners.forEach((listener, id) => {
      if (this.removeEventListener(id)) {
        removedIds.push(id);
      }
    });
    
    return removedIds;
  }

  /**
   * Get information about active listeners
   */
  getActiveListeners() {
    return Array.from(this.listeners.entries()).map(([id, listener]) => ({
      id,
      name: listener.name,
      event: listener.event,
      element: listener.element.tagName || listener.element.constructor.name,
      createdAt: listener.createdAt,
      age: Date.now() - listener.createdAt
    }));
  }

  /**
   * Clean up old listeners (for debugging)
   * @param {number} maxAge - Maximum age in milliseconds
   */
  cleanupOldListeners(maxAge = 300000) { // 5 minutes default
    const now = Date.now();
    const removedIds = [];
    
    this.listeners.forEach((listener, id) => {
      if (now - listener.createdAt > maxAge) {
        console.warn(`Cleaning up old event listener '${listener.name}' (${now - listener.createdAt}ms old)`);
        if (this.removeEventListener(id)) {
          removedIds.push(id);
        }
      }
    });
    
    return removedIds;
  }

  /**
   * Add multiple event listeners to the same element
   * @param {EventTarget} element - Element to attach listeners to
   * @param {Object} events - Object mapping event types to handlers
   * @param {Object|boolean} options - Event listener options
   * @param {string} namePrefix - Optional name prefix for debugging
   * @returns {Array} Array of listener IDs
   */
  addMultipleListeners(element, events, options = false, namePrefix = 'multi') {
    const ids = [];
    
    Object.entries(events).forEach(([event, callback]) => {
      const id = this.safeAddEventListener(
        element, 
        event, 
        callback, 
        options, 
        `${namePrefix}_${event}`
      );
      if (id) {
        ids.push(id);
      }
    });
    
    return ids;
  }

  /**
   * Add event listener with automatic removal after first trigger
   * @param {EventTarget} element - Element to attach listener to
   * @param {string} event - Event type
   * @param {Function} callback - Event handler function
   * @param {Object|boolean} options - Event listener options
   * @param {string} name - Optional name for debugging
   * @returns {number} Listener ID
   */
  addOneTimeListener(element, event, callback, options = false, name = 'onetime') {
    const id = this.safeAddEventListener(element, event, (e) => {
      callback(e);
      this.removeEventListener(id);
    }, options, name);
    
    return id;
  }

  /**
   * Add event listener with conditional removal
   * @param {EventTarget} element - Element to attach listener to
   * @param {string} event - Event type
   * @param {Function} callback - Event handler function
   * @param {Function} condition - Function that returns true when listener should be removed
   * @param {Object|boolean} options - Event listener options
   * @param {string} name - Optional name for debugging
   * @returns {number} Listener ID
   */
  addConditionalListener(element, event, callback, condition, options = false, name = 'conditional') {
    const id = this.safeAddEventListener(element, event, (e) => {
      callback(e);
      
      if (condition(e)) {
        this.removeEventListener(id);
      }
    }, options, name);
    
    return id;
  }

  /**
   * Add delegated event listener (for dynamic content)
   * @param {EventTarget} parent - Parent element to attach listener to
   * @param {string} event - Event type
   * @param {string} selector - CSS selector for target elements
   * @param {Function} callback - Event handler function
   * @param {Object|boolean} options - Event listener options
   * @param {string} name - Optional name for debugging
   * @returns {number} Listener ID
   */
  addDelegatedListener(parent, event, selector, callback, options = false, name = 'delegated') {
    return this.safeAddEventListener(parent, event, (e) => {
      const target = e.target.closest(selector);
      if (target) {
        callback.call(target, e);
      }
    }, options, name);
  }

  /**
   * Add throttled event listener
   * @param {EventTarget} element - Element to attach listener to
   * @param {string} event - Event type
   * @param {Function} callback - Event handler function
   * @param {number} delay - Throttle delay in milliseconds
   * @param {Object|boolean} options - Event listener options
   * @param {string} name - Optional name for debugging
   * @returns {number} Listener ID
   */
  addThrottledListener(element, event, callback, delay, options = false, name = 'throttled') {
    let lastExecution = 0;
    
    return this.safeAddEventListener(element, event, (e) => {
      const now = Date.now();
      if (now - lastExecution >= delay) {
        lastExecution = now;
        callback(e);
      }
    }, options, name);
  }

  /**
   * Add debounced event listener
   * @param {EventTarget} element - Element to attach listener to
   * @param {string} event - Event type
   * @param {Function} callback - Event handler function
   * @param {number} delay - Debounce delay in milliseconds
   * @param {Object|boolean} options - Event listener options
   * @param {string} name - Optional name for debugging
   * @returns {number} Listener ID
   */
  addDebouncedListener(element, event, callback, delay, options = false, name = 'debounced') {
    let timeoutId = null;
    
    return this.safeAddEventListener(element, event, (e) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => callback(e), delay);
    }, options, name);
  }
}

// Create singleton instance
const eventListenerManager = new EventListenerManager();

// Export convenience functions
function safeAddEventListener(element, event, callback, options, name) {
  return eventListenerManager.safeAddEventListener(element, event, callback, options, name);
}

function safeRemoveEventListener(id) {
  return eventListenerManager.removeEventListener(id);
}

function removeAllEventListeners() {
  return eventListenerManager.removeAllListeners();
}

function getActiveEventListeners() {
  return eventListenerManager.getActiveListeners();
}

function addOneTimeListener(element, event, callback, options, name) {
  return eventListenerManager.addOneTimeListener(element, event, callback, options, name);
}

function addDelegatedListener(parent, event, selector, callback, options, name) {
  return eventListenerManager.addDelegatedListener(parent, event, selector, callback, options, name);
}

function addThrottledListener(element, event, callback, delay, options, name) {
  return eventListenerManager.addThrottledListener(element, event, callback, delay, options, name);
}

function addDebouncedListener(element, event, callback, delay, options, name) {
  return eventListenerManager.addDebouncedListener(element, event, callback, delay, options, name);
}

module.exports = {
  EventListenerManager,
  eventListenerManager,
  safeAddEventListener,
  safeRemoveEventListener,
  removeAllEventListeners,
  getActiveEventListeners,
  addOneTimeListener,
  addDelegatedListener,
  addThrottledListener,
  addDebouncedListener
};

// Make available globally
if (typeof window !== 'undefined') {
  window.FoamEventListenerManager = module.exports;
}