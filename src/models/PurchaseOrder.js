const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    required: true,
    unique: true,
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  expectedDate: Date,
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
    enum: ['draft', 'pending', 'approved', 'shipped', 'received', 'cancelled'],
    default: 'draft',
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

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);