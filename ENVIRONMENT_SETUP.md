# Environment Setup Guide

## Environment Variables Configuration

Create a `.env` file in the root directory with the following variables:

```bash
# Firebase Configuration
# Development Environment
FIREBASE_API_KEY_DEV=your-dev-api-key
FIREBASE_AUTH_DOMAIN_DEV=foamfighters-dev.firebaseapp.com
FIREBASE_PROJECT_ID_DEV=foamfighters-dev
FIREBASE_STORAGE_BUCKET_DEV=foamfighters-dev.appspot.com
FIREBASE_MESSAGING_SENDER_ID_DEV=123456789
FIREBASE_APP_ID_DEV=1:123456789:web:abcdef123456

# Production Environment
FIREBASE_API_KEY_PROD=your-prod-api-key
FIREBASE_AUTH_DOMAIN_PROD=foamfighters.firebaseapp.com
FIREBASE_PROJECT_ID_PROD=foamfighters
FIREBASE_STORAGE_BUCKET_PROD=foamfighters.appspot.com
FIREBASE_MESSAGING_SENDER_ID_PROD=987654321
FIREBASE_APP_ID_PROD=1:987654321:web:fedcba654321

# Email Configuration
EMAIL_SERVICE_API_KEY=your-email-service-api-key
EMAIL_FROM_ADDRESS=noreply@foamfighters.co.uk
EMAIL_FROM_NAME=Foam Fighters

# Company Information
COMPANY_NAME=Foam Fighters Ltd
COMPANY_PHONE=0333 577 0132
COMPANY_EMAIL=info@foamfighters.co.uk
COMPANY_ADDRESS=Your Company Address
COMPANY_REGISTRATION=16612986

# External Services
GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Development Settings
NODE_ENV=development
PORT=3000
API_PORT=5000

# Security
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-encryption-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Limits
MAX_FILE_SIZE_MB=50
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif,image/webp
ALLOWED_DOCUMENT_TYPES=application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document

# Cache Settings
CACHE_DURATION_MS=300000
ENABLE_QUERY_CACHING=true

# Monitoring and Logging
LOG_LEVEL=info
ENABLE_ERROR_REPORTING=true
ERROR_REPORTING_SERVICE=console

# Feature Flags
ENABLE_CHAT_WIDGET=true
ENABLE_TESTIMONIALS_CAROUSEL=true
ENABLE_OFFLINE_SUPPORT=true
ENABLE_ANALYTICS=true
```

## Firebase Project Setup

1. **Create Firebase Project:**
   - Go to https://console.firebase.google.com
   - Click "Create a project"
   - Enter "foamfighters" as project ID
   - Enable Google Analytics (optional)

2. **Enable Firebase Services:**
   ```bash
   # Authentication
   - Go to Authentication > Sign-in method
   - Enable Email/Password
   - Add authorized domains: foamfighters.co.uk, localhost
   
   # Firestore Database
   - Go to Firestore Database
   - Create database in production mode
   - Rules will be deployed automatically
   
   # Storage
   - Go to Storage
   - Create default bucket
   - Rules will be deployed automatically
   
   # Functions
   - Functions will be created during deployment
   ```

3. **Get Firebase Configuration:**
   - Go to Project Settings > General
   - Scroll to "Your apps"
   - Click "Web app" and register your app
   - Copy the config object values to your .env file

## Port Configuration

The project uses consistent port allocation:

- **Frontend:** 3000
- **Admin:** 3001  
- **Backend API:** 5000 (not 5001 to avoid conflicts)
- **Firebase Functions Emulator:** 5001
- **Firebase Hosting Emulator:** 5000
- **Firestore Emulator:** 8080
- **Auth Emulator:** 9099
- **Storage Emulator:** 9199
- **Firebase UI:** 4000

## Development Environment Verification

After setup, verify your environment:

```bash
# Check Node.js version
node --version  # Should be 18+

# Check npm version  
npm --version   # Should be 8+

# Check Firebase CLI
firebase --version

# Verify Firebase login
firebase login

# Test Firebase connection
firebase projects:list
```

## Common Environment Issues

### 1. Localhost vs Production URLs
The system automatically detects environment mismatches and clears cache if:
- Localhost URLs are used in production
- Production URLs are used in development

### 2. CORS Configuration
CORS is pre-configured for:
- http://localhost:3000 (frontend)
- http://localhost:3001 (admin)
- http://127.0.0.1:3000
- https://foamfighters.co.uk
- https://foamfighters.web.app

### 3. Emulator Configuration
Emulators automatically connect in development when:
- `window.location.hostname === 'localhost'`
- `NODE_ENV === 'development'`

## Security Considerations

1. **Never commit `.env` files**
2. **Use different Firebase projects for dev/prod**
3. **Rotate API keys regularly**
4. **Enable Firebase security rules**
5. **Use HTTPS in production**

## Troubleshooting

### Cache Issues
```javascript
// Clear all caches
window.clearAppCache();

// Check cache status
window.FoamCacheManager.getCacheStatus();
```

### Authentication Issues
```javascript
// Check current user
window.FoamAuthManager.getCurrentUser();

// Refresh auth token
window.FoamAuthManager.refreshAuthToken();
```

### Environment Detection
```javascript
// Check current environment
window.FoamUrlConfig.getCurrentEnvironment();

// Detect mismatches
window.FoamUrlConfig.detectEnvironmentMismatch();
```