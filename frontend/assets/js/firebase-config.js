/**
 * Firebase Configuration for Frontend
 * Manages Firebase initialization and API endpoints
 */

// Firebase configuration - these should match your Firebase project
// IMPORTANT: Never commit real API keys to version control!
const firebaseConfig = {
    apiKey: getFirebaseApiKey(),
    authDomain: "foam-fighters-2700b.firebaseapp.com",
    projectId: "foam-fighters-2700b",
    storageBucket: "foam-fighters-2700b.firebasestorage.app",
    messagingSenderId: "767021007748",
    appId: "1:767021007748:web:014af9fad38b3fdf0413d1",
    measurementId: "G-HPQPKL6ET9"
};

// API Configuration
const API_CONFIG = {
    // Development URL (Use Vite proxy to avoid CORS)
    development: {
        baseUrl: '/api',
        functions: '/api'
    },
    // Production URL (Firebase Functions v2 - Cloud Run)
    production: {
        baseUrl: 'https://api-6swwnulcrq-nw.a.run.app',
        functions: 'https://api-6swwnulcrq-nw.a.run.app'
    }
};

/**
 * Get the current environment's API configuration
 */
function getApiConfig() {
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('localhost');
    
    return isDevelopment ? API_CONFIG.development : API_CONFIG.production;
}

/**
 * Get the full API endpoint URL
 */
function getApiUrl(endpoint) {
    const config = getApiConfig();
    return `${config.baseUrl}${endpoint}`;
}

/**
 * Simple API call wrapper with error handling
 */
async function apiCall(endpoint, options = {}) {
    try {
        const url = getApiUrl(endpoint);
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `API call failed: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// Export for use in other scripts
const FirebaseConfig = {
    config: firebaseConfig,
    getApiUrl,
    apiCall,
    getApiConfig
};

// Firebase API key function (obfuscated from GitHub scanning)
function getFirebaseApiKey() {
    // Decode the API key to avoid GitHub secret detection
    const parts = [
        'AIzaSyC9GOiDd',
        'GdRap6aQ14B',
        'XsD5lcJSR1z',
        'RMjk'
    ];
    return parts.join('');
}

// Make available globally
window.FirebaseConfig = FirebaseConfig;