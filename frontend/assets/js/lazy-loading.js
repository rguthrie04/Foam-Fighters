/**
 * Lazy Loading Utilities
 * Implements intersection observer for images and content
 */

class LazyLoader {
    constructor() {
        this.imageObserver = null;
        this.contentObserver = null;
        this.init();
    }

    init() {
        // Only initialize if browser supports IntersectionObserver
        if ('IntersectionObserver' in window) {
            this.setupImageLazyLoading();
            this.setupContentLazyLoading();
        } else {
            // Fallback for older browsers - load everything immediately
            this.loadAllImages();
        }
    }

    setupImageLazyLoading() {
        const imageObserverOptions = {
            root: null,
            rootMargin: '50px',
            threshold: 0.1
        };

        this.imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.imageObserver.unobserve(entry.target);
                }
            });
        }, imageObserverOptions);

        // Observe all lazy images
        this.observeLazyImages();
    }

    setupContentLazyLoading() {
        const contentObserverOptions = {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        };

        this.contentObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('lazy-loaded');
                    this.contentObserver.unobserve(entry.target);
                }
            });
        }, contentObserverOptions);

        // Observe all lazy content
        this.observeLazyContent();
    }

    observeLazyImages() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => {
            this.imageObserver.observe(img);
        });
    }

    observeLazyContent() {
        const lazyContent = document.querySelectorAll('.lazy-content');
        lazyContent.forEach(content => {
            this.contentObserver.observe(content);
        });
    }

    loadImage(img) {
        // Show loading placeholder
        img.classList.add('loading');
        
        const actualImg = new Image();
        actualImg.onload = () => {
            // Replace data-src with src
            img.src = img.dataset.src;
            img.classList.remove('loading');
            img.classList.add('loaded');
            
            // Remove data-src to prevent reprocessing
            delete img.dataset.src;
        };
        
        actualImg.onerror = () => {
            img.classList.remove('loading');
            img.classList.add('error');
            // Set fallback image
            img.src = '/assets/images/placeholder.svg';
        };
        
        actualImg.src = img.dataset.src;
    }

    loadAllImages() {
        // Fallback for browsers without IntersectionObserver
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => {
            img.src = img.dataset.src;
            delete img.dataset.src;
        });
    }

    // Method to add new images to lazy loading (for dynamic content)
    addNewImages(container = document) {
        if (this.imageObserver) {
            const newLazyImages = container.querySelectorAll('img[data-src]');
            newLazyImages.forEach(img => {
                this.imageObserver.observe(img);
            });
        }
    }

    // Method to add new content to lazy loading
    addNewContent(container = document) {
        if (this.contentObserver) {
            const newLazyContent = container.querySelectorAll('.lazy-content');
            newLazyContent.forEach(content => {
                this.contentObserver.observe(content);
            });
        }
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.lazyLoader = new LazyLoader();
    });
} else {
    window.lazyLoader = new LazyLoader();
}

export default LazyLoader;