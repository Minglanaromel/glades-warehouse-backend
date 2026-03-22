// src/routes/stockItemRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { 
  getStockItems, 
  getStockItemById, 
  createStockItem, 
  updateStockItem, 
  deleteStockItem,
  getLowStockItems,
  getStockByCategory,
  updateStockQuantity,
  bulkImportStock,
  getStockSummary,
  getStockMovements
} = require('../controllers/stockItemController');

// All routes require authentication
router.use(protect);

// Public stock endpoints (for all authenticated users)
router.get('/', getStockItems);
router.get('/low-stock', getLowStockItems);
router.get('/summary', getStockSummary);
router.get('/category/:category', getStockByCategory);
router.get('/movements/:id', getStockMovements);
router.get('/:id', getStockItemById);

// Admin/Manager only endpoints
router.post('/', authorize('admin', 'manager'), createStockItem);
router.put('/:id', authorize('admin', 'manager'), updateStockItem);
router.patch('/:id/quantity', authorize('admin', 'manager', 'supervisor'), updateStockQuantity);
router.delete('/:id', authorize('admin'), deleteStockItem);
router.post('/bulk-import', authorize('admin', 'manager'), bulkImportStock);

module.exports = router;