const mongoose = require('mongoose');

const cctvSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  location: String,
  ipAddress: String,
  streamUrl: String,
  status: {
    type: String,
    enum: ['online', 'offline', 'maintenance'],
    default: 'online',
  },
  cameraType: String,
  resolution: String,
  recordings: [{
    filename: String,
    path: String,
    startTime: Date,
    endTime: Date,
    size: Number,
  }],
  settings: {
    motionDetection: Boolean,
    recordingSchedule: String,
    retentionDays: Number,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('CCTV', cctvSchema);