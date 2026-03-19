const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  importCustomers,
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .get(protect, getCustomers)
  .post(protect, authorize('admin', 'manager'), createCustomer);

router.route('/import')
  .post(protect, authorize('admin'), upload.single('file'), importCustomers);

router.route('/:id')
  .get(protect, getCustomerById)
  .put(protect, authorize('admin', 'manager'), updateCustomer)
  .delete(protect, authorize('admin'), deleteCustomer);

module.exports = router;