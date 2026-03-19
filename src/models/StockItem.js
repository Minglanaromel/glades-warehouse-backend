const mongoose = require('mongoose');

const stockItemSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: [true, 'Please add item name'],
  },
  description: String,
  category: String,
  unit: String,
  quantity: {
    type: Number,
    default: 0,
  },
  reorderLevel: {
    type: Number,
    default: 0,
  },
  unitPrice: Number,
  location: String,
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('StockItem', stockItemSchema);