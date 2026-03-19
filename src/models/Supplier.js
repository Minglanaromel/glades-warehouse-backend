const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: [true, 'Please add supplier name'],
  },
  email: String,
  phone: String,
  gstNo: String,
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: String,
  },
  contactPerson: {
    name: String,
    phone: String,
    email: String,
  },
  paymentTerms: String,
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Supplier', supplierSchema);