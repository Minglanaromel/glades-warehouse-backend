const express = require('express');
const router = express.Router();
const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  importSuppliers,
} = require('../controllers/supplierController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .get(protect, getSuppliers)
  .post(protect, authorize('admin', 'manager'), createSupplier);

router.route('/import')
  .post(protect, authorize('admin'), upload.single('file'), importSuppliers);

router.route('/:id')
  .get(protect, getSupplierById)
  .put(protect, authorize('admin', 'manager'), updateSupplier)
  .delete(protect, authorize('admin'), deleteSupplier);

module.exports = router;