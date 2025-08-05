/**
 * File Upload API Routes
 * Handles secure file uploads with validation and storage
 */

const express = require('express');
const multer = require('multer');
const { body, validationResult, param } = require('express-validator');
const router = express.Router();
const admin = require('firebase-admin');
const sharp = require('sharp');
const path = require('path');

// Import utilities
const { safeDebugLog, safeDebugError } = require('../../shared/utils/errorHandler');
const { getDb } = require('../../shared/config/firebaseConfig');
const { hasAnyRole } = require('../../shared/auth/authManager');

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Maximum 10 files per request
  },
  fileFilter: (req, file, cb) => {
    try {
      const allowedTypes = getAllowedFileTypes(req.params.category || 'general');
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} not allowed for category ${req.params.category}`), false);
      }
    } catch (error) {
      cb(error, false);
    }
  }
});

// Get storage bucket
function getStorageBucket() {
  return admin.storage().bucket();
}

// File type validation by category
function getAllowedFileTypes(category) {
  const fileTypes = {
    images: [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp'
    ],
    documents: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ],
    project: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    general: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf'
    ]
  };

  return fileTypes[category] || fileTypes.general;
}

// Upload files (staff only)
router.post('/:category', upload.array('files', 10), async (req, res) => {
  try {
    // Check permissions
    if (!req.user || !hasAnyRole(['admin', 'manager', 'technician'])) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Staff access required'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files provided'
      });
    }

    const category = req.params.category;
    const validCategories = ['images', 'documents', 'project', 'profiles', 'gallery'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid upload category'
      });
    }

    const bucket = getStorageBucket();
    const uploadResults = [];
    const db = getDb();

    for (const file of req.files) {
      try {
        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const extension = path.extname(file.originalname);
        const filename = `${timestamp}_${random}${extension}`;
        const filePath = `${category}/${filename}`;

        let processedBuffer = file.buffer;

        // Process images (resize and optimize)
        if (file.mimetype.startsWith('image/')) {
          processedBuffer = await processImage(file.buffer, category);
        }

        // Upload to Firebase Storage
        const fileRef = bucket.file(filePath);
        
        await fileRef.save(processedBuffer, {
          metadata: {
            contentType: file.mimetype,
            metadata: {
              originalName: file.originalname,
              uploadedBy: req.user.uid,
              uploadedByName: req.user.email,
              uploadedAt: new Date().toISOString(),
              category: category
            }
          }
        });

        // Make file publicly accessible if it's a gallery or profile image
        if (['gallery', 'profiles'].includes(category)) {
          await fileRef.makePublic();
        }

        // Generate download URL
        const [downloadURL] = await fileRef.getSignedUrl({
          action: 'read',
          expires: '03-01-2500' // Far future date for long-term access
        });

        // Store metadata in Firestore
        const fileMetadata = {
          filename: filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          category: category,
          filePath: filePath,
          downloadURL: downloadURL,
          uploadedBy: req.user.uid,
          uploadedByName: req.user.email,
          uploadedAt: new Date(),
          isPublic: ['gallery', 'profiles'].includes(category)
        };

        const docRef = await db.collection('uploads').add(fileMetadata);
        fileMetadata.id = docRef.id;

        uploadResults.push({
          id: fileMetadata.id,
          filename: filename,
          originalName: file.originalname,
          downloadURL: downloadURL,
          size: file.size,
          mimetype: file.mimetype
        });

        safeDebugLog('File uploaded successfully', {
          id: fileMetadata.id,
          filename: filename,
          category: category,
          size: file.size,
          uploadedBy: req.user.email
        });

      } catch (fileError) {
        safeDebugError('Error uploading individual file', {
          filename: file.originalname,
          error: fileError.message
        });
        
        uploadResults.push({
          originalName: file.originalname,
          error: fileError.message,
          success: false
        });
      }
    }

    // Check if any uploads succeeded
    const successfulUploads = uploadResults.filter(result => !result.error);
    
    if (successfulUploads.length === 0) {
      return res.status(500).json({
        error: 'All file uploads failed',
        details: uploadResults
      });
    }

    res.json({
      success: true,
      message: `${successfulUploads.length} of ${req.files.length} files uploaded successfully`,
      files: uploadResults
    });

  } catch (error) {
    safeDebugError('Error uploading files', error);
    res.status(500).json({
      error: 'Failed to upload files',
      message: error.message
    });
  }
});

// Get uploaded files (staff only)
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
      category,
      uploadedBy,
      limit = '50',
      offset = '0',
      sortBy = 'uploadedAt',
      sortOrder = 'desc'
    } = req.query;

    const db = getDb();
    let query = db.collection('uploads');

    // Add filters
    if (category) {
      query = query.where('category', '==', category);
    }
    if (uploadedBy) {
      query = query.where('uploadedBy', '==', uploadedBy);
    }

    // Add ordering and pagination
    query = query.orderBy(sortBy, sortOrder)
                 .limit(parseInt(limit))
                 .offset(parseInt(offset));

    const snapshot = await query.get();
    const files = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    safeDebugLog('Files retrieved', {
      count: files.length,
      requestedBy: req.user.email,
      filters: { category, uploadedBy }
    });

    res.json({ files });

  } catch (error) {
    safeDebugError('Error retrieving files', error);
    res.status(500).json({
      error: 'Failed to retrieve files'
    });
  }
});

// Get specific file metadata (staff only)
router.get('/:fileId', [
  param('fileId').isAlphanumeric().withMessage('Invalid file ID')
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
    const fileDoc = await db.collection('uploads').doc(req.params.fileId).get();

    if (!fileDoc.exists) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    const fileData = {
      id: fileDoc.id,
      ...fileDoc.data()
    };

    safeDebugLog('File metadata retrieved', {
      id: req.params.fileId,
      filename: fileData.filename,
      requestedBy: req.user.email
    });

    res.json({ file: fileData });

  } catch (error) {
    safeDebugError('Error retrieving file metadata', error);
    res.status(500).json({
      error: 'Failed to retrieve file metadata'
    });
  }
});

// Delete file (staff only)
router.delete('/:fileId', [
  param('fileId').isAlphanumeric().withMessage('Invalid file ID')
], async (req, res) => {
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
    const fileDoc = await db.collection('uploads').doc(req.params.fileId).get();

    if (!fileDoc.exists) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    const fileData = fileDoc.data();

    // Delete from Firebase Storage
    const bucket = getStorageBucket();
    const fileRef = bucket.file(fileData.filePath);
    
    try {
      await fileRef.delete();
    } catch (storageError) {
      // File might already be deleted from storage
      safeDebugError('Error deleting from storage (file may not exist)', storageError);
    }

    // Delete metadata from Firestore
    await db.collection('uploads').doc(req.params.fileId).delete();

    safeDebugLog('File deleted', {
      id: req.params.fileId,
      filename: fileData.filename,
      deletedBy: req.user.email
    });

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    safeDebugError('Error deleting file', error);
    res.status(500).json({
      error: 'Failed to delete file'
    });
  }
});

// Upload profile image (own profile or admin)
router.post('/profile/:userId', upload.single('profileImage'), async (req, res) => {
  try {
    // Check permissions
    const isOwnProfile = req.user && req.user.uid === req.params.userId;
    const isAdmin = req.user && req.user.role === 'admin';
    
    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only upload your own profile image or need admin access'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided'
      });
    }

    // Validate image file
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        error: 'Only image files are allowed for profile pictures'
      });
    }

    const bucket = getStorageBucket();
    const filename = `profile_${req.params.userId}_${Date.now()}.jpg`;
    const filePath = `profiles/${filename}`;

    // Process and resize image
    const processedBuffer = await sharp(req.file.buffer)
      .resize(300, 300, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ 
        quality: 90,
        progressive: true 
      })
      .toBuffer();

    // Upload to Firebase Storage
    const fileRef = bucket.file(filePath);
    
    await fileRef.save(processedBuffer, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: {
          originalName: req.file.originalname,
          uploadedBy: req.user.uid,
          uploadedAt: new Date().toISOString(),
          category: 'profile',
          userId: req.params.userId
        }
      }
    });

    // Make file public
    await fileRef.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    // Update user profile
    const db = getDb();
    await db.collection('users').doc(req.params.userId).update({
      profileImageUrl: publicUrl,
      updatedAt: new Date()
    });

    safeDebugLog('Profile image uploaded', {
      userId: req.params.userId,
      filename: filename,
      uploadedBy: req.user.email
    });

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      profileImageUrl: publicUrl
    });

  } catch (error) {
    safeDebugError('Error uploading profile image', error);
    res.status(500).json({
      error: 'Failed to upload profile image'
    });
  }
});

// Helper function to process images
async function processImage(buffer, category) {
  try {
    let sharpInstance = sharp(buffer);
    
    // Get image metadata
    const metadata = await sharpInstance.metadata();
    
    // Resize based on category
    switch (category) {
      case 'gallery':
        sharpInstance = sharpInstance.resize(1200, 800, { 
          fit: 'inside',
          withoutEnlargement: true 
        });
        break;
      case 'project':
        sharpInstance = sharpInstance.resize(1000, 1000, { 
          fit: 'inside',
          withoutEnlargement: true 
        });
        break;
      case 'profiles':
        sharpInstance = sharpInstance.resize(300, 300, { 
          fit: 'cover',
          position: 'center' 
        });
        break;
      default:
        sharpInstance = sharpInstance.resize(800, 600, { 
          fit: 'inside',
          withoutEnlargement: true 
        });
    }

    // Convert to JPEG with optimization
    return await sharpInstance
      .jpeg({ 
        quality: 85,
        progressive: true,
        mozjpeg: true 
      })
      .toBuffer();

  } catch (error) {
    safeDebugError('Error processing image', error);
    // Return original buffer if processing fails
    return buffer;
  }
}

module.exports = router;