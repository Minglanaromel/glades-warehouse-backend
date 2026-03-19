const Supplier = require('../models/Supplier');
const { parseExcelToJSON } = require('../utils/excelParser');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
const getSuppliers = async (req, res) => {
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

    const count = await Supplier.countDocuments({ ...keyword });
    const suppliers = await Supplier.find({ ...keyword })
      .populate('createdBy', 'name email')
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ createdAt: -1 });

    res.json({
      suppliers,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get supplier by ID
// @route   GET /api/suppliers/:id
// @access  Private
const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (supplier) {
      res.json(supplier);
    } else {
      res.status(404).json({ message: 'Supplier not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a supplier
// @route   POST /api/suppliers
// @access  Private/Admin/Manager
const createSupplier = async (req, res) => {
  try {
    // Generate supplier code if not provided
    if (!req.body.code) {
      const count = await Supplier.countDocuments();
      req.body.code = `SUPP${String(count + 1).padStart(5, '0')}`;
    }

    const supplier = await Supplier.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private/Admin/Manager
const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (supplier) {
      Object.assign(supplier, req.body);
      const updatedSupplier = await supplier.save();
      res.json(updatedSupplier);
    } else {
      res.status(404).json({ message: 'Supplier not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private/Admin
const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (supplier) {
      await supplier.deleteOne();
      res.json({ message: 'Supplier removed' });
    } else {
      res.status(404).json({ message: 'Supplier not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Import suppliers from Excel
// @route   POST /api/suppliers/import
// @access  Private/Admin
const importSuppliers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const jsonData = await parseExcelToJSON(req.file.path);
    
    const suppliers = [];
    const errors = [];

    for (let i = 0; i < jsonData.length; i++) {
      try {
        const supplierData = {
          code: jsonData[i].column1 || `SUPP${String(Date.now() + i).slice(-5)}`,
          name: jsonData[i].column2,
          email: jsonData[i].column3,
          phone: jsonData[i].column4,
          createdBy: req.user._id,
        };
        
        const supplier = await Supplier.create(supplierData);
        suppliers.push(supplier);
      } catch (error) {
        errors.push({ row: i + 2, error: error.message });
      }
    }

    res.json({
      success: true,
      imported: suppliers.length,
      errors: errors,
      message: `Successfully imported ${suppliers.length} suppliers`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  importSuppliers,
};