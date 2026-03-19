const express = require('express');
const router = express.Router();
const {
  getStockReport,
  getPurchaseReport,
  getSalesReport,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/stock', protect, authorize('admin', 'manager'), getStockReport);
router.get('/purchases', protect, authorize('admin', 'manager'), getPurchaseReport);
router.get('/sales', protect, authorize('admin', 'manager'), getSalesReport);

module.exports = router;