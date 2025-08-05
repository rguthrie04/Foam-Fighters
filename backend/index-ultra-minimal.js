/**
 * Ultra-Minimal Backend - Just Form Submissions
 */

const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");

// Set global options
setGlobalOptions({
  region: 'europe-west2',
  maxInstances: 5,
  timeoutSeconds: 30,
  memory: '256MiB'
});

// Enhanced CORS handler with debugging
function cors(req, res, next) {
  // Allow requests from your live website and localhost
  const allowedOrigins = [
    'https://foam-fighters-2700b.web.app',
    'https://foam-fighters-2700b.firebaseapp.com',
    'http://localhost:3001',
    'http://localhost:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3000'
  ];
  
  const origin = req.get('Origin');
  safeDebugLog('CORS Check', { origin, allowedOrigins, userAgent: req.get('User-Agent') });
  
  // Always set CORS headers
  res.set('Access-Control-Allow-Origin', origin || '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    safeDebugLog('Preflight request handled', { origin });
    res.status(200).end();
    return;
  }
  next();
}

// Ultra-minimal API function
exports.api = onRequest({
  cors: true,
  timeoutSeconds: 30,
  memory: '256MiB'
}, async (req, res) => {
  try {
    // Apply CORS
    cors(req, res, () => {});

    // Health check
    if (req.method === 'GET' && req.path === '/health') {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
      return;
    }

    // Form submission endpoint
    if (req.method === 'POST' && req.path === '/inquiries') {
      console.log('Form submission received:', req.body);
      
      // For now, just return success
      res.json({
        success: true,
        reference: 'FF-' + Date.now(),
        message: 'Form submitted successfully',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 404 for other endpoints
    res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('Ultra-minimal Firebase Function initialized');