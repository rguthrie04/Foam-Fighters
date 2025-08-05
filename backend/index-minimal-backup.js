/**
 * Foam Fighters Backend - Minimal Version for Initial Deployment
 * Just the core API function for form submissions
 */

const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import our centralized utilities
const { safeDebugLog, safeDebugError } = require('../shared/utils/errorHandler');

// Import just the inquiry routes
const inquiryRoutes = require('./routes/inquiries');

// Set global options for all functions
setGlobalOptions({
  region: 'europe-west2',
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: '512MiB'
});

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:8080',
    'http://localhost:9000',
    'https://foam-fighters-2700b.web.app',
    'https://foam-fighters-2700b.firebaseapp.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Express app setup
const app = express();

// Apply middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API routes - just inquiries for now
app.use('/inquiries', inquiryRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  safeDebugError('API Error', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Export the main API function
exports.api = onRequest({
  cors: corsOptions,
  timeoutSeconds: 60,
  memory: '512MiB'
}, app);

safeDebugLog('Minimal Firebase Functions initialized successfully');