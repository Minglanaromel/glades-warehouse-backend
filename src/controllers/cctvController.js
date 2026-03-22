// src/controllers/cctvController.js
const CCTV = require('../models/CCTV');

const getCameras = async (req, res) => {
  try {
    const cameras = CCTV.findAll();
    res.json({ success: true, data: cameras });
  } catch (error) {
    console.error('Error fetching cameras:', error);
    res.status(500).json({ success: false, message: 'Error fetching cameras' });
  }
};

const getCameraById = async (req, res) => {
  try {
    const camera = CCTV.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ success: false, message: 'Camera not found' });
    }
    res.json({ success: true, data: camera });
  } catch (error) {
    console.error('Error fetching camera:', error);
    res.status(500).json({ success: false, message: 'Error fetching camera' });
  }
};

const createCamera = async (req, res) => {
  try {
    const { name, url, location, status, streamUrl } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide name and URL' 
      });
    }
    
    const camera = CCTV.create({
      name,
      url,
      location: location || '',
      status: status || 'active',
      streamUrl: streamUrl || url
    });
    
    res.status(201).json({ success: true, data: camera });
  } catch (error) {
    console.error('Error creating camera:', error);
    res.status(500).json({ success: false, message: 'Error creating camera' });
  }
};

const updateCamera = async (req, res) => {
  try {
    const camera = CCTV.update(req.params.id, req.body);
    res.json({ success: true, data: camera });
  } catch (error) {
    console.error('Error updating camera:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCamera = async (req, res) => {
  try {
    CCTV.delete(req.params.id);
    res.json({ success: true, message: 'Camera deleted successfully' });
  } catch (error) {
    console.error('Error deleting camera:', error);
    res.status(500).json({ success: false, message: 'Error deleting camera' });
  }
};

const getCameraStream = async (req, res) => {
  try {
    const camera = CCTV.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ success: false, message: 'Camera not found' });
    }
    res.json({ success: true, data: { streamUrl: camera.streamUrl || camera.url } });
  } catch (error) {
    console.error('Error getting stream:', error);
    res.status(500).json({ success: false, message: 'Error getting stream' });
  }
};

const toggleCamera = async (req, res) => {
  try {
    const camera = CCTV.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ success: false, message: 'Camera not found' });
    }
    
    const updated = CCTV.update(req.params.id, { 
      isActive: !camera.isActive,
      status: !camera.isActive ? 'active' : 'inactive'
    });
    
    res.json({ 
      success: true, 
      data: updated,
      message: `Camera ${updated.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling camera:', error);
    res.status(500).json({ success: false, message: 'Error toggling camera' });
  }
};

const getCameraStatus = async (req, res) => {
  try {
    const cameras = CCTV.findAll();
    const stats = {
      total: cameras.length,
      active: cameras.filter(c => c.isActive).length,
      inactive: cameras.filter(c => !c.isActive).length,
      byLocation: {}
    };
    
    cameras.forEach(camera => {
      const location = camera.location || 'Unknown';
      stats.byLocation[location] = (stats.byLocation[location] || 0) + 1;
    });
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting camera status:', error);
    res.status(500).json({ success: false, message: 'Error getting camera status' });
  }
};

module.exports = {
  getCameras,
  getCameraById,
  createCamera,
  updateCamera,
  deleteCamera,
  getCameraStream,
  toggleCamera,
  getCameraStatus
};