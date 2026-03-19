const express = require('express');
const router = express.Router();
const {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePOStatus,
  deletePurchaseOrder,
} = require('../controllers/purchaseOrderController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getPurchaseOrders)
  .post(protect, authorize('admin', 'manager'), createPurchaseOrder);

router.put('/:id/status', protect, authorize('admin', 'manager'), updatePOStatus);

router.route('/:id')
  .get(protect, getPurchaseOrderById)
  .put(protect, authorize('admin', 'manager'), updatePurchaseOrder)
  .delete(protect, authorize('admin'), deletePurchaseOrder);

module.exports = router;