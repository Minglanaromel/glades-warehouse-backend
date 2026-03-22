const fs = require('fs');
const path = require('path');

const CCTV_FILE = path.join(__dirname, '../data/cctv.json');

class CCTV {
  static findAll() {
    if (!fs.existsSync(CCTV_FILE)) {
      return [];
    }
    const data = fs.readFileSync(CCTV_FILE, 'utf8');
    return JSON.parse(data);
  }

  static save(cameras) {
    fs.writeFileSync(CCTV_FILE, JSON.stringify(cameras, null, 2));
  }

  static create(cameraData) {
    const cameras = this.findAll();
    const newCamera = {
      id: Date.now().toString(),
      name: cameraData.name,
      url: cameraData.url,
      location: cameraData.location,
      status: cameraData.status || 'active',
      streamUrl: cameraData.streamUrl || cameraData.url,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    cameras.push(newCamera);
    this.save(cameras);
    return newCamera;
  }

  static findById(id) {
    const cameras = this.findAll();
    return cameras.find(c => c.id === id);
  }

  static update(id, updateData) {
    const cameras = this.findAll();
    const index = cameras.findIndex(c => c.id === id);
    
    if (index === -1) {
      throw new Error('Camera not found');
    }
    
    cameras[index] = { 
      ...cameras[index], 
      ...updateData, 
      updatedAt: new Date().toISOString() 
    };
    this.save(cameras);
    return cameras[index];
  }

  static delete(id) {
    const cameras = this.findAll();
    const filteredCameras = cameras.filter(c => c.id !== id);
    this.save(filteredCameras);
    return true;
  }

  static findByLocation(location) {
    const cameras = this.findAll();
    return cameras.filter(c => c.location === location);
  }

  static getActive() {
    const cameras = this.findAll();
    return cameras.filter(c => c.isActive);
  }
}

module.exports = CCTV;