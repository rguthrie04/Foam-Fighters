/**
 * Foam Fighters Backend - Firebase Functions V2
 * Main entry point for all Firebase Functions
 */

const { onRequest } = require("firebase-functions/v2/https");
const { onCall } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import our centralized utilities
const { safeDebugLog, safeDebugError, safeDebugWarn } = require('../shared/utils/errorHandler');
const { getAuth, getDb } = require('../shared/config/firebaseConfig');
const { getCurrentUser, hasAnyRole } = require('../shared/auth/authManager');

// Import route handlers
const inquiryRoutes = require('./routes/inquiries');
const quoteRoutes = require('./routes/quotes');
const projectRoutes = require('./routes/projects');
const userRoutes = require('./routes/users');
const emailRoutes = require('./routes/email');
const uploadRoutes = require('./routes/uploads');

// Set global options for all functions
setGlobalOptions({
  region: 'europe-west2',
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: '512MiB'
});

// CORS configuration as specified in the plan
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://foamfighters.co.uk',
    'https://foamfighters.web.app',
    'https://foamfighters.firebaseapp.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

// Create Express app for API routing
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for API
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// CORS setup with fallback
app.use(cors(corsOptions));

// Explicit fallback CORS middleware as specified in the plan
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (corsOptions.origin.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  safeDebugLog('API Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Authentication middleware
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Public endpoints don't require auth
      req.user = null;
      return next();
    }

    const token = authHeader.split('Bearer ')[1];
    const auth = getAuth();
    
    // Verify the token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get full user info with role
    req.user = await getCurrentUser();
    
    if (!req.user) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'auth/user-not-found'
      });
    }

    safeDebugLog('Authenticated request', {
      uid: req.user.uid,
      email: req.user.email,
      role: req.user.role,
      path: req.path
    });

    next();
  } catch (error) {
    safeDebugError('Authentication error', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'auth/id-token-expired'
      });
    }
    
    return res.status(401).json({
      error: 'Invalid authentication token',
      code: 'auth/invalid-token'
    });
  }
}

// Apply auth middleware to all routes
app.use(authMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/inquiries', inquiryRoutes);
app.use('/quotes', quoteRoutes);
app.use('/projects', projectRoutes);
app.use('/users', userRoutes);
app.use('/email', emailRoutes);
app.use('/uploads', uploadRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  safeDebugError('API Error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: isDevelopment ? error.message : 'Internal server error',
    code: error.code || 'internal-error',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { stack: error.stack })
  });
});

// Main API function - handles all HTTP requests
exports.api = onRequest({
  cors: corsOptions,
  timeoutSeconds: 60,
  memory: '512MiB'
}, app);

// Separate callable function for templated emails
exports.sendTemplatedEmailCallable = onCall({
  timeoutSeconds: 30,
  memory: '256MiB'
}, async (request) => {
  try {
    const { auth, data } = request;
    
    // Verify authentication for email sending
    if (!auth) {
      throw new Error('Authentication required for email operations');
    }

    // Get current user with role checking
    const user = await getCurrentUser();
    if (!user || !hasAnyRole(['admin', 'manager'])) {
      throw new Error('Insufficient permissions for email operations');
    }

    const { templateType, to, templateData, priority = 'normal' } = data;

    safeDebugLog('Email send request', {
      templateType,
      to: Array.isArray(to) ? to.length + ' recipients' : to,
      priority,
      requestedBy: user.email
    });

    // Import email service
    const emailService = require('./services/emailService');
    const result = await emailService.sendTemplatedEmail(templateType, to, templateData, priority);

    safeDebugLog('Email sent successfully', {
      templateType,
      messageId: result.messageId,
      requestedBy: user.email
    });

    return {
      success: true,
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    safeDebugError('Email sending failed', error);
    
    throw new Error(error.message || 'Failed to send email');
  }
});

// Utility function for creating custom claims (admin only)
exports.setUserClaims = onCall({
  timeoutSeconds: 30,
  memory: '256MiB'
}, async (request) => {
  try {
    const { auth, data } = request;
    
    if (!auth) {
      throw new Error('Authentication required');
    }

    // Only admins can set custom claims
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const { uid, customClaims } = data;
    
    const adminAuth = require('firebase-admin/auth');
    await adminAuth.getAuth().setCustomUserClaims(uid, customClaims);

    safeDebugLog('Custom claims set', {
      targetUid: uid,
      claims: customClaims,
      setBy: user.email
    });

    return {
      success: true,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    safeDebugError('Setting custom claims failed', error);
    throw new Error(error.message || 'Failed to set custom claims');
  }
});

// Scheduled function for cleanup tasks (example)
const { onSchedule } = require("firebase-functions/v2/scheduler");

exports.scheduledCleanup = onSchedule({
  schedule: "0 2 * * *", // Daily at 2 AM
  timeZone: "Europe/London"
}, async (event) => {
  try {
    safeDebugLog('Starting scheduled cleanup');
    
    // Add cleanup tasks here:
    // - Remove old temporary files
    // - Clean up expired sessions
    // - Archive old logs
    
    safeDebugLog('Scheduled cleanup completed');
  } catch (error) {
    safeDebugError('Scheduled cleanup failed', error);
  }
});

safeDebugLog('Firebase Functions initialized successfully');