/**
 * Reusable Modal Component
 * Accessible modal with proper focus management and escape handling
 */

const { safeAddEventListener, safeRemoveEventListener } = require('../utils/EventListenerManager');
const { safeDebugLog, safeDebugError } = require('../utils/errorHandler');

class Modal {
  constructor(options = {}) {
    this.options = {
      closeOnEscape: true,
      closeOnBackdrop: true,
      trapFocus: true,
      autoFocus: true,
      className: 'foam-modal',
      backdropClassName: 'foam-modal-backdrop',
      ...options
    };

    this.isOpen = false;
    this.element = null;
    this.backdrop = null;
    this.previouslyFocusedElement = null;
    this.listenerIds = [];

    this.createModal();
  }

  /**
   * Create the modal HTML structure
   */
  createModal() {
    try {
      // Create backdrop
      this.backdrop = document.createElement('div');
      this.backdrop.className = this.options.backdropClassName;
      this.backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        display: none;
        align-items: center;
        justify-content: center;
      `;

      // Create modal container
      this.element = document.createElement('div');
      this.element.className = this.options.className;
      this.element.setAttribute('role', 'dialog');
      this.element.setAttribute('aria-modal', 'true');
      this.element.style.cssText = `
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
        padding: 0;
        margin: 20px;
        position: relative;
      `;

      // Create modal content container
      this.content = document.createElement('div');
      this.content.className = 'foam-modal-content';
      this.content.style.cssText = `
        padding: 20px;
      `;

      this.element.appendChild(this.content);
      this.backdrop.appendChild(this.element);

      // Add to body
      document.body.appendChild(this.backdrop);

      this.setupEventListeners();
      
      safeDebugLog('Modal created successfully');
    } catch (error) {
      safeDebugError('Error creating modal', error);
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    try {
      // Close on backdrop click
      if (this.options.closeOnBackdrop) {
        const backdropId = safeAddEventListener(this.backdrop, 'click', (e) => {
          if (e.target === this.backdrop) {
            this.close();
          }
        }, false, 'modal-backdrop-click');
        
        if (backdropId) this.listenerIds.push(backdropId);
      }

      // Close on escape key
      if (this.options.closeOnEscape) {
        const escapeId = safeAddEventListener(document, 'keydown', (e) => {
          if (e.key === 'Escape' && this.isOpen) {
            this.close();
          }
        }, false, 'modal-escape-key');
        
        if (escapeId) this.listenerIds.push(escapeId);
      }

      // Focus trap
      if (this.options.trapFocus) {
        const focusId = safeAddEventListener(document, 'keydown', (e) => {
          if (e.key === 'Tab' && this.isOpen) {
            this.handleTabKey(e);
          }
        }, false, 'modal-focus-trap');
        
        if (focusId) this.listenerIds.push(focusId);
      }
    } catch (error) {
      safeDebugError('Error setting up modal event listeners', error);
    }
  }

  /**
   * Handle tab key for focus trapping
   */
  handleTabKey(e) {
    try {
      const focusableElements = this.getFocusableElements();
      
      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    } catch (error) {
      safeDebugError('Error handling tab key in modal', error);
    }
  }

  /**
   * Get all focusable elements within the modal
   */
  getFocusableElements() {
    try {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
      ];

      const elements = this.element.querySelectorAll(focusableSelectors.join(', '));
      return Array.from(elements).filter(el => {
        return el.offsetWidth > 0 && el.offsetHeight > 0;
      });
    } catch (error) {
      safeDebugError('Error getting focusable elements', error);
      return [];
    }
  }

  /**
   * Open the modal
   */
  open() {
    try {
      if (this.isOpen) return;

      // Store previously focused element
      this.previouslyFocusedElement = document.activeElement;

      // Show modal
      this.backdrop.style.display = 'flex';
      this.isOpen = true;

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Focus management
      if (this.options.autoFocus) {
        const focusableElements = this.getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          this.element.focus();
        }
      }

      // Trigger open event
      this.element.dispatchEvent(new CustomEvent('modal:open'));
      
      safeDebugLog('Modal opened');
    } catch (error) {
      safeDebugError('Error opening modal', error);
    }
  }

  /**
   * Close the modal
   */
  close() {
    try {
      if (!this.isOpen) return;

      // Hide modal
      this.backdrop.style.display = 'none';
      this.isOpen = false;

      // Restore body scroll
      document.body.style.overflow = '';

      // Restore focus
      if (this.previouslyFocusedElement) {
        this.previouslyFocusedElement.focus();
        this.previouslyFocusedElement = null;
      }

      // Trigger close event
      this.element.dispatchEvent(new CustomEvent('modal:close'));
      
      safeDebugLog('Modal closed');
    } catch (error) {
      safeDebugError('Error closing modal', error);
    }
  }

  /**
   * Set modal content
   */
  setContent(content) {
    try {
      if (typeof content === 'string') {
        this.content.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        this.content.innerHTML = '';
        this.content.appendChild(content);
      }
    } catch (error) {
      safeDebugError('Error setting modal content', error);
    }
  }

  /**
   * Set modal title
   */
  setTitle(title) {
    try {
      let titleElement = this.element.querySelector('.foam-modal-title');
      
      if (!titleElement) {
        titleElement = document.createElement('h2');
        titleElement.className = 'foam-modal-title';
        titleElement.style.cssText = `
          margin: 0 0 20px 0;
          font-size: 1.5em;
          font-weight: 600;
        `;
        this.content.insertBefore(titleElement, this.content.firstChild);
      }

      titleElement.textContent = title;
      this.element.setAttribute('aria-labelledby', 'foam-modal-title');
      titleElement.id = 'foam-modal-title';
    } catch (error) {
      safeDebugError('Error setting modal title', error);
    }
  }

  /**
   * Add close button
   */
  addCloseButton(text = '×') {
    try {
      const closeButton = document.createElement('button');
      closeButton.innerHTML = text;
      closeButton.className = 'foam-modal-close';
      closeButton.setAttribute('aria-label', 'Close modal');
      closeButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 15px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      const closeId = safeAddEventListener(closeButton, 'click', () => {
        this.close();
      }, false, 'modal-close-button');
      
      if (closeId) this.listenerIds.push(closeId);

      this.element.appendChild(closeButton);
    } catch (error) {
      safeDebugError('Error adding close button', error);
    }
  }

  /**
   * Destroy the modal and clean up
   */
  destroy() {
    try {
      // Close if open
      if (this.isOpen) {
        this.close();
      }

      // Remove event listeners
      this.listenerIds.forEach(id => {
        safeRemoveEventListener(id);
      });
      this.listenerIds = [];

      // Remove from DOM
      if (this.backdrop && this.backdrop.parentNode) {
        this.backdrop.parentNode.removeChild(this.backdrop);
      }

      // Clear references
      this.element = null;
      this.backdrop = null;
      this.content = null;
      this.previouslyFocusedElement = null;

      safeDebugLog('Modal destroyed');
    } catch (error) {
      safeDebugError('Error destroying modal', error);
    }
  }
}

// Export the Modal class
module.exports = Modal;

// Make available globally
if (typeof window !== 'undefined') {
  window.FoamModal = Modal;
}