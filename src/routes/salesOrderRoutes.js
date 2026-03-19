const express = require('express');
const router = express.Router();
const {
  getSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrder,
  updateSOStatus,
  updatePaymentStatus,
  deleteSalesOrder,
} = require('../controllers/salesOrderController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSalesOrders)
  .post(protect, createSalesOrder);

router.put('/:id/status', protect, authorize('admin', 'manager'), updateSOStatus);
router.put('/:id/payment', protect, authorize('admin', 'manager'), updatePaymentStatus);

router.route('/:id')
  .get(protect, getSalesOrderById)
  .put(protect, authorize('admin', 'manager'), updateSalesOrder)
  .delete(protect, authorize('admin'), deleteSalesOrder);

module.exports = router;