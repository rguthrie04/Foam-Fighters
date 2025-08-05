/**
 * Centralized Authentication System
 * Role-based access control with automatic token refresh
 */

const { getAuth, getDb } = require('../config/firebaseConfig');

/**
 * Wait for Firebase Auth to be ready
 * Resolves when user is authenticated or null (not authenticated)
 */
async function waitForFirebaseAuth() {
  return new Promise((resolve) => {
    const auth = getAuth();
    
    if (auth.currentUser) {
      resolve(auth.currentUser);
    } else {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user);
      });
    }
  });
}

/**
 * Retry Firestore queries with authentication handling
 * Automatically retries on permission-denied errors
 */
async function retryFirestoreQuery(queryFn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await waitForFirebaseAuth();
      return await queryFn();
    } catch (error) {
      if (error.code === 'permission-denied' && i < maxRetries - 1) {
        // Wait with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        continue;
      }
      throw error;
    }
  }
}

/**
 * User roles and permissions
 */
const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  TECHNICIAN: 'technician',
  CUSTOMER: 'customer'
};

const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    'users.read', 'users.write', 'users.delete',
    'quotes.read', 'quotes.write', 'quotes.delete',
    'projects.read', 'projects.write', 'projects.delete',
    'inquiries.read', 'inquiries.write', 'inquiries.delete',
    'reports.read', 'settings.write'
  ],
  [USER_ROLES.MANAGER]: [
    'users.read', 'users.write',
    'quotes.read', 'quotes.write',
    'projects.read', 'projects.write',
    'inquiries.read', 'inquiries.write',
    'reports.read'
  ],
  [USER_ROLES.TECHNICIAN]: [
    'projects.read', 'projects.write',
    'quotes.read',
    'inquiries.read'
  ],
  [USER_ROLES.CUSTOMER]: [
    'inquiries.write'
  ]
};

/**
 * Get current user with role information
 */
async function getCurrentUser() {
  try {
    const user = await waitForFirebaseAuth();
    
    if (!user) {
      return null;
    }

    // Get user role from custom claims or Firestore
    const tokenResult = await user.getIdTokenResult();
    let role = tokenResult.claims.role;

    // If no role in custom claims, check Firestore
    if (!role) {
      const db = getDb();
      const userDoc = await db.collection('users').doc(user.uid).get();
      
      if (userDoc.exists) {
        role = userDoc.data().role || USER_ROLES.CUSTOMER;
      } else {
        // Create user document if it doesn't exist
        role = USER_ROLES.CUSTOMER;
        await db.collection('users').doc(user.uid).set({
          email: user.email,
          role: role,
          createdAt: new Date(),
          lastLogin: new Date()
        });
      }
    }

    return {
      uid: user.uid,
      email: user.email,
      role: role,
      permissions: ROLE_PERMISSIONS[role] || [],
      emailVerified: user.emailVerified,
      user: user // Raw Firebase user object
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user has specific permission
 */
async function hasPermission(permission) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return false;
    }

    return currentUser.permissions.includes(permission);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Check if user has specific role
 */
async function hasRole(role) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return false;
    }

    return currentUser.role === role;
  } catch (error) {
    console.error('Error checking role:', error);
    return false;
  }
}

/**
 * Check if user has any of the specified roles
 */
async function hasAnyRole(roles) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return false;
    }

    return roles.includes(currentUser.role);
  } catch (error) {
    console.error('Error checking roles:', error);
    return false;
  }
}

/**
 * Require authentication for a function
 */
function requireAuth(fn) {
  return async function(...args) {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('Authentication required');
    }
    
    return fn.apply(this, [user, ...args]);
  };
}

/**
 * Require specific permission for a function
 */
function requirePermission(permission, fn) {
  return async function(...args) {
    const hasRequiredPermission = await hasPermission(permission);
    
    if (!hasRequiredPermission) {
      throw new Error(`Permission required: ${permission}`);
    }
    
    const user = await getCurrentUser();
    return fn.apply(this, [user, ...args]);
  };
}

/**
 * Require specific role for a function
 */
function requireRole(role, fn) {
  return async function(...args) {
    const hasRequiredRole = await hasRole(role);
    
    if (!hasRequiredRole) {
      throw new Error(`Role required: ${role}`);
    }
    
    const user = await getCurrentUser();
    return fn.apply(this, [user, ...args]);
  };
}

/**
 * Sign in user with email and password
 */
async function signInWithEmail(email, password) {
  try {
    const auth = getAuth();
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    
    // Update last login
    const db = getDb();
    await db.collection('users').doc(userCredential.user.uid).update({
      lastLogin: new Date()
    });

    return await getCurrentUser();
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

/**
 * Sign out current user
 */
async function signOut() {
  try {
    const auth = getAuth();
    await auth.signOut();
    return true;
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Create new user account (admin only)
 */
async function createUser(email, password, role = USER_ROLES.CUSTOMER, additionalData = {}) {
  try {
    // Check if current user has permission to create users
    const hasCreatePermission = await hasPermission('users.write');
    
    if (!hasCreatePermission) {
      throw new Error('Permission denied: Cannot create users');
    }

    const auth = getAuth();
    const db = getDb();
    
    // Create user account
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    await db.collection('users').doc(user.uid).set({
      email: email,
      role: role,
      createdAt: new Date(),
      lastLogin: null,
      ...additionalData
    });

    // Set custom claims (requires admin SDK in backend)
    // This would typically be done via a Cloud Function
    
    return {
      uid: user.uid,
      email: email,
      role: role
    };
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
}

/**
 * Update user role (admin only)
 */
async function updateUserRole(userId, newRole) {
  try {
    const hasUpdatePermission = await hasPermission('users.write');
    
    if (!hasUpdatePermission) {
      throw new Error('Permission denied: Cannot update user roles');
    }

    const db = getDb();
    
    await db.collection('users').doc(userId).update({
      role: newRole,
      updatedAt: new Date()
    });

    // Update custom claims (requires backend function)
    // This would typically trigger a Cloud Function to update custom claims

    return true;
  } catch (error) {
    console.error('Update user role error:', error);
    throw error;
  }
}

/**
 * Get user by ID (admin/manager only)
 */
async function getUserById(userId) {
  try {
    const hasReadPermission = await hasPermission('users.read');
    
    if (!hasReadPermission) {
      throw new Error('Permission denied: Cannot read user data');
    }

    const db = getDb();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return null;
    }

    return {
      uid: userId,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
}

/**
 * Authentication state listener
 */
function onAuthStateChanged(callback) {
  const auth = getAuth();
  
  return auth.onAuthStateChanged(async (user) => {
    if (user) {
      const currentUser = await getCurrentUser();
      callback(currentUser);
    } else {
      callback(null);
    }
  });
}

/**
 * Force token refresh
 */
async function refreshAuthToken() {
  try {
    const user = await waitForFirebaseAuth();
    
    if (user) {
      await user.getIdToken(true); // Force refresh
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
}

// Export all authentication utilities
module.exports = {
  // Core functions
  waitForFirebaseAuth,
  retryFirestoreQuery,
  getCurrentUser,
  
  // Permission checks
  hasPermission,
  hasRole,
  hasAnyRole,
  
  // Function decorators
  requireAuth,
  requirePermission,
  requireRole,
  
  // Authentication actions
  signInWithEmail,
  signOut,
  
  // User management
  createUser,
  updateUserRole,
  getUserById,
  
  // Utilities
  onAuthStateChanged,
  refreshAuthToken,
  
  // Constants
  USER_ROLES,
  ROLE_PERMISSIONS
};

// Make available globally for debugging
if (typeof window !== 'undefined') {
  window.FoamAuthManager = module.exports;
}