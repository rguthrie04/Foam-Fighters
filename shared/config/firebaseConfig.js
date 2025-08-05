/**
 * Centralized Firebase Configuration
 * ALL apps import from: '../../shared/config/firebaseConfig.js'
 * NEVER create multiple firebase config files
 */

// Environment detection
const isDevelopment = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Firebase configuration object
const firebaseConfig = {
  development: {
    apiKey: process.env.FIREBASE_API_KEY_DEV || "AIzaSyAq3391y-zteKePHTattVUDd3ghpdIDYU0",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN_DEV || "foam-fighters-2700b.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID_DEV || "foam-fighters-2700b",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET_DEV || "foam-fighters-2700b.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID_DEV || "767021007748",
    appId: process.env.FIREBASE_APP_ID_DEV || "1:767021007748:web:014af9fad38b3fdf0413d1",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID_DEV || "G-HPQPKL6ET9"
  },
  production: {
    apiKey: process.env.FIREBASE_API_KEY_PROD || "AIzaSyAq3391y-zteKePHTattVUDd3ghpdIDYU0",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN_PROD || "foam-fighters-2700b.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID_PROD || "foam-fighters-2700b",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET_PROD || "foam-fighters-2700b.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID_PROD || "767021007748",
    appId: process.env.FIREBASE_APP_ID_PROD || "1:767021007748:web:014af9fad38b3fdf0413d1",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID_PROD || "G-HPQPKL6ET9"
  }
};

// Get current environment config
const getCurrentConfig = () => {
  return isDevelopment ? firebaseConfig.development : firebaseConfig.production;
};

// Firebase app instance (will be initialized once)
let firebaseApp = null;
let auth = null;
let db = null;
let functions = null;
let storage = null;

/**
 * Initialize Firebase services
 * Call this once at app startup
 */
function initializeFirebase() {
  try {
    // Only initialize if not already done
    if (firebaseApp) {
      return {
        app: firebaseApp,
        auth,
        db,
        functions,
        storage
      };
    }

    const config = getCurrentConfig();
    
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK not loaded. Please include Firebase scripts before this module.');
    }

    // Initialize Firebase app
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(config);
    } else {
      firebaseApp = firebase.app(); // Use existing app
    }

    // Initialize services
    auth = firebase.auth();
    db = firebase.firestore();
    functions = firebase.functions();
    storage = firebase.storage();

    // Configure emulators for development
    if (isDevelopment) {
      // Check if emulators are available and not already connected
      try {
        if (auth && !auth._delegate._config.emulator) {
          auth.useEmulator('http://localhost:9099');
        }
        if (db && !db._delegate._settings.host.includes('localhost')) {
          db.useEmulator('localhost', 8080);
        }
        if (functions && !functions._delegate._url.includes('localhost')) {
          functions.useEmulator('localhost', 5001);
        }
        if (storage && !storage._delegate._location.includes('localhost')) {
          storage.useEmulator('localhost', 9199);
        }
      } catch (emulatorError) {
        console.warn('Emulator connection failed (this is normal in production):', emulatorError.message);
      }
    }

    console.log(`Firebase initialized successfully for ${isDevelopment ? 'development' : 'production'} environment`);
    
    return {
      app: firebaseApp,
      auth,
      db,
      functions,
      storage
    };

  } catch (error) {
    console.error('Firebase initialization failed:', error);
    throw error;
  }
}

/**
 * Get Firebase services (lazy initialization)
 */
function getFirebaseServices() {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  
  return {
    app: firebaseApp,
    auth,
    db,
    functions,
    storage
  };
}

/**
 * Environment utilities
 */
const environment = {
  isDevelopment,
  isProduction: !isDevelopment,
  getCurrentConfig,
  getEnvironmentName: () => isDevelopment ? 'development' : 'production'
};

// Export everything needed across the application
module.exports = {
  initializeFirebase,
  getFirebaseServices,
  environment,
  
  // Direct service getters for convenience
  getAuth: () => getFirebaseServices().auth,
  getDb: () => getFirebaseServices().db,
  getFunctions: () => getFirebaseServices().functions,
  getStorage: () => getFirebaseServices().storage,
  getApp: () => getFirebaseServices().app
};

// For ES6 imports
if (typeof window !== 'undefined') {
  window.FoamFirebaseConfig = module.exports;
}