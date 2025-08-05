/**
 * Customer Inquiries API Routes
 * Handles customer inquiry submissions and management
 */

const express = require('express');
const { body, validationResult, param } = require('express-validator');
const router = express.Router();

// Import utilities
const { safeDebugLog, safeDebugError } = require('../../shared/utils/errorHandler');
const { getDb } = require('../../shared/config/firebaseConfig');
const { hasAnyRole } = require('../../shared/auth/authManager');
const { smartQuery, getDocument } = require('../../shared/utils/BatchQueryService');

// Validation rules for inquiry creation
const createInquiryValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),
  
  body('phone')
    .optional()
    .isMobilePhone('en-GB')
    .withMessage('Valid UK phone number is required'),
  
  body('subject')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters'),
  
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  
  body('propertyType')
    .optional()
    .isIn(['residential', 'commercial', 'industrial', 'other'])
    .withMessage('Invalid property type'),
  
  body('urgency')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid urgency level'),
  
  body('foamType')
    .optional()
    .isIn(['open-cell', 'closed-cell', 'unknown', 'mixed'])
    .withMessage('Invalid foam type'),
  
  body('estimatedArea')
    .optional()
    .isNumeric()
    .withMessage('Estimated area must be a number'),
  
  body('preferredContact')
    .optional()
    .isIn(['email', 'phone', 'either'])
    .withMessage('Invalid preferred contact method'),
  
  body('consent')
    .isBoolean()
    .equals('true')
    .withMessage('Consent is required to process the inquiry')
];

// Create new inquiry (public endpoint)
router.post('/', createInquiryValidation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const db = getDb();
    const inquiryData = {
      ...req.body,
      status: 'new',
      source: 'website',
      submittedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      
      // Generate reference number
      referenceNumber: generateReferenceNumber(),
      
      // Initial assignment
      assignedTo: null,
      priority: mapUrgencyToPriority(req.body.urgency || 'medium'),
      
      // Tracking
      responseRequired: true,
      followUpDate: calculateFollowUpDate(req.body.urgency || 'medium'),
      
      // Metadata
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add to Firestore
    const docRef = await db.collection('inquiries').add(inquiryData);
    inquiryData.id = docRef.id;

    safeDebugLog('New inquiry created', {
      id: docRef.id,
      referenceNumber: inquiryData.referenceNumber,
      email: inquiryData.email,
      urgency: inquiryData.urgency
    });

    // Send confirmation email (async)
    try {
      const emailService = require('../services/emailService');
      await emailService.sendInquiryConfirmation(inquiryData);
    } catch (emailError) {
      safeDebugError('Failed to send confirmation email', emailError);
      // Don't fail the request if email fails
    }

    // Notify staff (async)
    try {
      const notificationService = require('../services/notificationService');
      await notificationService.notifyNewInquiry(inquiryData);
    } catch (notifyError) {
      safeDebugError('Failed to notify staff', notifyError);
      // Don't fail the request if notification fails
    }

    res.status(201).json({
      success: true,
      inquiry: {
        id: inquiryData.id,
        referenceNumber: inquiryData.referenceNumber,
        status: inquiryData.status,
        submittedAt: inquiryData.submittedAt
      },
      message: 'Inquiry submitted successfully. You will receive a confirmation email shortly.'
    });

  } catch (error) {
    safeDebugError('Error creating inquiry', error);
    res.status(500).json({
      error: 'Failed to submit inquiry',
      message: 'Please try again or contact us directly'
    });
  }
});

// Get all inquiries (staff only)
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
      assignedTo,
      priority,
      limit = '50',
      offset = '0',
      sortBy = 'submittedAt',
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
    if (assignedTo) whereConditions.push(['assignedTo', '==', assignedTo]);
    if (priority) whereConditions.push(['priority', '==', priority]);

    if (whereConditions.length > 0) {
      queryParams.where = whereConditions;
    }

    // Use smart query with caching
    const inquiries = await smartQuery('inquiries', queryParams);

    // Get total count for pagination
    const totalQuery = whereConditions.length > 0 
      ? { where: whereConditions }
      : {};
    const totalInquiries = await smartQuery('inquiries', totalQuery);

    safeDebugLog('Inquiries retrieved', {
      count: inquiries.length,
      total: totalInquiries.length,
      requestedBy: req.user.email,
      filters: { status, assignedTo, priority }
    });

    res.json({
      inquiries,
      pagination: {
        total: totalInquiries.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + inquiries.length) < totalInquiries.length
      }
    });

  } catch (error) {
    safeDebugError('Error retrieving inquiries', error);
    res.status(500).json({
      error: 'Failed to retrieve inquiries'
    });
  }
});

// Get specific inquiry (staff only)
router.get('/:id', [
  param('id').isAlphanumeric().withMessage('Invalid inquiry ID')
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

    const inquiry = await getDocument('inquiries', req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        error: 'Inquiry not found'
      });
    }

    safeDebugLog('Inquiry retrieved', {
      id: req.params.id,
      referenceNumber: inquiry.referenceNumber,
      requestedBy: req.user.email
    });

    res.json({ inquiry });

  } catch (error) {
    safeDebugError('Error retrieving inquiry', error);
    res.status(500).json({
      error: 'Failed to retrieve inquiry'
    });
  }
});

// Update inquiry (staff only)
router.put('/:id', [
  param('id').isAlphanumeric().withMessage('Invalid inquiry ID'),
  
  body('status')
    .optional()
    .isIn(['new', 'assigned', 'in-progress', 'quoted', 'scheduled', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  
  body('assignedTo')
    .optional()
    .isString()
    .withMessage('Assigned to must be a string'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  
  body('notes')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Notes must be less than 2000 characters'),
  
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
    const inquiryRef = db.collection('inquiries').doc(req.params.id);
    
    // Check if inquiry exists
    const existingInquiry = await inquiryRef.get();
    if (!existingInquiry.exists) {
      return res.status(404).json({
        error: 'Inquiry not found'
      });
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      updatedAt: new Date(),
      updatedBy: req.user.uid
    };

    // Add status change tracking
    if (req.body.status && req.body.status !== existingInquiry.data().status) {
      updateData.statusHistory = [
        ...(existingInquiry.data().statusHistory || []),
        {
          status: req.body.status,
          changedAt: new Date(),
          changedBy: req.user.uid,
          changedByName: req.user.email
        }
      ];
    }

    await inquiryRef.update(updateData);

    safeDebugLog('Inquiry updated', {
      id: req.params.id,
      updatedBy: req.user.email,
      changes: Object.keys(req.body)
    });

    res.json({
      success: true,
      message: 'Inquiry updated successfully'
    });

  } catch (error) {
    safeDebugError('Error updating inquiry', error);
    res.status(500).json({
      error: 'Failed to update inquiry'
    });
  }
});

// Delete inquiry (admin only)
router.delete('/:id', [
  param('id').isAlphanumeric().withMessage('Invalid inquiry ID')
], async (req, res) => {
  try {
    // Check permissions - only admin can delete
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin access required'
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
    const inquiryRef = db.collection('inquiries').doc(req.params.id);
    
    // Check if inquiry exists
    const existingInquiry = await inquiryRef.get();
    if (!existingInquiry.exists) {
      return res.status(404).json({
        error: 'Inquiry not found'
      });
    }

    await inquiryRef.delete();

    safeDebugLog('Inquiry deleted', {
      id: req.params.id,
      deletedBy: req.user.email,
      referenceNumber: existingInquiry.data().referenceNumber
    });

    res.json({
      success: true,
      message: 'Inquiry deleted successfully'
    });

  } catch (error) {
    safeDebugError('Error deleting inquiry', error);
    res.status(500).json({
      error: 'Failed to delete inquiry'
    });
  }
});

// Helper functions
function generateReferenceNumber() {
  const prefix = 'FF';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

function mapUrgencyToPriority(urgency) {
  const mapping = {
    low: 'low',
    medium: 'medium',
    high: 'high',
    urgent: 'urgent'
  };
  return mapping[urgency] || 'medium';
}

function calculateFollowUpDate(urgency) {
  const now = new Date();
  const hoursToAdd = {
    urgent: 2,
    high: 4,
    medium: 24,
    low: 48
  };
  
  now.setHours(now.getHours() + (hoursToAdd[urgency] || 24));
  return now;
}

module.exports = router;