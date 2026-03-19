const Customer = require('../models/Customer');
const { parseExcelToJSON } = require('../utils/excelParser');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res) => {
  try {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;
    
    const keyword = req.query.keyword
      ? {
          $or: [
            { name: { $regex: req.query.keyword, $options: 'i' } },
            { code: { $regex: req.query.keyword, $options: 'i' } },
            { email: { $regex: req.query.keyword, $options: 'i' } },
          ],
        }
      : {};

    const count = await Customer.countDocuments({ ...keyword });
    const customers = await Customer.find({ ...keyword })
      .populate('createdBy', 'name email')
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ createdAt: -1 });

    res.json({
      customers,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get customer by ID
// @route   GET /api/customers/:id
// @access  Private
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (customer) {
      res.json(customer);
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a customer
// @route   POST /api/customers
// @access  Private/Admin/Manager
const createCustomer = async (req, res) => {
  try {
    // Generate customer code if not provided
    if (!req.body.code) {
      const count = await Customer.countDocuments();
      req.body.code = `CUST${String(count + 1).padStart(5, '0')}`;
    }

    const customer = await Customer.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private/Admin/Manager
const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (customer) {
      Object.assign(customer, req.body);
      const updatedCustomer = await customer.save();
      res.json(updatedCustomer);
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private/Admin
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (customer) {
      await customer.deleteOne();
      res.json({ message: 'Customer removed' });
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Import customers from Excel
// @route   POST /api/customers/import
// @access  Private/Admin
const importCustomers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const jsonData = await parseExcelToJSON(req.file.path);
    
    // Process and validate data
    const customers = [];
    const errors = [];

    for (let i = 0; i < jsonData.length; i++) {
      try {
        const customerData = {
          code: jsonData[i].column1 || `CUST${String(Date.now() + i).slice(-5)}`,
          name: jsonData[i].column2,
          email: jsonData[i].column3,
          phone: jsonData[i].column4,
          createdBy: req.user._id,
        };
        
        const customer = await Customer.create(customerData);
        customers.push(customer);
      } catch (error) {
        errors.push({ row: i + 2, error: error.message });
      }
    }

    res.json({
      success: true,
      imported: customers.length,
      errors: errors,
      message: `Successfully imported ${customers.length} customers`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  importCustomers,
};