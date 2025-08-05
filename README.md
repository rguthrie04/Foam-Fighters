# Foam Fighters - Professional Spray Foam Removal

A comprehensive web application for Foam Fighters Ltd, a UK-based spray foam removal company. Built with Firebase and Node.js following enterprise-grade architectural patterns.

## 🏗️ Project Architecture

This project follows a **"Build once, scale easily"** approach with centralized configurations and defensive patterns implemented from day one.

### Directory Structure
```
foam-fighters/
├── frontend/          # Client-facing website
├── backend/           # Firebase Functions (API)
├── admin/             # Employee tools dashboard
├── shared/            # Centralized utilities and configs
│   ├── config/        # Firebase & URL configuration
│   ├── auth/          # Authentication management
│   ├── utils/         # Memory management & utilities
│   └── components/    # Reusable UI components
├── firebase.json      # Firebase project configuration
├── firestore.rules    # Database security rules
├── storage.rules      # File storage security rules
└── firestore.indexes.json # Database indexes
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 8+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project (create at https://console.firebase.google.com)

### Installation

1. **Clone and install dependencies:**
```bash
npm install
cd frontend && npm install
cd ../backend && npm install
cd ../admin && npm install
```

2. **Configure Firebase:**
```bash
firebase login
firebase init
# Select your Firebase project
```

3. **Set up environment variables:**
Create `.env` file in the root directory:
```bash
# Copy from .env.example and fill in your Firebase config
FIREBASE_API_KEY_DEV=your-dev-api-key
FIREBASE_PROJECT_ID_DEV=your-project-id
# ... etc
```

4. **Start development environment:**
```bash
# Start all services (frontend, backend, admin)
npm run dev

# Or start individually:
npm run frontend:dev    # Port 3000
npm run backend:dev     # Port 5001
npm run admin:dev       # Port 3001
```

5. **Start Firebase emulators:**
```bash
npm run emulators:start
# Emulator UI: http://localhost:4000
```

## 🏛️ Core Infrastructure

### 1. Centralized Firebase Configuration
**Location:** `shared/config/firebaseConfig.js`

- Single source of truth for all Firebase initialization
- Environment-based configuration (dev vs production)
- Automatic emulator detection and connection
- Centralized service exports (auth, db, functions, storage)

**Usage:**
```javascript
const { getAuth, getDb } = require('../../shared/config/firebaseConfig');
```

### 2. Authentication Management
**Location:** `shared/auth/authManager.js`

- Role-based access control (admin, manager, technician, customer)
- Automatic token refresh handling
- Permission-based function decorators
- Retry mechanisms for auth-dependent operations

**Usage:**
```javascript
const { getCurrentUser, hasPermission, requireAuth } = require('../../shared/auth/authManager');

const protectedFunction = requireAuth(async (user) => {
  // Function automatically receives authenticated user
});
```

### 3. Memory Management
Prevents memory leaks with managed utilities:

- **TimerManager** (`shared/utils/TimerManager.js`): Safe setTimeout/setInterval with auto-cleanup
- **EventListenerManager** (`shared/utils/EventListenerManager.js`): Managed event listeners
- **BatchQueryService** (`shared/utils/BatchQueryService.js`): Intelligent Firestore query batching with 5-minute caching

**Usage:**
```javascript
const { safeSetTimeout, safeAddEventListener } = require('../../shared/utils/TimerManager');

// Automatically tracked and cleaned up
const timerId = safeSetTimeout(() => {
  console.log('Safe timer execution');
}, 1000, 'my-timer');
```

### 4. Error Handling & Logging
**Location:** `shared/utils/errorHandler.js`

- Defensive logging functions that never throw
- Global error capture and reporting
- Environment-aware logging levels
- Automatic error aggregation and statistics

**Usage:**
```javascript
const { safeDebugLog, safeDebugError } = require('../../shared/utils/errorHandler');

safeDebugLog('Operation completed', { data: result });
safeDebugError('Operation failed', error);
```

### 5. Cache Management
**Location:** `shared/utils/cacheManager.js`

- Automatic cache-busting for script loading
- Environment mismatch detection
- Emergency cache clearing functions
- Service worker management

**Usage:**
```javascript
const { clearAppCache, addCacheBust } = require('../../shared/utils/cacheManager');

// Emergency cache clear if environment issues detected
if (environmentMismatch) {
  clearAppCache();
}
```

### 6. URL Configuration
**Location:** `shared/config/urls.js`

- Environment-based URL management
- Automatic localhost detection
- Cache-busting utilities
- API endpoint builders

## 🔐 Security Features

### Firestore Security Rules
- Role-based access control with helper functions
- Public access for website content and contact forms
- Protected access for admin operations
- Granular permissions for different user types

### Storage Security Rules
- File type and size validation
- Role-based upload permissions
- Public access for gallery and profile images
- Protected access for sensitive documents

### Authentication
- Firebase Auth integration
- Custom claims for role management
- Automatic token refresh
- Permission-based function protection

## 🎨 UI Components

### Reusable Components
- **Modal** (`shared/components/Modal.js`): Accessible modal with focus management
- **Toast** (`shared/components/Toast.js`): Non-intrusive notifications
- **LoadingSpinner** (`shared/components/LoadingSpinner.js`): Accessible loading indicators

### Usage Example
```javascript
const Modal = require('../../shared/components/Modal');

const modal = new Modal({
  closeOnEscape: true,
  trapFocus: true
});

modal.setTitle('Confirmation');
modal.setContent('<p>Are you sure you want to proceed?</p>');
modal.addCloseButton();
modal.open();
```

## 🚀 Deployment

### Environment Setup
1. **Development:** Automatic localhost detection and emulator usage
2. **Production:** Firebase Hosting with custom domain support

### Deployment Commands
```bash
# Deploy everything
npm run deploy

# Selective deployment
firebase deploy --only functions:api
firebase deploy --only hosting
firebase deploy --only functions:sendTemplatedEmailCallable
```

### Performance Features
- Selective deployment to avoid unnecessary updates
- Code splitting and lazy loading
- Image optimization and compression
- Service worker for offline support
- CDN delivery via Firebase Hosting

## 📊 Monitoring & Analytics

### Built-in Monitoring
- Error logging and aggregation
- Performance monitoring
- Cache hit/miss statistics
- User authentication tracking

### External Integration Ready
- Google Analytics 4 support
- Error reporting service integration
- Custom metrics and events

## 🧪 Development Workflow

### Code Quality
- ESLint configuration for all modules
- Consistent code formatting
- Error boundary patterns
- Defensive programming practices

### Testing Strategy
- Firebase emulator integration
- Unit test structure ready
- Integration test patterns
- Performance benchmarking

## 📱 Progressive Web App Features

### Offline Support
- Service worker implementation
- Cache-first strategies for static assets
- Offline form submission queuing
- Background sync capabilities

### Mobile Optimization
- Mobile-first responsive design
- Touch-friendly interactions
- Optimized loading for mobile networks
- iOS/Android app shell support

## 🔧 Configuration Management

### Environment Variables
Copy the example environment file and configure:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Key Configuration Areas
- Firebase project settings
- Email service configuration
- File upload limits
- Rate limiting settings
- Feature flags

## 📖 API Documentation

### Backend Structure
- RESTful Firebase Functions
- Centralized CORS configuration
- Authentication middleware
- Email template system
- File upload handling

### Frontend Integration
- Centralized API client
- Error handling and retry logic
- Loading state management
- Real-time data synchronization

## 🤝 Contributing

### Development Guidelines
1. Follow the established patterns in `shared/`
2. Use the centralized utilities for all operations
3. Implement proper error handling and logging
4. Test with Firebase emulators before deployment
5. Update documentation for new features

### Code Style
- Use the provided ESLint configuration
- Follow defensive programming patterns
- Implement proper cleanup in all components
- Use meaningful variable and function names

## 📞 Support & Contact

**Foam Fighters Ltd**
- Phone: 0333 577 0132
- Email: info@foamfighters.co.uk
- Company Registration: 16612986

---

## 📋 Next Steps

**Phase 1 ✅ COMPLETED - Foundation Setup**
- [x] Project structure created
- [x] Centralized Firebase configuration
- [x] Authentication system
- [x] Memory management utilities
- [x] Error handling and logging
- [x] Cache management
- [x] Security rules implementation

**Phase 2 - Backend Development**
- [ ] Firebase Functions setup with CORS
- [ ] API routing structure
- [ ] Email system implementation
- [ ] Database operations
- [ ] File upload handling

**Phase 3 - Frontend Development**
- [ ] Responsive website layout
- [ ] Content pages (homepage, services, etc.)
- [ ] Quote request forms
- [ ] Interactive features
- [ ] SEO optimization

**Phase 4 - Admin Dashboard**
- [ ] Authentication gateway
- [ ] Customer management
- [ ] Quote generation system
- [ ] Project tracking
- [ ] User management

**Phase 5 - Testing & Deployment**
- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Production deployment

---

*Built with enterprise-grade architecture for scalability and maintainability.*