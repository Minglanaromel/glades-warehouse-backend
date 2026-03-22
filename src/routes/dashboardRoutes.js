// src/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getDashboardStats, 
  getCapacityData, 
  getMachineStatus, 
  getDowntime,
  getAttendance, 
  getHourlyProduction, 
  getTroubleReports,
  getOTIF,
  getProductionSummary,
  getRealTimeMetrics
} = require('../controllers/dashboardController');

// All dashboard routes require authentication
router.use(protect);

// Main dashboard endpoints
router.get('/stats', getDashboardStats);
router.get('/summary', getProductionSummary);
router.get('/realtime', getRealTimeMetrics);

// Data endpoints
router.get('/capacity', getCapacityData);
router.get('/machines', getMachineStatus);
router.get('/downtime', getDowntime);
router.get('/attendance', getAttendance);
router.get('/hourly', getHourlyProduction);
router.get('/trouble-reports', getTroubleReports);
router.get('/otif', getOTIF);

// Export endpoints for reports
router.get('/export/machines', authorize('admin', 'manager'), async (req, res) => {
  try {
    const data = await getMachineStatusData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/export/downtime', authorize('admin', 'manager'), async (req, res) => {
  try {
    const data = await getDowntimeData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;