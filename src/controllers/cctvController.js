const CCTV = require('../models/CCTV');

// @desc    Get all cameras
// @route   GET /api/cctv
// @access  Private
const getCameras = async (req, res) => {
  try {
    const cameras = await CCTV.find({})
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(cameras);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get camera by ID
// @route   GET /api/cctv/:id
// @access  Private
const getCameraById = async (req, res) => {
  try {
    const camera = await CCTV.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (camera) {
      res.json(camera);
    } else {
      res.status(404).json({ message: 'Camera not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a camera
// @route   POST /api/cctv
// @access  Private/Admin
const createCamera = async (req, res) => {
  try {
    const camera = await CCTV.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json(camera);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update camera
// @route   PUT /api/cctv/:id
// @access  Private/Admin
const updateCamera = async (req, res) => {
  try {
    const camera = await CCTV.findById(req.params.id);
    
    if (camera) {
      Object.assign(camera, req.body);
      const updatedCamera = await camera.save();
      res.json(updatedCamera);
    } else {
      res.status(404).json({ message: 'Camera not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete camera
// @route   DELETE /api/cctv/:id
// @access  Private/Admin
const deleteCamera = async (req, res) => {
  try {
    const camera = await CCTV.findById(req.params.id);
    
    if (camera) {
      await camera.deleteOne();
      res.json({ message: 'Camera removed' });
    } else {
      res.status(404).json({ message: 'Camera not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add recording
// @route   POST /api/cctv/:id/recordings
// @access  Private/Admin
const addRecording = async (req, res) => {
  try {
    const camera = await CCTV.findById(req.params.id);
    
    if (camera) {
      camera.recordings.push(req.body);
      await camera.save();
      res.json(camera);
    } else {
      res.status(404).json({ message: 'Camera not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update camera status
// @route   PUT /api/cctv/:id/status
// @access  Private/Admin
const updateCameraStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const camera = await CCTV.findById(req.params.id);
    
    if (camera) {
      camera.status = status;
      await camera.save();
      res.json(camera);
    } else {
      res.status(404).json({ message: 'Camera not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCameras,
  getCameraById,
  createCamera,
  updateCamera,
  deleteCamera,
  addRecording,
  updateCameraStatus,
};