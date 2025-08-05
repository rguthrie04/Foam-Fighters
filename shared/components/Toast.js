/**
 * Toast Notification Component
 * Non-intrusive notifications with automatic dismiss and stacking
 */

const { safeSetTimeout, safeClearTimeout } = require('../utils/TimerManager');
const { safeAddEventListener } = require('../utils/EventListenerManager');
const { safeDebugLog, safeDebugError } = require('../utils/errorHandler');

class ToastManager {
  constructor() {
    this.toasts = new Map();
    this.container = null;
    this.nextId = 1;
    
    this.createContainer();
  }

  /**
   * Create toast container
   */
  createContainer() {
    try {
      this.container = document.createElement('div');
      this.container.className = 'foam-toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
      `;
      
      document.body.appendChild(this.container);
      safeDebugLog('Toast container created');
    } catch (error) {
      safeDebugError('Error creating toast container', error);
    }
  }

  /**
   * Show a toast notification
   */
  show(message, type = 'info', options = {}) {
    try {
      const toastOptions = {
        duration: 5000,
        showCloseButton: true,
        allowHTML: false,
        onClick: null,
        onClose: null,
        ...options
      };

      const toastId = this.nextId++;
      const toast = this.createToast(toastId, message, type, toastOptions);
      
      this.toasts.set(toastId, toast);
      this.container.appendChild(toast.element);

      // Animate in
      requestAnimationFrame(() => {
        toast.element.style.transform = 'translateX(0)';
        toast.element.style.opacity = '1';
      });

      // Auto dismiss
      if (toastOptions.duration > 0) {
        toast.autoCloseTimer = safeSetTimeout(() => {
          this.hide(toastId);
        }, toastOptions.duration, `toast-auto-close-${toastId}`);
      }

      safeDebugLog(`Toast shown: ${type} - ${message}`);
      return toastId;
    } catch (error) {
      safeDebugError('Error showing toast', error);
      return null;
    }
  }

  /**
   * Create toast element
   */
  createToast(id, message, type, options) {
    try {
      const element = document.createElement('div');
      element.className = `foam-toast foam-toast-${type}`;
      element.setAttribute('role', 'alert');
      element.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
      
      // Base styles
      element.style.cssText = `
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        margin-bottom: 10px;
        max-width: 400px;
        min-width: 300px;
        padding: 16px;
        pointer-events: auto;
        position: relative;
        transform: translateX(100%);
        transition: all 0.3s ease;
        opacity: 0;
        border-left: 4px solid;
      `;

      // Type-specific styles
      const typeStyles = {
        success: 'border-left-color: #10b981; background-color: #f0fdf4;',
        error: 'border-left-color: #ef4444; background-color: #fef2f2;',
        warning: 'border-left-color: #f59e0b; background-color: #fffbeb;',
        info: 'border-left-color: #3b82f6; background-color: #eff6ff;'
      };

      element.style.cssText += typeStyles[type] || typeStyles.info;

      // Create content
      const content = document.createElement('div');
      content.className = 'foam-toast-content';
      content.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 12px;
      `;

      // Icon
      const icon = document.createElement('div');
      icon.className = 'foam-toast-icon';
      icon.style.cssText = `
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        margin-top: 2px;
      `;

      const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
      };
      icon.textContent = icons[type] || icons.info;

      // Message
      const messageEl = document.createElement('div');
      messageEl.className = 'foam-toast-message';
      messageEl.style.cssText = `
        flex: 1;
        font-size: 14px;
        line-height: 1.4;
        color: #374151;
      `;

      if (options.allowHTML) {
        messageEl.innerHTML = message;
      } else {
        messageEl.textContent = message;
      }

      content.appendChild(icon);
      content.appendChild(messageEl);

      // Close button
      if (options.showCloseButton) {
        const closeButton = document.createElement('button');
        closeButton.className = 'foam-toast-close';
        closeButton.innerHTML = '×';
        closeButton.setAttribute('aria-label', 'Close notification');
        closeButton.style.cssText = `
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          font-size: 18px;
          padding: 0;
          position: absolute;
          right: 8px;
          top: 8px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        `;

        closeButton.addEventListener('click', () => {
          this.hide(id);
        });

        element.appendChild(closeButton);
      }

      element.appendChild(content);

      // Click handler
      if (options.onClick) {
        element.style.cursor = 'pointer';
        element.addEventListener('click', (e) => {
          if (e.target.className !== 'foam-toast-close') {
            options.onClick(id);
          }
        });
      }

      return {
        element,
        autoCloseTimer: null,
        options
      };
    } catch (error) {
      safeDebugError('Error creating toast', error);
      return null;
    }
  }

  /**
   * Hide a toast
   */
  hide(toastId) {
    try {
      const toast = this.toasts.get(toastId);
      if (!toast) return;

      // Clear auto-close timer
      if (toast.autoCloseTimer) {
        safeClearTimeout(toast.autoCloseTimer);
      }

      // Animate out
      toast.element.style.transform = 'translateX(100%)';
      toast.element.style.opacity = '0';

      // Remove after animation
      safeSetTimeout(() => {
        if (toast.element.parentNode) {
          toast.element.parentNode.removeChild(toast.element);
        }
        this.toasts.delete(toastId);

        // Call onClose callback
        if (toast.options.onClose) {
          toast.options.onClose(toastId);
        }
      }, 300, `toast-remove-${toastId}`);

      safeDebugLog(`Toast hidden: ${toastId}`);
    } catch (error) {
      safeDebugError('Error hiding toast', error);
    }
  }

  /**
   * Hide all toasts
   */
  hideAll() {
    try {
      const toastIds = Array.from(this.toasts.keys());
      toastIds.forEach(id => this.hide(id));
    } catch (error) {
      safeDebugError('Error hiding all toasts', error);
    }
  }

  /**
   * Show success toast
   */
  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  /**
   * Show error toast
   */
  error(message, options = {}) {
    return this.show(message, 'error', { duration: 0, ...options });
  }

  /**
   * Show warning toast
   */
  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }

  /**
   * Show info toast
   */
  info(message, options = {}) {
    return this.show(message, 'info', options);
  }

  /**
   * Get active toast count
   */
  getActiveCount() {
    return this.toasts.size;
  }

  /**
   * Destroy toast manager
   */
  destroy() {
    try {
      this.hideAll();
      
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      
      this.container = null;
      this.toasts.clear();
      
      safeDebugLog('Toast manager destroyed');
    } catch (error) {
      safeDebugError('Error destroying toast manager', error);
    }
  }
}

// Create singleton instance
const toastManager = new ToastManager();

// Export convenience functions
function showToast(message, type, options) {
  return toastManager.show(message, type, options);
}

function hideToast(toastId) {
  return toastManager.hide(toastId);
}

function hideAllToasts() {
  return toastManager.hideAll();
}

function showSuccess(message, options) {
  return toastManager.success(message, options);
}

function showError(message, options) {
  return toastManager.error(message, options);
}

function showWarning(message, options) {
  return toastManager.warning(message, options);
}

function showInfo(message, options) {
  return toastManager.info(message, options);
}

module.exports = {
  ToastManager,
  toastManager,
  showToast,
  hideToast,
  hideAllToasts,
  showSuccess,
  showError,
  showWarning,
  showInfo
};

// Make available globally
if (typeof window !== 'undefined') {
  window.FoamToast = module.exports;
}