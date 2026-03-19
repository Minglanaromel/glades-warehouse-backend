const express = require('express');
const router = express.Router();
const {
  getDashboard,
  updateLayout,
  getDashboardStats,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getDashboard);
router.get('/stats', protect, getDashboardStats);
router.put('/layout', protect, updateLayout);

module.exports = router;