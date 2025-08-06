/**
 * Foam Fighters - Main JavaScript
 * Professional spray foam removal company website
 */

// Browser-compatible utilities (removed Node.js imports for dev server)
// We'll implement browser-safe versions of these utilities

// Safe debug logging
function safeDebugLog(message, data = {}) {
    if (typeof console !== 'undefined' && console.log) {
        console.log(`[Foam Fighters] ${message}`, data);
    }
}

function safeDebugError(message, error = {}) {
    if (typeof console !== 'undefined' && console.error) {
        console.error(`[Foam Fighters ERROR] ${message}`, error);
    }
}

// Safe timer management
function safeSetTimeout(callback, delay, label = '') {
    try {
        return setTimeout(callback, delay);
    } catch (error) {
        safeDebugError('Timer error', error);
    }
}

function safeAddEventListener(element, event, callback, options = false, label = '') {
    try {
        if (element && element.addEventListener) {
            element.addEventListener(event, callback, options);
            return `${label}_${Date.now()}`;
        }
    } catch (error) {
        safeDebugError('Event listener error', error);
    }
    return null;
}

// Simple toast notifications
function showSuccess(message) {
    showToast(message, 'success');
}

function showError(message) {
    showToast(message, 'error');
}

function showWarning(message) {
    showToast(message, 'warning');
}

function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast show toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="toast-body">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close float-end" data-bs-dismiss="toast"></button>
        </div>
    `;

    container.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

// Main application class
class FoamFightersApp {
    constructor() {
        this.isInitialized = false;
        this.listenerIds = [];
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            safeDebugLog('Initializing Foam Fighters website');

            // Initialize performance optimizations first
            await this.initializeLazyLoading();

            // Initialize core components
            await this.initializeNavigation();
            await this.initializeQuoteForm();
            await this.initializeContactForm();
            await this.initializeChatWidget();
            await this.initializeScrollEffects();
            await this.initializeAccessibility();
            await this.initializeAnalytics();

            this.isInitialized = true;
            safeDebugLog('Foam Fighters website initialized successfully');

        } catch (error) {
            safeDebugError('Error initializing website', error);
        }
    }

    /**
     * Initialize navigation functionality
     */
    async initializeNavigation() {
        try {
            const navbar = document.getElementById('mainNavbar');
            if (!navbar) return;

            // Scroll effect for navbar
            const scrollId = safeAddEventListener(window, 'scroll', () => {
                if (window.scrollY > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            }, false, 'navbar-scroll');

            if (scrollId) this.listenerIds.push(scrollId);

            // Smooth scrolling for anchor links
            const anchorLinks = document.querySelectorAll('a[href^="#"]');
            anchorLinks.forEach(link => {
                const clickId = safeAddEventListener(link, 'click', (e) => {
                    e.preventDefault();
                    const targetId = link.getAttribute('href').substring(1);
                    const targetElement = document.getElementById(targetId);
                    
                    if (targetElement) {
                        const offsetTop = targetElement.offsetTop - 80; // Account for fixed navbar
                        window.scrollTo({
                            top: offsetTop,
                            behavior: 'smooth'
                        });
                    }
                }, false, 'smooth-scroll');

                if (clickId) this.listenerIds.push(clickId);
            });

            // Mobile menu close on non-dropdown link click
            const navLinks = document.querySelectorAll('.navbar-nav .nav-link:not(.dropdown-toggle)');
            navLinks.forEach(link => {
                const clickId = safeAddEventListener(link, 'click', () => {
                    const navbarCollapse = document.getElementById('navbarNav');
                    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
                        const bsCollapse = new bootstrap.Collapse(navbarCollapse);
                        bsCollapse.hide();
                    }
                }, false, 'mobile-menu-close');

                if (clickId) this.listenerIds.push(clickId);
            });

            // Handle dropdown item clicks to close mobile menu
            const dropdownItems = document.querySelectorAll('.dropdown-item');
            dropdownItems.forEach(item => {
                const clickId = safeAddEventListener(item, 'click', () => {
                    const navbarCollapse = document.getElementById('navbarNav');
                    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
                        const bsCollapse = new bootstrap.Collapse(navbarCollapse);
                        bsCollapse.hide();
                    }
                }, false, 'dropdown-item-close');

                if (clickId) this.listenerIds.push(clickId);
            });

            // Enhanced mobile dropdown behavior
            this.setupMobileDropdowns();
            
            // Add simple fallback for immediate mobile dropdown functionality
            this.addSimpleMobileDropdownFallback();

            safeDebugLog('Navigation initialized');

        } catch (error) {
            safeDebugError('Error initializing navigation', error);
        }
    }

    /**
     * Initialize quote form functionality
     */
    async initializeQuoteForm() {
        try {
            const quoteForm = document.getElementById('quoteForm');
            if (!quoteForm) return;

            // Form validation and submission
            const submitId = safeAddEventListener(quoteForm, 'submit', async (e) => {
                e.preventDefault();
                await this.handleQuoteSubmission(quoteForm);
            }, false, 'quote-form-submit');

            if (submitId) this.listenerIds.push(submitId);

            // Real-time validation
            const formInputs = quoteForm.querySelectorAll('input, select, textarea');
            formInputs.forEach(input => {
                const blurId = safeAddEventListener(input, 'blur', () => {
                    this.validateField(input);
                }, false, 'form-validation');

                if (blurId) this.listenerIds.push(blurId);
            });

            // Phone number formatting for both quote and contact forms
            const phoneInputs = document.querySelectorAll('input[type="tel"]');
            phoneInputs.forEach(phoneInput => {
                const inputId = safeAddEventListener(phoneInput, 'input', () => {
                    this.formatPhoneNumber(phoneInput);
                }, false, 'phone-formatting');

                if (inputId) this.listenerIds.push(inputId);
            });

            safeDebugLog('Quote form initialized');

        } catch (error) {
            safeDebugError('Error initializing quote form', error);
        }
    }

    /**
     * Initialize contact form functionality
     */
    async initializeContactForm() {
        try {
            const contactForm = document.getElementById('contactForm');
            if (!contactForm) return;

            // Form validation and submission
            const submitId = safeAddEventListener(contactForm, 'submit', async (e) => {
                e.preventDefault();
                await this.handleContactSubmission(contactForm);
            }, false, 'contact-form-submit');

            if (submitId) this.listenerIds.push(submitId);

            // Real-time validation
            const formInputs = contactForm.querySelectorAll('input, select, textarea');
            formInputs.forEach(input => {
                const blurId = safeAddEventListener(input, 'blur', () => {
                    this.validateField(input);
                }, false, 'form-validation');

                if (blurId) this.listenerIds.push(blurId);
            });

            // Phone number formatting for contact form
            const phoneInput = contactForm.querySelector('input[type="tel"]');
            if (phoneInput) {
                const inputId = safeAddEventListener(phoneInput, 'input', () => {
                    this.formatPhoneNumber(phoneInput);
                }, false, 'phone-formatting');

                if (inputId) this.listenerIds.push(inputId);
            }

            safeDebugLog('Contact form initialized');

        } catch (error) {
            safeDebugError('Error initializing contact form', error);
        }
    }

    /**
     * Handle quote form submission
     */
    async handleQuoteSubmission(form) {
        try {
            // Validate form
            if (!this.validateForm(form)) {
                showError('Please correct the errors in the form before submitting.');
                return;
            }

            // Show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            const submitText = submitButton.querySelector('.submit-text');
            const loadingText = submitButton.querySelector('.loading-text');
            
            submitButton.disabled = true;
            submitText.classList.add('d-none');
            loadingText.classList.remove('d-none');

            // Collect form data
            const formData = new FormData(form);
            const inquiryData = {
                name: `${formData.get('firstName')} ${formData.get('lastName')}`.trim(),
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                address: formData.get('address'),
                propertyType: formData.get('propertyType'),
                foamType: formData.get('foamType'),
                estimatedArea: formData.get('estimatedArea') ? parseInt(formData.get('estimatedArea')) : null,
                urgency: formData.get('urgency'),
                subject: formData.get('subject'),
                message: formData.get('message'),
                preferredContact: formData.get('preferredContact'),
                consent: formData.get('consent') === 'on'
            };

            // Submit to API
            // Try window.FirebaseConfig first, fallback to direct API call
            let result;
            if (window.FirebaseConfig && window.FirebaseConfig.apiCall) {
                result = await window.FirebaseConfig.apiCall('/inquiries', {
                    method: 'POST',
                    body: JSON.stringify(inquiryData)
                });
            } else {
                // Fallback direct API call
                const apiUrl = 'https://api-6swwnulcrq-nw.a.run.app/inquiries';
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(inquiryData)
                });
                result = await response.json();
            }

            // Success - result will contain the response data
            showSuccess('Your quote request has been submitted successfully! We\'ll contact you within 24-48 hours.');
            form.reset();
            
            // Track conversion
            this.trackConversion('quote_request', {
                urgency: inquiryData.urgency,
                propertyType: inquiryData.propertyType
            });

            // Show reference number if available
            if (result.inquiry && result.inquiry.referenceNumber) {
                showSuccess('Thank you! Your quote request has been submitted. Reference number: ' + result.inquiry.referenceNumber);
            }

        } catch (error) {
            safeDebugError('Error submitting quote form', error);
            showError('There was an error submitting your request. Please try again or call us directly at 0333 577 0132.');

        } finally {
            // Reset loading state
            const submitButton = form.querySelector('button[type="submit"]');
            const submitText = submitButton.querySelector('.submit-text');
            const loadingText = submitButton.querySelector('.loading-text');
            
            submitButton.disabled = false;
            submitText.classList.remove('d-none');
            loadingText.classList.add('d-none');
        }
    }

    /**
     * Handle contact form submission
     */
    async handleContactSubmission(form) {
        try {
            // Validate form
            if (!this.validateForm(form)) {
                showError('Please correct the errors in the form before submitting.');
                return;
            }

            // Show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            const submitText = submitButton.querySelector('.submit-text') || submitButton;
            const loadingText = submitButton.querySelector('.loading-text');
            
            submitButton.disabled = true;
            if (loadingText) {
                submitText.classList.add('d-none');
                loadingText.classList.remove('d-none');
            } else {
                submitButton.textContent = 'Submitting...';
            }

            // Collect form data
            const formData = new FormData(form);
            
            // Handle checkbox arrays (foam location, issues)
            const foamLocations = Array.from(formData.getAll('foamLocation[]'));
            const issues = Array.from(formData.getAll('issues[]'));

            const contactData = {
                name: `${formData.get('firstName')} ${formData.get('lastName')}`.trim(),
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                propertyType: formData.get('propertyType'),
                urgency: formData.get('urgency'),
                postcode: formData.get('postcode'),
                foamLocation: foamLocations,
                foamAge: formData.get('foamAge'),
                issues: issues,
                message: formData.get('message'),
                
                // Contact-specific fields
                subject: 'Contact Form Submission',
                preferredContact: 'email',
                consent: formData.get('consent') === 'on',
                
                // Add urgency mapping for backend
                urgencyLevel: this.mapContactUrgencyToLevel(formData.get('urgency'))
            };

            // Submit to API
            // Try window.FirebaseConfig first, fallback to direct API call
            let result;
            if (window.FirebaseConfig && window.FirebaseConfig.apiCall) {
                result = await window.FirebaseConfig.apiCall('/inquiries', {
                    method: 'POST',
                    body: JSON.stringify(contactData)
                });
            } else {
                // Fallback direct API call
                const apiUrl = 'https://api-6swwnulcrq-nw.a.run.app/inquiries';
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(contactData)
                });
                result = await response.json();
            }

            // Success
            showSuccess('Thank you for your contact! We\'ll be in touch within 24 hours to discuss your spray foam situation.');
            form.reset();
            
            // Track conversion
            this.trackConversion('contact_form', {
                urgency: contactData.urgency,
                propertyType: contactData.propertyType,
                issues: issues.length
            });

            // Show reference number if available
            if (result.inquiry && result.inquiry.referenceNumber) {
                safeSetTimeout(() => {
                    showSuccess('Your reference number is: ' + result.inquiry.referenceNumber);
                }, 2000);
            }

        } catch (error) {
            safeDebugError('Error submitting contact form', error);
            showError('There was an error submitting your message. Please try again or call us directly at 0333 577 0132.');

        } finally {
            // Reset loading state
            const submitButton = form.querySelector('button[type="submit"]');
            const submitText = submitButton.querySelector('.submit-text') || submitButton;
            const loadingText = submitButton.querySelector('.loading-text');
            
            submitButton.disabled = false;
            if (loadingText) {
                submitText.classList.remove('d-none');
                loadingText.classList.add('d-none');
            } else {
                submitButton.textContent = 'Submit Contact Request';
            }
        }
    }

    /**
     * Map contact form urgency to API urgency level
     */
    mapContactUrgencyToLevel(contactUrgency) {
        const mapping = {
            'planning': 'low',
            'mortgage': 'high',
            'sale': 'urgent',
            'insurance': 'high',
            'emergency': 'urgent'
        };
        return mapping[contactUrgency] || 'medium';
    }

    /**
     * Validate entire form
     */
    validateForm(form) {
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    /**
     * Validate individual field
     */
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        // Clear previous validation
        field.classList.remove('is-invalid', 'is-valid');

        // Required field validation
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'This field is required.';
        }

        // Email validation
        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address.';
            }
        }

        // Phone validation (basic UK format)
        if (field.type === 'tel' && value) {
            const phoneRegex = /^[\+]?[(]?[\d\s\-\(\)]{10,}$/;
            if (!phoneRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number.';
            }
        }

        // Number validation
        if (field.type === 'number' && value) {
            const num = parseInt(value);
            const min = parseInt(field.getAttribute('min'));
            const max = parseInt(field.getAttribute('max'));
            
            if (isNaN(num) || (min && num < min) || (max && num > max)) {
                isValid = false;
                errorMessage = `Please enter a number between ${min || 0} and ${max || 'unlimited'}.`;
            }
        }

        // Apply validation state
        if (isValid && value) {
            field.classList.add('is-valid');
        } else if (!isValid) {
            field.classList.add('is-invalid');
            
            // Update error message
            const feedback = field.parentNode.querySelector('.invalid-feedback');
            if (feedback) {
                feedback.textContent = errorMessage;
            }
        }

        return isValid;
    }

    /**
     * Format phone number input
     */
    formatPhoneNumber(input) {
        let value = input.value.replace(/\D/g, '');
        
        if (value.startsWith('44')) {
            value = '+44 ' + value.substring(2);
        } else if (value.startsWith('0')) {
            value = value.substring(1);
            value = '+44 ' + value;
        }

        // Format as +44 XXXX XXX XXX
        if (value.startsWith('+44')) {
            const numbers = value.substring(3).replace(/\s/g, '');
            if (numbers.length >= 10) {
                value = `+44 ${numbers.substring(0, 4)} ${numbers.substring(4, 7)} ${numbers.substring(7, 10)}`;
            }
        }

        input.value = value;
    }

    /**
     * Initialize chat widget
     */
    async initializeChatWidget() {
        try {
            const chatWidget = document.getElementById('chat-widget');
            if (!chatWidget) return;

            // Create chat button
            chatWidget.innerHTML = `
                <div class="chat-trigger">
                    <i class="fas fa-comments"></i>
                    Chat with us
                </div>
            `;

            // Add click handler
            const clickId = safeAddEventListener(chatWidget, 'click', () => {
                this.openChatWidget();
            }, false, 'chat-widget-click');

            if (clickId) this.listenerIds.push(clickId);

            // Show chat widget after delay
            safeSetTimeout(() => {
                chatWidget.style.display = 'block';
                chatWidget.style.animation = 'fadeInUp 0.5s ease';
            }, 5000, 'show-chat-widget');

            safeDebugLog('Chat widget initialized');

        } catch (error) {
            safeDebugError('Error initializing chat widget', error);
        }
    }

    /**
     * Open chat widget
     */
    openChatWidget() {
        // For now, show a simple modal with contact options
        // In production, this would integrate with a chat service like Intercom, Zendesk, etc.
        
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Contact Foam Fighters</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>We're here to help! Choose your preferred way to get in touch:</p>
                        <div class="d-grid gap-2">
                            <a href="tel:0333577032" class="btn btn-primary">
                                <i class="fas fa-phone me-2"></i>Call: 0333 577 0132
                            </a>
                            <a href="mailto:info@foamfighters.co.uk" class="btn btn-outline-primary">
                                <i class="fas fa-envelope me-2"></i>Email: info@foamfighters.co.uk
                            </a>
                            <a href="#quote-form" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-calculator me-2"></i>Get a Quote
                            </a>
                        </div>
                        <hr>
                        <p class="text-muted small">
                            <strong>Business Hours:</strong> Monday-Friday: 8:00 AM - 6:00 PM<br>
                            <strong>Emergency Service:</strong> Available for urgent property sale situations
                        </p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        // Remove modal from DOM when hidden
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    /**
     * Initialize scroll effects
     */
    async initializeScrollEffects() {
        try {
            // Intersection Observer for animations
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);

            // Observe elements for animation
            const animateElements = document.querySelectorAll('.problem-card, .process-step, .trust-item');
            animateElements.forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                observer.observe(el);
            });

            safeDebugLog('Scroll effects initialized');

        } catch (error) {
            safeDebugError('Error initializing scroll effects', error);
        }
    }

    /**
     * Initialize accessibility features
     */
    async initializeAccessibility() {
        try {
            // Focus management for modals
            document.addEventListener('shown.bs.modal', (e) => {
                const modal = e.target;
                const focusable = modal.querySelector('[autofocus], .btn-primary, input, button');
                if (focusable) {
                    focusable.focus();
                }
            });

            // Keyboard navigation for custom elements
            const customButtons = document.querySelectorAll('[role="button"]');
            customButtons.forEach(button => {
                const keydownId = safeAddEventListener(button, 'keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        button.click();
                    }
                }, false, 'custom-button-keyboard');

                if (keydownId) this.listenerIds.push(keydownId);
            });

            // Skip links
            const skipLinks = document.querySelectorAll('[href^="#"]');
            skipLinks.forEach(link => {
                const clickId = safeAddEventListener(link, 'click', (e) => {
                    const href = link.getAttribute('href');
                    // Skip empty hashes or dropdown toggles
                    if (href === '#' || link.getAttribute('data-bs-toggle')) {
                        return;
                    }
                    
                    try {
                        const target = document.querySelector(href);
                        if (target) {
                            target.focus();
                            target.scrollIntoView();
                        }
                    } catch (error) {
                        // Invalid selector, skip
                        safeDebugWarn('Invalid href selector:', href);
                    }
                }, false, 'skip-link');

                if (clickId) this.listenerIds.push(clickId);
            });

            safeDebugLog('Accessibility features initialized');

        } catch (error) {
            safeDebugError('Error initializing accessibility', error);
        }
    }

    /**
     * Initialize analytics tracking
     */
    async initializeAnalytics() {
        try {
            // Track page view
            this.trackPageView();

            // Track form interactions
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                const submitId = safeAddEventListener(form, 'submit', () => {
                    this.trackEvent('form_submit', {
                        form_id: form.id || 'unknown'
                    });
                }, false, 'form-analytics');

                if (submitId) this.listenerIds.push(submitId);
            });

            // Track phone number clicks
            const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
            phoneLinks.forEach(link => {
                const clickId = safeAddEventListener(link, 'click', () => {
                    this.trackEvent('phone_click', {
                        phone_number: link.getAttribute('href')
                    });
                }, false, 'phone-analytics');

                if (clickId) this.listenerIds.push(clickId);
            });

            // Track email clicks
            const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
            emailLinks.forEach(link => {
                const clickId = safeAddEventListener(link, 'click', () => {
                    this.trackEvent('email_click', {
                        email: link.getAttribute('href')
                    });
                }, false, 'email-analytics');

                if (clickId) this.listenerIds.push(clickId);
            });

            safeDebugLog('Analytics initialized');

        } catch (error) {
            safeDebugError('Error initializing analytics', error);
        }
    }

    /**
     * Track page view
     */
    trackPageView() {
        try {
            // Google Analytics 4
            if (typeof gtag !== 'undefined') {
                gtag('config', 'GA_MEASUREMENT_ID', {
                    page_title: document.title,
                    page_location: window.location.href
                });
            }

            safeDebugLog('Page view tracked', {
                page: window.location.pathname,
                title: document.title
            });

        } catch (error) {
            safeDebugError('Error tracking page view', error);
        }
    }

    /**
     * Track custom event
     */
    trackEvent(eventName, parameters = {}) {
        try {
            // Google Analytics 4
            if (typeof gtag !== 'undefined') {
                gtag('event', eventName, parameters);
            }

            safeDebugLog('Event tracked', { eventName, parameters });

        } catch (error) {
            safeDebugError('Error tracking event', error);
        }
    }

    /**
     * Track conversion
     */
    trackConversion(conversionType, data = {}) {
        try {
            this.trackEvent('conversion', {
                conversion_type: conversionType,
                ...data
            });

            safeDebugLog('Conversion tracked', { conversionType, data });

        } catch (error) {
            safeDebugError('Error tracking conversion', error);
        }
    }

    /**
     * Cleanup when page unloads
     */
    /**
     * Initialize lazy loading for performance
     */
    async initializeLazyLoading() {
        try {
            // Import and initialize lazy loading
            const { default: LazyLoader } = await import('./lazy-loading.js');
            this.lazyLoader = new LazyLoader();
            
            safeDebugLog('Lazy loading initialized');
        } catch (error) {
            safeDebugError('Lazy loading initialization failed', error);
            // Fallback: load all images immediately
            this.fallbackImageLoading();
        }
    }

    /**
     * Fallback image loading for when lazy loading fails
     */
    fallbackImageLoading() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }

    /**
     * Setup mobile-specific dropdown behavior
     */
    setupMobileDropdowns() {
        try {
            // Wait for Bootstrap to be available
            const initializeDropdowns = () => {
                const dropdownElements = document.querySelectorAll('.nav-item.dropdown');
                
                dropdownElements.forEach(dropdownElement => {
                    const toggle = dropdownElement.querySelector('.dropdown-toggle');
                    const menu = dropdownElement.querySelector('.dropdown-menu');
                    
                    if (!toggle || !menu) return;

                    // Remove Bootstrap data attributes on mobile to prevent conflicts
                    if (window.innerWidth <= 991) {
                        toggle.removeAttribute('data-bs-toggle');
                    }

                    // Mobile-specific click handler
                    const clickId = safeAddEventListener(toggle, 'click', (e) => {
                        if (window.innerWidth <= 991) {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            const isCurrentlyOpen = dropdownElement.classList.contains('show');
                            
                            // Close all dropdowns first
                            document.querySelectorAll('.nav-item.dropdown').forEach(dropdown => {
                                dropdown.classList.remove('show');
                                const dropdownMenu = dropdown.querySelector('.dropdown-menu');
                                if (dropdownMenu) {
                                    dropdownMenu.classList.remove('show');
                                }
                            });
                            
                            // Toggle current dropdown
                            if (!isCurrentlyOpen) {
                                dropdownElement.classList.add('show');
                                menu.classList.add('show');
                                safeDebugLog('Mobile dropdown opened');
                            }
                        }
                    }, false, 'mobile-dropdown-click');

                    // Enhanced touch handling for iOS
                    const touchStartId = safeAddEventListener(toggle, 'touchstart', (e) => {
                        if (window.innerWidth <= 991) {
                            // Ensure the element is ready for touch
                            toggle.style.webkitTouchCallout = 'none';
                            toggle.style.webkitUserSelect = 'none';
                        }
                    }, {passive: true}, 'mobile-dropdown-touchstart');

                    if (clickId) this.listenerIds.push(clickId);
                    if (touchStartId) this.listenerIds.push(touchStartId);
                });

                // Close dropdowns when clicking outside
                const bodyClickId = safeAddEventListener(document.body, 'click', (e) => {
                    if (window.innerWidth <= 991) {
                        const clickedDropdown = e.target.closest('.nav-item.dropdown');
                        if (!clickedDropdown) {
                            document.querySelectorAll('.nav-item.dropdown.show').forEach(dropdown => {
                                dropdown.classList.remove('show');
                                const menu = dropdown.querySelector('.dropdown-menu');
                                if (menu) menu.classList.remove('show');
                            });
                        }
                    }
                }, false, 'mobile-dropdown-outside-click');

                if (bodyClickId) this.listenerIds.push(bodyClickId);
            };

            // Initialize immediately or wait for Bootstrap
            if (typeof bootstrap !== 'undefined') {
                initializeDropdowns();
            } else {
                // Wait for Bootstrap to load
                const checkBootstrap = setInterval(() => {
                    if (typeof bootstrap !== 'undefined') {
                        clearInterval(checkBootstrap);
                        initializeDropdowns();
                    }
                }, 100);
                
                // Fallback: initialize after 2 seconds anyway
                setTimeout(initializeDropdowns, 2000);
            }

            safeDebugLog('Mobile dropdowns setup initiated');
        } catch (error) {
            safeDebugError('Error setting up mobile dropdowns', error);
        }
    }

    /**
     * Simple fallback mobile dropdown functionality
     */
    addSimpleMobileDropdownFallback() {
        try {
            // Add immediate click handler for Services link
            const servicesLink = document.querySelector('.nav-link.dropdown-toggle');
            if (servicesLink) {
                const fallbackClickId = safeAddEventListener(servicesLink, 'touchend', (e) => {
                    if (window.innerWidth <= 991) {
                        e.preventDefault();
                        
                        const dropdownParent = servicesLink.closest('.nav-item.dropdown');
                        const dropdownMenu = dropdownParent.querySelector('.dropdown-menu');
                        
                        if (dropdownMenu) {
                            const isVisible = dropdownMenu.style.display === 'block' || dropdownMenu.classList.contains('show');
                            
                            if (isVisible) {
                                dropdownMenu.style.display = 'none';
                                dropdownMenu.classList.remove('show');
                                dropdownParent.classList.remove('show');
                            } else {
                                dropdownMenu.style.display = 'block';
                                dropdownMenu.classList.add('show');
                                dropdownParent.classList.add('show');
                            }
                        }
                    }
                }, {passive: false}, 'mobile-dropdown-fallback');

                if (fallbackClickId) this.listenerIds.push(fallbackClickId);
                safeDebugLog('Mobile dropdown fallback added');
            }
        } catch (error) {
            safeDebugError('Error setting up mobile dropdown fallback', error);
        }
    }

    cleanup() {
        try {
            // Remove all event listeners
            // (This is handled automatically by our EventListenerManager)
            
            safeDebugLog('App cleanup completed');

        } catch (error) {
            safeDebugError('Error during cleanup', error);
        }
    }
}

// Initialize the application
const app = new FoamFightersApp();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    app.cleanup();
});

// Export for global access
window.FoamFightersApp = app;