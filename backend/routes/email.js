/**
 * Email API Routes
 * Handles direct email sending and template management
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Import utilities
const { safeDebugLog, safeDebugError } = require('../../shared/utils/errorHandler');
const { hasAnyRole } = require('../../shared/auth/authManager');
const emailService = require('../services/emailService');

// Validation rules for sending emails
const sendEmailValidation = [
  body('to')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid recipient email is required'),
  
  body('templateType')
    .isIn(['inquiry-confirmation', 'quote-email', 'project-update', 'welcome-email', 'password-reset'])
    .withMessage('Valid template type is required'),
  
  body('templateData')
    .isObject()
    .withMessage('Template data must be an object'),
  
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high'])
    .withMessage('Invalid priority level')
];

// Send templated email (staff only)
router.post('/send', sendEmailValidation, async (req, res) => {
  try {
    // Check permissions
    if (!req.user || !hasAnyRole(['admin', 'manager'])) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Manager access required for sending emails'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { to, templateType, templateData, priority = 'normal' } = req.body;

    // Send email using service
    const result = await emailService.sendTemplatedEmail(
      templateType,
      to,
      templateData,
      priority
    );

    safeDebugLog('Email sent via API', {
      to,
      templateType,
      messageId: result.messageId,
      sentBy: req.user.email
    });

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    safeDebugError('Error sending email via API', error);
    res.status(500).json({
      error: 'Failed to send email',
      message: error.message
    });
  }
});

// Send bulk emails (admin only)
router.post('/send-bulk', [
  body('recipients')
    .isArray({ min: 1, max: 100 })
    .withMessage('Recipients must be an array with 1-100 emails'),
  
  body('recipients.*')
    .isEmail()
    .normalizeEmail()
    .withMessage('All recipients must be valid email addresses'),
  
  body('templateType')
    .isIn(['inquiry-confirmation', 'quote-email', 'project-update', 'welcome-email', 'password-reset'])
    .withMessage('Valid template type is required'),
  
  body('templateData')
    .isObject()
    .withMessage('Template data must be an object'),
  
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high'])
    .withMessage('Invalid priority level')
], async (req, res) => {
  try {
    // Check permissions - only admin can send bulk emails
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin access required for bulk emails'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { recipients, templateType, templateData, priority = 'normal' } = req.body;

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // Send emails sequentially to avoid rate limiting
    for (const recipient of recipients) {
      try {
        const result = await emailService.sendTemplatedEmail(
          templateType,
          recipient,
          templateData,
          priority
        );

        results.push({
          email: recipient,
          success: true,
          messageId: result.messageId
        });
        successCount++;

        // Add small delay between emails
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        safeDebugError('Bulk email failed for recipient', {
          recipient,
          error: error.message
        });

        results.push({
          email: recipient,
          success: false,
          error: error.message
        });
        failureCount++;
      }
    }

    safeDebugLog('Bulk email completed', {
      templateType,
      totalRecipients: recipients.length,
      successCount,
      failureCount,
      sentBy: req.user.email
    });

    res.json({
      success: true,
      message: `Bulk email completed: ${successCount} sent, ${failureCount} failed`,
      summary: {
        total: recipients.length,
        sent: successCount,
        failed: failureCount
      },
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    safeDebugError('Error in bulk email operation', error);
    res.status(500).json({
      error: 'Failed to send bulk emails',
      message: error.message
    });
  }
});

// Test email configuration (admin only)
router.post('/test', [
  body('testEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid test email is required')
], async (req, res) => {
  try {
    // Check permissions - only admin can test email
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

    const { testEmail } = req.body;

    // Send test email
    const result = await emailService.sendTemplatedEmail(
      'welcome-email',
      testEmail,
      {
        userName: 'Test User',
        userEmail: testEmail,
        userRole: 'Test Role',
        accessLevel: 'Test Access',
        loginUrl: 'https://foamfighters.co.uk/admin'
      },
      'normal'
    );

    safeDebugLog('Test email sent', {
      testEmail,
      messageId: result.messageId,
      testedBy: req.user.email
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
      recipient: testEmail,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    safeDebugError('Error sending test email', error);
    res.status(500).json({
      error: 'Failed to send test email',
      message: error.message
    });
  }
});

// Get email statistics (admin only)
router.get('/stats', async (req, res) => {
  try {
    // Check permissions - only admin can view email stats
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin access required'
      });
    }

    // This would typically come from a logging service or database
    // For now, return mock statistics
    const stats = {
      total: {
        sent: 1250,
        failed: 45,
        pending: 12
      },
      byTemplate: {
        'inquiry-confirmation': 480,
        'quote-email': 320,
        'project-update': 280,
        'welcome-email': 125,
        'password-reset': 45
      },
      byPriority: {
        low: 200,
        normal: 950,
        high: 100
      },
      recent: {
        last24Hours: 85,
        last7Days: 420,
        last30Days: 1295
      },
      failures: {
        invalidAddress: 20,
        blocked: 10,
        other: 15
      }
    };

    safeDebugLog('Email statistics retrieved', {
      requestedBy: req.user.email
    });

    res.json({
      success: true,
      statistics: stats,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    safeDebugError('Error retrieving email statistics', error);
    res.status(500).json({
      error: 'Failed to retrieve email statistics'
    });
  }
});

// Preview email template (staff only)
router.post('/preview', [
  body('templateType')
    .isIn(['inquiry-confirmation', 'quote-email', 'project-update', 'welcome-email', 'password-reset'])
    .withMessage('Valid template type is required'),
  
  body('templateData')
    .isObject()
    .withMessage('Template data must be an object')
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

    const { templateType, templateData } = req.body;

    // Get the template and render it
    if (!emailService.templates || !emailService.templates.has(templateType)) {
      return res.status(404).json({
        error: 'Template not found',
        templateType
      });
    }

    const template = emailService.templates.get(templateType);
    
    // Prepare email data with defaults
    const emailData = {
      companyName: 'Foam Fighters Ltd',
      companyPhone: '0333 577 0132',
      companyEmail: 'info@foamfighters.co.uk',
      ...templateData
    };

    const htmlContent = template(emailData);
    const subject = emailService.getEmailSubject(templateType, emailData);

    safeDebugLog('Email template previewed', {
      templateType,
      previewedBy: req.user.email
    });

    res.json({
      success: true,
      preview: {
        subject,
        htmlContent,
        templateType,
        templateData: emailData
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    safeDebugError('Error previewing email template', error);
    res.status(500).json({
      error: 'Failed to preview email template',
      message: error.message
    });
  }
});

module.exports = router;