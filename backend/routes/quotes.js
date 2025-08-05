/**
 * Quotes API Routes
 * Handles quote generation, management, and PDF creation
 */

const express = require('express');
const { body, validationResult, param } = require('express-validator');
const router = express.Router();

// Import utilities
const { safeDebugLog, safeDebugError } = require('../../shared/utils/errorHandler');
const { getDb } = require('../../shared/config/firebaseConfig');
const { hasAnyRole } = require('../../shared/auth/authManager');
const { smartQuery, getDocument } = require('../../shared/utils/BatchQueryService');

// Validation rules for quote creation
const createQuoteValidation = [
  body('inquiryId')
    .optional()
    .isString()
    .withMessage('Inquiry ID must be a string'),
  
  body('customerInfo')
    .isObject()
    .withMessage('Customer information is required'),
  
  body('customerInfo.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name is required'),
  
  body('customerInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),
  
  body('customerInfo.phone')
    .optional()
    .isMobilePhone('en-GB')
    .withMessage('Valid UK phone number required'),
  
  body('propertyDetails')
    .isObject()
    .withMessage('Property details are required'),
  
  body('propertyDetails.address')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Property address is required'),
  
  body('propertyDetails.propertyType')
    .isIn(['residential', 'commercial', 'industrial'])
    .withMessage('Valid property type is required'),
  
  body('removalDetails')
    .isObject()
    .withMessage('Removal details are required'),
  
  body('removalDetails.foamType')
    .isIn(['open-cell', 'closed-cell', 'mixed'])
    .withMessage('Foam type is required'),
  
  body('removalDetails.estimatedArea')
    .isNumeric()
    .isFloat({ min: 1, max: 10000 })
    .withMessage('Estimated area must be between 1 and 10000 square meters'),
  
  body('removalDetails.accessDifficulty')
    .isIn(['easy', 'moderate', 'difficult', 'extreme'])
    .withMessage('Access difficulty level is required'),
  
  body('removalDetails.urgency')
    .optional()
    .isIn(['standard', 'urgent', 'emergency'])
    .withMessage('Invalid urgency level')
];

// Create new quote (staff only)
router.post('/', createQuoteValidation, async (req, res) => {
  try {
    // Check permissions
    if (!req.user || !hasAnyRole(['admin', 'manager', 'technician'])) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Staff access required'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const db = getDb();
    
    // Generate quote calculations
    const calculations = await calculateQuoteAmounts(req.body.removalDetails);
    
    const quoteData = {
      ...req.body,
      ...calculations,
      
      // Quote metadata
      quoteNumber: generateQuoteNumber(),
      status: 'draft',
      version: 1,
      
      // Dates
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: calculateExpiryDate(),
      
      // Staff info
      createdBy: req.user.uid,
      createdByName: req.user.email,
      
      // Approval workflow
      requiresApproval: calculations.totalAmount > 5000,
      approvedBy: null,
      approvedAt: null,
      
      // Terms and conditions
      terms: getDefaultTerms(),
      
      // Payment terms
      paymentTerms: {
        depositPercentage: 25,
        balanceOnCompletion: true,
        acceptedMethods: ['bank-transfer', 'card', 'cheque']
      }
    };

    // Add to Firestore
    const docRef = await db.collection('quotes').add(quoteData);
    quoteData.id = docRef.id;

    safeDebugLog('Quote created', {
      id: docRef.id,
      quoteNumber: quoteData.quoteNumber,
      totalAmount: quoteData.totalAmount,
      createdBy: req.user.email,
      customerEmail: quoteData.customerInfo.email
    });

    res.status(201).json({
      success: true,
      quote: {
        id: quoteData.id,
        quoteNumber: quoteData.quoteNumber,
        status: quoteData.status,
        totalAmount: quoteData.totalAmount,
        createdAt: quoteData.createdAt,
        expiresAt: quoteData.expiresAt
      }
    });

  } catch (error) {
    safeDebugError('Error creating quote', error);
    res.status(500).json({
      error: 'Failed to create quote'
    });
  }
});

// Get all quotes (staff only)
router.get('/', async (req, res) => {
  try {
    // Check permissions
    if (!req.user || !hasAnyRole(['admin', 'manager', 'technician'])) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Staff access required'
      });
    }

    const {
      status,
      createdBy,
      limit = '50',
      offset = '0',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query parameters
    const queryParams = {
      orderBy: [[sortBy, sortOrder]],
      limit: parseInt(limit)
    };

    // Add filters
    const whereConditions = [];
    if (status) whereConditions.push(['status', '==', status]);
    if (createdBy) whereConditions.push(['createdBy', '==', createdBy]);

    if (whereConditions.length > 0) {
      queryParams.where = whereConditions;
    }

    // Use smart query with caching
    const quotes = await smartQuery('quotes', queryParams);

    safeDebugLog('Quotes retrieved', {
      count: quotes.length,
      requestedBy: req.user.email,
      filters: { status, createdBy }
    });

    res.json({ quotes });

  } catch (error) {
    safeDebugError('Error retrieving quotes', error);
    res.status(500).json({
      error: 'Failed to retrieve quotes'
    });
  }
});

// Get specific quote (staff only)
router.get('/:id', [
  param('id').isAlphanumeric().withMessage('Invalid quote ID')
], async (req, res) => {
  try {
    // Check permissions
    if (!req.user || !hasAnyRole(['admin', 'manager', 'technician'])) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Staff access required'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const quote = await getDocument('quotes', req.params.id);

    if (!quote) {
      return res.status(404).json({
        error: 'Quote not found'
      });
    }

    safeDebugLog('Quote retrieved', {
      id: req.params.id,
      quoteNumber: quote.quoteNumber,
      requestedBy: req.user.email
    });

    res.json({ quote });

  } catch (error) {
    safeDebugError('Error retrieving quote', error);
    res.status(500).json({
      error: 'Failed to retrieve quote'
    });
  }
});

// Update quote (staff only)
router.put('/:id', [
  param('id').isAlphanumeric().withMessage('Invalid quote ID'),
  
  body('status')
    .optional()
    .isIn(['draft', 'pending-approval', 'approved', 'sent', 'accepted', 'rejected', 'expired'])
    .withMessage('Invalid status'),
  
  body('customerNotes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Customer notes must be less than 1000 characters'),
  
  body('internalNotes')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Internal notes must be less than 2000 characters')
], async (req, res) => {
  try {
    // Check permissions
    if (!req.user || !hasAnyRole(['admin', 'manager', 'technician'])) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Staff access required'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const db = getDb();
    const quoteRef = db.collection('quotes').doc(req.params.id);
    
    // Check if quote exists
    const existingQuote = await quoteRef.get();
    if (!existingQuote.exists) {
      return res.status(404).json({
        error: 'Quote not found'
      });
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      updatedAt: new Date(),
      updatedBy: req.user.uid
    };

    // Handle status changes
    if (req.body.status && req.body.status !== existingQuote.data().status) {
      updateData.statusHistory = [
        ...(existingQuote.data().statusHistory || []),
        {
          status: req.body.status,
          changedAt: new Date(),
          changedBy: req.user.uid,
          changedByName: req.user.email
        }
      ];

      // Handle approval status
      if (req.body.status === 'approved') {
        updateData.approvedBy = req.user.uid;
        updateData.approvedAt = new Date();
      }
    }

    await quoteRef.update(updateData);

    safeDebugLog('Quote updated', {
      id: req.params.id,
      updatedBy: req.user.email,
      changes: Object.keys(req.body)
    });

    res.json({
      success: true,
      message: 'Quote updated successfully'
    });

  } catch (error) {
    safeDebugError('Error updating quote', error);
    res.status(500).json({
      error: 'Failed to update quote'
    });
  }
});

// Generate PDF for quote (staff only)
router.post('/:id/generate-pdf', [
  param('id').isAlphanumeric().withMessage('Invalid quote ID')
], async (req, res) => {
  try {
    // Check permissions
    if (!req.user || !hasAnyRole(['admin', 'manager', 'technician'])) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Staff access required'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const quote = await getDocument('quotes', req.params.id);

    if (!quote) {
      return res.status(404).json({
        error: 'Quote not found'
      });
    }

    // Generate PDF
    const pdfService = require('../services/pdfService');
    const pdfBuffer = await pdfService.generateQuotePDF(quote);

    safeDebugLog('Quote PDF generated', {
      id: req.params.id,
      quoteNumber: quote.quoteNumber,
      generatedBy: req.user.email
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="quote-${quote.quoteNumber}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);

  } catch (error) {
    safeDebugError('Error generating quote PDF', error);
    res.status(500).json({
      error: 'Failed to generate PDF'
    });
  }
});

// Send quote to customer (staff only)
router.post('/:id/send', [
  param('id').isAlphanumeric().withMessage('Invalid quote ID'),
  
  body('emailMessage')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Email message must be less than 1000 characters'),
  
  body('includePDF')
    .optional()
    .isBoolean()
    .withMessage('Include PDF must be a boolean')
], async (req, res) => {
  try {
    // Check permissions
    if (!req.user || !hasAnyRole(['admin', 'manager'])) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Manager access required to send quotes'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const quote = await getDocument('quotes', req.params.id);

    if (!quote) {
      return res.status(404).json({
        error: 'Quote not found'
      });
    }

    if (quote.status !== 'approved') {
      return res.status(400).json({
        error: 'Quote must be approved before sending'
      });
    }

    // Send quote email
    const emailService = require('../services/emailService');
    const result = await emailService.sendQuoteEmail(quote, {
      customMessage: req.body.emailMessage,
      includePDF: req.body.includePDF !== false,
      sentBy: req.user.email
    });

    // Update quote status
    const db = getDb();
    await db.collection('quotes').doc(req.params.id).update({
      status: 'sent',
      sentAt: new Date(),
      sentBy: req.user.uid,
      emailsSent: (quote.emailsSent || 0) + 1,
      updatedAt: new Date()
    });

    safeDebugLog('Quote sent to customer', {
      id: req.params.id,
      quoteNumber: quote.quoteNumber,
      customerEmail: quote.customerInfo.email,
      sentBy: req.user.email,
      messageId: result.messageId
    });

    res.json({
      success: true,
      message: 'Quote sent successfully',
      messageId: result.messageId
    });

  } catch (error) {
    safeDebugError('Error sending quote', error);
    res.status(500).json({
      error: 'Failed to send quote'
    });
  }
});

// Helper functions
function generateQuoteNumber() {
  const prefix = 'Q';
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}${year}${timestamp}`;
}

function calculateExpiryDate() {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30); // 30 days validity
  return expiryDate;
}

async function calculateQuoteAmounts(removalDetails) {
  const {
    foamType,
    estimatedArea,
    accessDifficulty,
    urgency = 'standard'
  } = removalDetails;

  // Base rates per square meter
  const baseRates = {
    'open-cell': 25,
    'closed-cell': 35,
    'mixed': 30
  };

  // Difficulty multipliers
  const difficultyMultipliers = {
    'easy': 1.0,
    'moderate': 1.2,
    'difficult': 1.5,
    'extreme': 2.0
  };

  // Urgency multipliers
  const urgencyMultipliers = {
    'standard': 1.0,
    'urgent': 1.3,
    'emergency': 1.6
  };

  const baseRate = baseRates[foamType] || 30;
  const difficultyMultiplier = difficultyMultipliers[accessDifficulty] || 1.2;
  const urgencyMultiplier = urgencyMultipliers[urgency] || 1.0;

  const subtotal = estimatedArea * baseRate * difficultyMultiplier * urgencyMultiplier;
  
  // Additional costs
  const disposalFee = estimatedArea * 2; // £2 per sq meter disposal
  const travelCosts = calculateTravelCosts(estimatedArea);
  
  const netAmount = subtotal + disposalFee + travelCosts;
  const vatAmount = netAmount * 0.20; // 20% VAT
  const totalAmount = netAmount + vatAmount;

  return {
    calculations: {
      baseRate,
      estimatedArea,
      difficultyMultiplier,
      urgencyMultiplier,
      subtotal,
      disposalFee,
      travelCosts,
      netAmount,
      vatAmount,
      totalAmount
    },
    subtotal,
    netAmount,
    vatAmount,
    totalAmount: Math.round(totalAmount * 100) / 100 // Round to 2 decimal places
  };
}

function calculateTravelCosts(area) {
  // Basic travel cost calculation
  if (area < 50) return 50;
  if (area < 100) return 75;
  if (area < 200) return 100;
  return 150;
}

function getDefaultTerms() {
  return [
    'Quote valid for 30 days from date of issue',
    'Payment terms: 25% deposit required, balance on completion',
    'All prices include VAT at current rate',
    'Site survey may be required for large or complex projects',
    'Additional costs may apply for unexpected complications',
    'Disposal fees included in quoted price',
    'Public liability insurance included'
  ];
}

module.exports = router;