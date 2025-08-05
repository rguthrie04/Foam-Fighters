/**
 * Users API Routes
 * Handles user management, roles, and permissions
 */

const express = require('express');
const { body, validationResult, param } = require('express-validator');
const router = express.Router();
const admin = require('firebase-admin');

// Import utilities
const { safeDebugLog, safeDebugError } = require('../../shared/utils/errorHandler');
const { getDb } = require('../../shared/config/firebaseConfig');
const { hasAnyRole, USER_ROLES } = require('../../shared/auth/authManager');
const { smartQuery, getDocument } = require('../../shared/utils/BatchQueryService');

// Validation rules for user creation
const createUserValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),
  
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('role')
    .isIn(Object.values(USER_ROLES))
    .withMessage('Valid role is required'),
  
  body('phone')
    .optional()
    .isMobilePhone('en-GB')
    .withMessage('Valid UK phone number required'),
  
  body('department')
    .optional()
    .isIn(['operations', 'sales', 'admin', 'management'])
    .withMessage('Invalid department'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// Get all users (admin/manager only)
router.get('/', async (req, res) => {
  try {
    // Check permissions
    if (!req.user || !hasAnyRole(['admin', 'manager'])) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin or manager access required'
      });
    }

    const {
      role,
      department,
      status,
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
    if (role) whereConditions.push(['role', '==', role]);
    if (department) whereConditions.push(['department', '==', department]);
    if (status) whereConditions.push(['status', '==', status]);

    if (whereConditions.length > 0) {
      queryParams.where = whereConditions;
    }

    // Use smart query with caching
    const users = await smartQuery('users', queryParams);

    // Remove sensitive information
    const safeUsers = users.map(user => ({
      uid: user.uid,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      phone: user.phone,
      status: user.status,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    }));

    safeDebugLog('Users retrieved', {
      count: safeUsers.length,
      requestedBy: req.user.email,
      filters: { role, department, status }
    });

    res.json({ users: safeUsers });

  } catch (error) {
    safeDebugError('Error retrieving users', error);
    res.status(500).json({
      error: 'Failed to retrieve users'
    });
  }
});

// Get specific user (admin/manager only, or own profile)
router.get('/:uid', [
  param('uid').isString().withMessage('Invalid user ID')
], async (req, res) => {
  try {
    // Check permissions
    const isOwnProfile = req.user && req.user.uid === req.params.uid;
    const hasAdminAccess = req.user && hasAnyRole(['admin', 'manager']);
    
    if (!isOwnProfile && !hasAdminAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own profile or need admin access'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const user = await getDocument('users', req.params.uid);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Remove sensitive information for non-admin users
    const safeUser = {
      uid: user.uid,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      phone: user.phone,
      status: user.status,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    };

    // Include additional info for admins
    if (hasAdminAccess) {
      safeUser.lastLoginIP = user.lastLoginIP;
      safeUser.loginCount = user.loginCount;
      safeUser.permissions = user.permissions;
    }

    safeDebugLog('User retrieved', {
      uid: req.params.uid,
      requestedBy: req.user.email,
      isOwnProfile
    });

    res.json({ user: safeUser });

  } catch (error) {
    safeDebugError('Error retrieving user', error);
    res.status(500).json({
      error: 'Failed to retrieve user'
    });
  }
});

// Create new user (admin only)
router.post('/', createUserValidation, async (req, res) => {
  try {
    // Check permissions - only admin can create users
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

    const { email, name, role, phone, department, password } = req.body;

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      emailVerified: false
    });

    // Set custom claims for role
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role,
      department: department || null
    });

    // Create user document in Firestore
    const db = getDb();
    const userData = {
      uid: userRecord.uid,
      email,
      name,
      role,
      department: department || null,
      phone: phone || null,
      status: 'active',
      createdAt: new Date(),
      createdBy: req.user.uid,
      createdByName: req.user.email,
      lastLogin: null,
      loginCount: 0,
      emailVerified: false
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    safeDebugLog('User created', {
      uid: userRecord.uid,
      email,
      role,
      createdBy: req.user.email
    });

    // Send welcome email
    try {
      const emailService = require('../services/emailService');
      await emailService.sendWelcomeEmail({
        email,
        name,
        role,
        uid: userRecord.uid
      });
    } catch (emailError) {
      safeDebugError('Failed to send welcome email', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      user: {
        uid: userRecord.uid,
        email,
        name,
        role,
        department,
        status: 'active',
        createdAt: userData.createdAt
      },
      message: 'User created successfully. Welcome email sent.'
    });

  } catch (error) {
    safeDebugError('Error creating user', error);
    
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({
        error: 'Email address is already in use'
      });
    }
    
    res.status(500).json({
      error: 'Failed to create user'
    });
  }
});

// Update user (admin only, or own profile for limited fields)
router.put('/:uid', [
  param('uid').isString().withMessage('Invalid user ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('phone')
    .optional()
    .isMobilePhone('en-GB')
    .withMessage('Valid UK phone number required'),
  
  body('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage('Valid role is required'),
  
  body('department')
    .optional()
    .isIn(['operations', 'sales', 'admin', 'management'])
    .withMessage('Invalid department'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Invalid status')
], async (req, res) => {
  try {
    const isOwnProfile = req.user && req.user.uid === req.params.uid;
    const isAdmin = req.user && req.user.role === 'admin';
    
    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your own profile or need admin access'
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
    const userRef = db.collection('users').doc(req.params.uid);
    
    // Check if user exists
    const existingUser = await userRef.get();
    if (!existingUser.exists) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Prepare update data
    const allowedFields = isAdmin 
      ? ['name', 'phone', 'role', 'department', 'status']
      : ['name', 'phone']; // Non-admins can only update limited fields

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update'
      });
    }

    updateData.updatedAt = new Date();
    updateData.updatedBy = req.user.uid;

    // Update Firestore document
    await userRef.update(updateData);

    // Update custom claims if role changed (admin only)
    if (isAdmin && req.body.role) {
      await admin.auth().setCustomUserClaims(req.params.uid, {
        role: req.body.role,
        department: req.body.department || existingUser.data().department
      });
    }

    // Update Firebase Auth display name if name changed
    if (req.body.name) {
      await admin.auth().updateUser(req.params.uid, {
        displayName: req.body.name
      });
    }

    safeDebugLog('User updated', {
      uid: req.params.uid,
      updatedBy: req.user.email,
      changes: Object.keys(updateData),
      isOwnProfile
    });

    res.json({
      success: true,
      message: 'User updated successfully'
    });

  } catch (error) {
    safeDebugError('Error updating user', error);
    res.status(500).json({
      error: 'Failed to update user'
    });
  }
});

// Deactivate user (admin only)
router.post('/:uid/deactivate', [
  param('uid').isString().withMessage('Invalid user ID'),
  
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason must be less than 500 characters')
], async (req, res) => {
  try {
    // Check permissions - only admin can deactivate users
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

    // Prevent admin from deactivating themselves
    if (req.params.uid === req.user.uid) {
      return res.status(400).json({
        error: 'Cannot deactivate your own account'
      });
    }

    const db = getDb();
    const userRef = db.collection('users').doc(req.params.uid);
    
    // Check if user exists
    const existingUser = await userRef.get();
    if (!existingUser.exists) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Disable user in Firebase Auth
    await admin.auth().updateUser(req.params.uid, {
      disabled: true
    });

    // Update user status in Firestore
    await userRef.update({
      status: 'inactive',
      deactivatedAt: new Date(),
      deactivatedBy: req.user.uid,
      deactivatedByName: req.user.email,
      deactivationReason: req.body.reason || 'No reason provided',
      updatedAt: new Date()
    });

    safeDebugLog('User deactivated', {
      uid: req.params.uid,
      email: existingUser.data().email,
      deactivatedBy: req.user.email,
      reason: req.body.reason
    });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });

  } catch (error) {
    safeDebugError('Error deactivating user', error);
    res.status(500).json({
      error: 'Failed to deactivate user'
    });
  }
});

// Reactivate user (admin only)
router.post('/:uid/reactivate', [
  param('uid').isString().withMessage('Invalid user ID')
], async (req, res) => {
  try {
    // Check permissions - only admin can reactivate users
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
    const userRef = db.collection('users').doc(req.params.uid);
    
    // Check if user exists
    const existingUser = await userRef.get();
    if (!existingUser.exists) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Enable user in Firebase Auth
    await admin.auth().updateUser(req.params.uid, {
      disabled: false
    });

    // Update user status in Firestore
    await userRef.update({
      status: 'active',
      reactivatedAt: new Date(),
      reactivatedBy: req.user.uid,
      reactivatedByName: req.user.email,
      updatedAt: new Date()
    });

    safeDebugLog('User reactivated', {
      uid: req.params.uid,
      email: existingUser.data().email,
      reactivatedBy: req.user.email
    });

    res.json({
      success: true,
      message: 'User reactivated successfully'
    });

  } catch (error) {
    safeDebugError('Error reactivating user', error);
    res.status(500).json({
      error: 'Failed to reactivate user'
    });
  }
});

// Reset user password (admin only)
router.post('/:uid/reset-password', [
  param('uid').isString().withMessage('Invalid user ID')
], async (req, res) => {
  try {
    // Check permissions - only admin can reset passwords
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

    const user = await getDocument('users', req.params.uid);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Generate password reset link
    const resetLink = await admin.auth().generatePasswordResetLink(user.email);

    safeDebugLog('Password reset initiated', {
      uid: req.params.uid,
      email: user.email,
      initiatedBy: req.user.email
    });

    // Send password reset email
    try {
      const emailService = require('../services/emailService');
      await emailService.sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetLink
      });
    } catch (emailError) {
      safeDebugError('Failed to send password reset email', emailError);
      return res.status(500).json({
        error: 'Failed to send password reset email'
      });
    }

    res.json({
      success: true,
      message: 'Password reset email sent successfully'
    });

  } catch (error) {
    safeDebugError('Error resetting password', error);
    res.status(500).json({
      error: 'Failed to reset password'
    });
  }
});

module.exports = router;