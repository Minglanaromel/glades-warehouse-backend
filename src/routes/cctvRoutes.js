const express = require('express');
const router = express.Router();
const {
  getCameras,
  getCameraById,
  createCamera,
  updateCamera,
  deleteCamera,
  addRecording,
  updateCameraStatus,
} = require('../controllers/cctvController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getCameras)
  .post(protect, authorize('admin'), createCamera);

router.put('/:id/status', protect, authorize('admin'), updateCameraStatus);

router.route('/:id')
  .get(protect, getCameraById)
  .put(protect, authorize('admin'), updateCamera)
  .delete(protect, authorize('admin'), deleteCamera);

router.post('/:id/recordings', protect, authorize('admin'), addRecording);

module.exports = router;