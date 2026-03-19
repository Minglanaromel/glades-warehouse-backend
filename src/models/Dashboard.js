const mongoose = require('mongoose');

const dashboardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  widgets: [{
    id: String,
    type: String,
    title: String,
    position: {
      x: Number,
      y: Number,
      w: Number,
      h: Number,
    },
    settings: mongoose.Schema.Types.Mixed,
    data: mongoose.Schema.Types.Mixed,
  }],
  layout: {
    type: String,
    enum: ['grid', 'list'],
    default: 'grid',
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Dashboard', dashboardSchema);