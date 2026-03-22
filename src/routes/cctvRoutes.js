// src/routes/cctvRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getCameras,
  getCameraById,
  createCamera,
  updateCamera,
  deleteCamera,
  getCameraStream,
  toggleCamera,
  getCameraStatus
} = require('../controllers/cctvController');

// All routes require authentication
router.use(protect);

// CCTV endpoints
router.get('/', getCameras);
router.get('/status', getCameraStatus);
router.get('/:id', getCameraById);
router.get('/:id/stream', getCameraStream);
router.post('/', authorize('admin', 'security'), createCamera);
router.put('/:id', authorize('admin', 'security'), updateCamera);
router.patch('/:id/toggle', authorize('admin', 'security'), toggleCamera);
router.delete('/:id', authorize('admin'), deleteCamera);

module.exports = router;