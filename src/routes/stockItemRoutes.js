const express = require('express');
const router = express.Router();
const {
  getStockItems,
  getStockItemById,
  createStockItem,
  updateStockItem,
  deleteStockItem,
  updateStockQuantity,
  getLowStockItems,
  importStockItems,
} = require('../controllers/stockItemController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .get(protect, getStockItems)
  .post(protect, authorize('admin', 'manager'), createStockItem);

router.get('/low-stock', protect, getLowStockItems);

router.route('/import')
  .post(protect, authorize('admin'), upload.single('file'), importStockItems);

router.put('/:id/quantity', protect, updateStockQuantity);

router.route('/:id')
  .get(protect, getStockItemById)
  .put(protect, authorize('admin', 'manager'), updateStockItem)
  .delete(protect, authorize('admin'), deleteStockItem);

module.exports = router;