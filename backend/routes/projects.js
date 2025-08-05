/**
 * Projects API Routes
 * Handles project tracking, scheduling, and management
 */

const express = require('express');
const { body, validationResult, param } = require('express-validator');
const router = express.Router();

// Import utilities
const { safeDebugLog, safeDebugError } = require('../../shared/utils/errorHandler');
const { getDb } = require('../../shared/config/firebaseConfig');
const { hasAnyRole } = require('../../shared/auth/authManager');
const { smartQuery, getDocument } = require('../../shared/utils/BatchQueryService');

// Validation rules for project creation
const createProjectValidation = [
  body('quoteId')
    .isString()
    .withMessage('Quote ID is required'),
  
  body('customerInfo')
    .isObject()
    .withMessage('Customer information is required'),
  
  body('projectDetails')
    .isObject()
    .withMessage('Project details are required'),
  
  body('projectDetails.title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Project title must be between 5 and 200 characters'),
  
  body('projectDetails.description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  
  body('scheduledDate')
    .isISO8601()
    .toDate()
    .withMessage('Valid scheduled date is required'),
  
  body('estimatedDuration')
    .isNumeric()
    .isFloat({ min: 0.5, max: 240 })
    .withMessage('Estimated duration must be between 0.5 and 240 hours'),
  
  body('assignedTechnician')
    .optional()
    .isString()
    .withMessage('Assigned technician must be a string'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level')
];

// Create new project (staff only)
router.post('/', createProjectValidation, async (req, res) => {
  try {
    // Check permissions
    if (!req.user || !hasAnyRole(['admin', 'manager'])) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Manager access required'
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
    
    // Verify quote exists and is accepted
    const quote = await getDocument('quotes', req.body.quoteId);
    if (!quote || quote.status !== 'accepted') {
      return res.status(400).json({
        error: 'Quote must be accepted before creating project'
      });
    }

    const projectData = {
      ...req.body,
      
      // Project metadata
      projectNumber: generateProjectNumber(),
      status: 'scheduled',
      phase: 'planning',
      
      // Progress tracking
      progressPercentage: 0,
      milestones: generateDefaultMilestones(req.body.projectDetails),
      
      // Dates
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedCompletionDate: calculateCompletionDate(req.body.scheduledDate, req.body.estimatedDuration),
      
      // Staff info
      createdBy: req.user.uid,
      createdByName: req.user.email,
      
      // Financial
      totalValue: quote.totalAmount,
      invoiceStatus: 'pending',
      
      // Safety and compliance
      riskAssessmentRequired: true,
      riskAssessmentCompleted: false,
      
      // Documentation
      documents: [],
      photos: [],
      
      // Communication
      customerUpdates: [],
      internalNotes: []
    };

    // Add to Firestore
    const docRef = await db.collection('projects').add(projectData);
    projectData.id = docRef.id;

    // Update quote status
    await db.collection('quotes').doc(req.body.quoteId).update({
      projectId: docRef.id,
      status: 'project-created',
      updatedAt: new Date()
    });

    safeDebugLog('Project created', {
      id: docRef.id,
      projectNumber: projectData.projectNumber,
      quoteId: req.body.quoteId,
      createdBy: req.user.email,
      scheduledDate: projectData.scheduledDate
    });

    // Send notification to customer
    try {
      const emailService = require('../services/emailService');
      await emailService.sendProjectConfirmation(projectData);
    } catch (emailError) {
      safeDebugError('Failed to send project confirmation', emailError);
    }

    res.status(201).json({
      success: true,
      project: {
        id: projectData.id,
        projectNumber: projectData.projectNumber,
        status: projectData.status,
        scheduledDate: projectData.scheduledDate,
        createdAt: projectData.createdAt
      }
    });

  } catch (error) {
    safeDebugError('Error creating project', error);
    res.status(500).json({
      error: 'Failed to create project'
    });
  }
});

// Get all projects (staff only)
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
      assignedTechnician,
      priority,
      phase,
      limit = '50',
      offset = '0',
      sortBy = 'scheduledDate',
      sortOrder = 'asc'
    } = req.query;

    // Build query parameters
    const queryParams = {
      orderBy: [[sortBy, sortOrder]],
      limit: parseInt(limit)
    };

    // Add filters
    const whereConditions = [];
    if (status) whereConditions.push(['status', '==', status]);
    if (assignedTechnician) whereConditions.push(['assignedTechnician', '==', assignedTechnician]);
    if (priority) whereConditions.push(['priority', '==', priority]);
    if (phase) whereConditions.push(['phase', '==', phase]);

    // Technicians can only see their own projects
    if (req.user.role === 'technician') {
      whereConditions.push(['assignedTechnician', '==', req.user.uid]);
    }

    if (whereConditions.length > 0) {
      queryParams.where = whereConditions;
    }

    // Use smart query with caching
    const projects = await smartQuery('projects', queryParams);

    safeDebugLog('Projects retrieved', {
      count: projects.length,
      requestedBy: req.user.email,
      filters: { status, assignedTechnician, priority, phase }
    });

    res.json({ projects });

  } catch (error) {
    safeDebugError('Error retrieving projects', error);
    res.status(500).json({
      error: 'Failed to retrieve projects'
    });
  }
});

// Get specific project (staff only)
router.get('/:id', [
  param('id').isAlphanumeric().withMessage('Invalid project ID')
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

    const project = await getDocument('projects', req.params.id);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Technicians can only access their own projects
    if (req.user.role === 'technician' && project.assignedTechnician !== req.user.uid) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your assigned projects'
      });
    }

    safeDebugLog('Project retrieved', {
      id: req.params.id,
      projectNumber: project.projectNumber,
      requestedBy: req.user.email
    });

    res.json({ project });

  } catch (error) {
    safeDebugError('Error retrieving project', error);
    res.status(500).json({
      error: 'Failed to retrieve project'
    });
  }
});

// Update project (staff only)
router.put('/:id', [
  param('id').isAlphanumeric().withMessage('Invalid project ID'),
  
  body('status')
    .optional()
    .isIn(['scheduled', 'in-progress', 'on-hold', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  
  body('phase')
    .optional()
    .isIn(['planning', 'preparation', 'removal', 'cleanup', 'inspection', 'completed'])
    .withMessage('Invalid phase'),
  
  body('progressPercentage')
    .optional()
    .isNumeric()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100'),
  
  body('assignedTechnician')
    .optional()
    .isString()
    .withMessage('Assigned technician must be a string'),
  
  body('internalNotes')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Internal notes must be less than 2000 characters'),
  
  body('customerUpdate')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Customer update must be less than 1000 characters')
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
    const projectRef = db.collection('projects').doc(req.params.id);
    
    // Check if project exists
    const existingProject = await projectRef.get();
    if (!existingProject.exists) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    const projectData = existingProject.data();

    // Technicians can only update their own projects
    if (req.user.role === 'technician' && projectData.assignedTechnician !== req.user.uid) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your assigned projects'
      });
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      updatedAt: new Date(),
      updatedBy: req.user.uid
    };

    // Handle status changes
    if (req.body.status && req.body.status !== projectData.status) {
      updateData.statusHistory = [
        ...(projectData.statusHistory || []),
        {
          status: req.body.status,
          changedAt: new Date(),
          changedBy: req.user.uid,
          changedByName: req.user.email
        }
      ];

      // Handle completion
      if (req.body.status === 'completed') {
        updateData.completedAt = new Date();
        updateData.progressPercentage = 100;
      }
    }

    // Handle customer updates
    if (req.body.customerUpdate) {
      updateData.customerUpdates = [
        ...(projectData.customerUpdates || []),
        {
          message: req.body.customerUpdate,
          createdAt: new Date(),
          createdBy: req.user.uid,
          createdByName: req.user.email
        }
      ];

      // Send customer notification
      try {
        const emailService = require('../services/emailService');
        await emailService.sendProjectUpdate(projectData, req.body.customerUpdate);
      } catch (emailError) {
        safeDebugError('Failed to send customer update', emailError);
      }
    }

    // Handle internal notes
    if (req.body.internalNotes) {
      updateData.internalNotes = [
        ...(projectData.internalNotes || []),
        {
          note: req.body.internalNotes,
          createdAt: new Date(),
          createdBy: req.user.uid,
          createdByName: req.user.email
        }
      ];
    }

    await projectRef.update(updateData);

    safeDebugLog('Project updated', {
      id: req.params.id,
      updatedBy: req.user.email,
      changes: Object.keys(req.body)
    });

    res.json({
      success: true,
      message: 'Project updated successfully'
    });

  } catch (error) {
    safeDebugError('Error updating project', error);
    res.status(500).json({
      error: 'Failed to update project'
    });
  }
});

// Complete milestone (staff only)
router.post('/:id/milestones/:milestoneId/complete', [
  param('id').isAlphanumeric().withMessage('Invalid project ID'),
  param('milestoneId').isString().withMessage('Invalid milestone ID'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
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
    const projectRef = db.collection('projects').doc(req.params.id);
    
    const project = await projectRef.get();
    if (!project.exists) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    const projectData = project.data();
    
    // Find and update milestone
    const milestones = projectData.milestones || [];
    const milestoneIndex = milestones.findIndex(m => m.id === req.params.milestoneId);
    
    if (milestoneIndex === -1) {
      return res.status(404).json({
        error: 'Milestone not found'
      });
    }

    milestones[milestoneIndex] = {
      ...milestones[milestoneIndex],
      completed: true,
      completedAt: new Date(),
      completedBy: req.user.uid,
      completedByName: req.user.email,
      notes: req.body.notes || null
    };

    // Calculate new progress percentage
    const completedMilestones = milestones.filter(m => m.completed).length;
    const progressPercentage = Math.round((completedMilestones / milestones.length) * 100);

    await projectRef.update({
      milestones,
      progressPercentage,
      updatedAt: new Date(),
      updatedBy: req.user.uid
    });

    safeDebugLog('Milestone completed', {
      projectId: req.params.id,
      milestoneId: req.params.milestoneId,
      completedBy: req.user.email,
      newProgress: progressPercentage
    });

    res.json({
      success: true,
      message: 'Milestone completed successfully',
      progressPercentage
    });

  } catch (error) {
    safeDebugError('Error completing milestone', error);
    res.status(500).json({
      error: 'Failed to complete milestone'
    });
  }
});

// Helper functions
function generateProjectNumber() {
  const prefix = 'P';
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}${year}${timestamp}`;
}

function calculateCompletionDate(scheduledDate, estimatedDuration) {
  const completionDate = new Date(scheduledDate);
  completionDate.setHours(completionDate.getHours() + estimatedDuration);
  return completionDate;
}

function generateDefaultMilestones(projectDetails) {
  return [
    {
      id: 'site-survey',
      title: 'Site Survey & Planning',
      description: 'Complete initial site survey and finalize removal plan',
      order: 1,
      completed: false,
      estimatedHours: 2
    },
    {
      id: 'risk-assessment',
      title: 'Risk Assessment',
      description: 'Complete health and safety risk assessment',
      order: 2,
      completed: false,
      estimatedHours: 1
    },
    {
      id: 'setup',
      title: 'Site Setup',
      description: 'Set up equipment and safety measures',
      order: 3,
      completed: false,
      estimatedHours: 1
    },
    {
      id: 'removal',
      title: 'Foam Removal',
      description: 'Remove spray foam insulation',
      order: 4,
      completed: false,
      estimatedHours: projectDetails.estimatedDuration ? projectDetails.estimatedDuration * 0.7 : 8
    },
    {
      id: 'cleanup',
      title: 'Site Cleanup',
      description: 'Clean site and remove all waste materials',
      order: 5,
      completed: false,
      estimatedHours: 2
    },
    {
      id: 'inspection',
      title: 'Final Inspection',
      description: 'Complete final inspection and customer walkthrough',
      order: 6,
      completed: false,
      estimatedHours: 1
    }
  ];
}

module.exports = router;