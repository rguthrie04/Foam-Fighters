/**
 * Loading Spinner Component
 * Accessible loading indicator with customizable styles
 */

const { safeDebugLog, safeDebugError } = require('../utils/errorHandler');

class LoadingSpinner {
  constructor(options = {}) {
    this.options = {
      size: 'medium',
      color: '#3b82f6',
      text: 'Loading...',
      showText: true,
      overlay: false,
      className: 'foam-spinner',
      ...options
    };

    this.element = null;
    this.isVisible = false;
    
    this.createElement();
  }

  /**
   * Create the spinner element
   */
  createElement() {
    try {
      this.element = document.createElement('div');
      this.element.className = this.options.className;
      this.element.setAttribute('role', 'status');
      this.element.setAttribute('aria-live', 'polite');
      this.element.setAttribute('aria-label', this.options.text);

      // Size configurations
      const sizes = {
        small: { size: '20px', border: '2px' },
        medium: { size: '40px', border: '3px' },
        large: { size: '60px', border: '4px' }
      };

      const sizeConfig = sizes[this.options.size] || sizes.medium;

      // Base styles
      let styles = `
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      `;

      // Overlay styles
      if (this.options.overlay) {
        styles = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(255, 255, 255, 0.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          gap: 12px;
        `;
      }

      this.element.style.cssText = styles;

      // Create spinner circle
      const spinner = document.createElement('div');
      spinner.className = 'foam-spinner-circle';
      spinner.style.cssText = `
        width: ${sizeConfig.size};
        height: ${sizeConfig.size};
        border: ${sizeConfig.border} solid #f3f3f3;
        border-top: ${sizeConfig.border} solid ${this.options.color};
        border-radius: 50%;
        animation: foam-spin 1s linear infinite;
      `;

      this.element.appendChild(spinner);

      // Add text if enabled
      if (this.options.showText) {
        const text = document.createElement('div');
        text.className = 'foam-spinner-text';
        text.textContent = this.options.text;
        text.style.cssText = `
          font-size: 14px;
          color: #6b7280;
          text-align: center;
        `;
        this.element.appendChild(text);
      }

      // Add CSS animation if not already present
      this.addSpinnerAnimation();

      safeDebugLog('Loading spinner created');
    } catch (error) {
      safeDebugError('Error creating loading spinner', error);
    }
  }

  /**
   * Add CSS animation for spinner
   */
  addSpinnerAnimation() {
    try {
      const animationId = 'foam-spinner-animation';
      
      // Check if animation already exists
      if (document.getElementById(animationId)) {
        return;
      }

      const style = document.createElement('style');
      style.id = animationId;
      style.textContent = `
        @keyframes foam-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      
      document.head.appendChild(style);
    } catch (error) {
      safeDebugError('Error adding spinner animation', error);
    }
  }

  /**
   * Show the spinner
   */
  show(parent = document.body) {
    try {
      if (this.isVisible) return;

      parent.appendChild(this.element);
      this.isVisible = true;

      safeDebugLog('Loading spinner shown');
    } catch (error) {
      safeDebugError('Error showing loading spinner', error);
    }
  }

  /**
   * Hide the spinner
   */
  hide() {
    try {
      if (!this.isVisible) return;

      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      
      this.isVisible = false;

      safeDebugLog('Loading spinner hidden');
    } catch (error) {
      safeDebugError('Error hiding loading spinner', error);
    }
  }

  /**
   * Update spinner text
   */
  setText(text) {
    try {
      this.options.text = text;
      this.element.setAttribute('aria-label', text);

      const textElement = this.element.querySelector('.foam-spinner-text');
      if (textElement) {
        textElement.textContent = text;
      }
    } catch (error) {
      safeDebugError('Error updating spinner text', error);
    }
  }

  /**
   * Update spinner color
   */
  setColor(color) {
    try {
      this.options.color = color;
      const circle = this.element.querySelector('.foam-spinner-circle');
      if (circle) {
        const currentBorder = circle.style.borderTopWidth;
        circle.style.borderTop = `${currentBorder} solid ${color}`;
      }
    } catch (error) {
      safeDebugError('Error updating spinner color', error);
    }
  }

  /**
   * Destroy the spinner
   */
  destroy() {
    try {
      this.hide();
      this.element = null;
      
      safeDebugLog('Loading spinner destroyed');
    } catch (error) {
      safeDebugError('Error destroying loading spinner', error);
    }
  }
}

// Static methods for common use cases
LoadingSpinner.showOverlay = function(text = 'Loading...', options = {}) {
  const spinner = new LoadingSpinner({
    overlay: true,
    text: text,
    ...options
  });
  
  spinner.show();
  return spinner;
};

LoadingSpinner.showInElement = function(element, text = 'Loading...', options = {}) {
  const spinner = new LoadingSpinner({
    text: text,
    ...options
  });
  
  spinner.show(element);
  return spinner;
};

// Global spinner management
class GlobalSpinnerManager {
  constructor() {
    this.spinners = new Map();
    this.nextId = 1;
  }

  /**
   * Show a global loading spinner
   */
  show(text = 'Loading...', options = {}) {
    const id = this.nextId++;
    const spinner = LoadingSpinner.showOverlay(text, options);
    this.spinners.set(id, spinner);
    return id;
  }

  /**
   * Hide a specific spinner
   */
  hide(spinnerId) {
    const spinner = this.spinners.get(spinnerId);
    if (spinner) {
      spinner.destroy();
      this.spinners.delete(spinnerId);
      return true;
    }
    return false;
  }

  /**
   * Hide all spinners
   */
  hideAll() {
    this.spinners.forEach(spinner => {
      spinner.destroy();
    });
    this.spinners.clear();
  }

  /**
   * Update spinner text
   */
  updateText(spinnerId, text) {
    const spinner = this.spinners.get(spinnerId);
    if (spinner) {
      spinner.setText(text);
      return true;
    }
    return false;
  }

  /**
   * Get active spinner count
   */
  getActiveCount() {
    return this.spinners.size;
  }
}

// Create singleton manager
const globalSpinnerManager = new GlobalSpinnerManager();

// Export convenience functions
function showSpinner(text, options) {
  return globalSpinnerManager.show(text, options);
}

function hideSpinner(spinnerId) {
  return globalSpinnerManager.hide(spinnerId);
}

function hideAllSpinners() {
  return globalSpinnerManager.hideAll();
}

function updateSpinnerText(spinnerId, text) {
  return globalSpinnerManager.updateText(spinnerId, text);
}

function createSpinner(options) {
  return new LoadingSpinner(options);
}

module.exports = {
  LoadingSpinner,
  GlobalSpinnerManager,
  globalSpinnerManager,
  showSpinner,
  hideSpinner,
  hideAllSpinners,
  updateSpinnerText,
  createSpinner
};

// Make available globally
if (typeof window !== 'undefined') {
  window.FoamLoadingSpinner = module.exports;
}