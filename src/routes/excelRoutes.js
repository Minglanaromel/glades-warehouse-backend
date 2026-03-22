// src/routes/excelRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware'); // This should now be the multer instance
const { protect, authorize } = require('../middleware/authMiddleware');
const { 
  uploadExcel, 
  getLatestData, 
  refreshData,
  getExcelTemplate,
  getUploadHistory,
  deleteUploadedFile
} = require('../controllers/excelController');

// ==================== MIDDLEWARE VALIDATION ====================

// Custom middleware to check if upload middleware is properly configured
const checkUploadMiddleware = (req, res, next) => {
  if (!upload || typeof upload.single !== 'function') {
    console.error('❌ Upload middleware not properly configured!');
    return res.status(500).json({
      success: false,
      message: 'Server configuration error: Upload middleware not available'
    });
  }
  next();
};

// Error handler for multer upload errors
const handleUploadError = (err, req, res, next) => {
  if (err) {
    console.error('📁 Upload error:', err.message);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only one file allowed.'
      });
    }
    
    if (err.message && err.message.includes('file type')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only .xlsx, .xls files are allowed.'
      });
    }
    
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  }
  next();
};

// ==================== ROUTES ====================

// All routes require authentication
router.use(protect);

// ==================== MAIN EXCEL OPERATIONS ====================

/**
 * POST /api/excel/upload
 * Upload and parse Excel file
 * Allowed roles: admin, manager, supervisor
 */
router.post(
  '/upload', 
  authorize('admin', 'manager', 'supervisor'),
  checkUploadMiddleware,
  (req, res, next) => {
    // Apply multer upload with error handling
    upload.single('file')(req, res, (err) => {
      if (err) {
        return handleUploadError(err, req, res, next);
      }
      next();
    });
  },
  uploadExcel
);

/**
 * GET /api/excel/latest
 * Get latest parsed Excel data
 * Public for authenticated users
 */
router.get('/latest', (req, res, next) => {
  console.log('📊 Fetching latest Excel data...');
  next();
}, getLatestData);

/**
 * POST /api/excel/refresh
 * Refresh data from saved file
 * Allowed roles: admin, manager
 */
router.post(
  '/refresh', 
  authorize('admin', 'manager'),
  refreshData
);

// ==================== TEMPLATE AND HISTORY ====================

/**
 * GET /api/excel/template
 * Download Excel template
 * Public for authenticated users
 */
router.get('/template', getExcelTemplate);

/**
 * GET /api/excel/history
 * Get upload history
 * Allowed roles: admin, manager
 */
router.get(
  '/history', 
  authorize('admin', 'manager'),
  getUploadHistory
);

/**
 * DELETE /api/excel/upload/:id
 * Delete upload record
 * Allowed roles: admin only
 */
router.delete(
  '/upload/:id', 
  authorize('admin'),
  deleteUploadedFile
);

// ==================== TEST ENDPOINT ====================

/**
 * GET /api/excel/test
 * Test endpoint to verify routes are working
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Excel routes are working',
    user: req.user ? { id: req.user.id, role: req.user.role } : null,
    timestamp: new Date().toISOString()
  });
});

// ==================== DEBUG: Log all registered routes ====================
if (process.env.NODE_ENV === 'development') {
  console.log('📁 Excel routes registered:');
  router.stack.forEach(r => {
    if (r.route && r.route.path) {
      console.log(`   - ${Object.keys(r.route.methods)} ${r.route.path}`);
    }
  });
}

module.exports = router;