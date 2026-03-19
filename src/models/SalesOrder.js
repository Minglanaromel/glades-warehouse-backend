const mongoose = require('mongoose');

const salesOrderSchema = new mongoose.Schema({
  soNumber: {
    type: String,
    required: true,
    unique: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  deliveryDate: Date,
  items: [{
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StockItem',
    },
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number,
  }],
  subtotal: Number,
  tax: Number,
  total: Number,
  status: {
    type: String,
    enum: ['draft', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'draft',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending',
  },
  paymentTerms: String,
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('SalesOrder', salesOrderSchema);