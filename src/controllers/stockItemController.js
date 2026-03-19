const StockItem = require('../models/StockItem');
const { parseExcelToJSON } = require('../utils/excelParser');

// @desc    Get all stock items
// @route   GET /api/stock-items
// @access  Private
const getStockItems = async (req, res) => {
  try {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;
    
    const keyword = req.query.keyword
      ? {
          $or: [
            { name: { $regex: req.query.keyword, $options: 'i' } },
            { sku: { $regex: req.query.keyword, $options: 'i' } },
            { category: { $regex: req.query.keyword, $options: 'i' } },
          ],
        }
      : {};

    const count = await StockItem.countDocuments({ ...keyword });
    const stockItems = await StockItem.find({ ...keyword })
      .populate('supplier', 'name code')
      .populate('createdBy', 'name email')
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ createdAt: -1 });

    res.json({
      stockItems,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get stock item by ID
// @route   GET /api/stock-items/:id
// @access  Private
const getStockItemById = async (req, res) => {
  try {
    const stockItem = await StockItem.findById(req.params.id)
      .populate('supplier', 'name code email phone')
      .populate('createdBy', 'name email');
    
    if (stockItem) {
      res.json(stockItem);
    } else {
      res.status(404).json({ message: 'Stock item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a stock item
// @route   POST /api/stock-items
// @access  Private/Admin/Manager
const createStockItem = async (req, res) => {
  try {
    // Generate SKU if not provided
    if (!req.body.sku) {
      const count = await StockItem.countDocuments();
      const category = req.body.category ? req.body.category.substring(0, 3).toUpperCase() : 'ITM';
      req.body.sku = `${category}${String(count + 1).padStart(6, '0')}`;
    }

    const stockItem = await StockItem.create({
      ...req.body,
      createdBy: req.user._id,
    });

    res.status(201).json(stockItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update stock item
// @route   PUT /api/stock-items/:id
// @access  Private/Admin/Manager
const updateStockItem = async (req, res) => {
  try {
    const stockItem = await StockItem.findById(req.params.id);
    
    if (stockItem) {
      Object.assign(stockItem, req.body);
      const updatedStockItem = await stockItem.save();
      res.json(updatedStockItem);
    } else {
      res.status(404).json({ message: 'Stock item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete stock item
// @route   DELETE /api/stock-items/:id
// @access  Private/Admin
const deleteStockItem = async (req, res) => {
  try {
    const stockItem = await StockItem.findById(req.params.id);
    
    if (stockItem) {
      await stockItem.deleteOne();
      res.json({ message: 'Stock item removed' });
    } else {
      res.status(404).json({ message: 'Stock item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update stock quantity
// @route   PUT /api/stock-items/:id/quantity
// @access  Private
const updateStockQuantity = async (req, res) => {
  try {
    const { quantity, operation } = req.body;
    const stockItem = await StockItem.findById(req.params.id);
    
    if (stockItem) {
      if (operation === 'add') {
        stockItem.quantity += quantity;
      } else if (operation === 'subtract') {
        if (stockItem.quantity < quantity) {
          return res.status(400).json({ message: 'Insufficient stock' });
        }
        stockItem.quantity -= quantity;
      } else {
        stockItem.quantity = quantity;
      }
      
      const updatedItem = await stockItem.save();
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: 'Stock item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get low stock items
// @route   GET /api/stock-items/low-stock
// @access  Private
const getLowStockItems = async (req, res) => {
  try {
    const items = await StockItem.find({
      $expr: { $lte: [ "$quantity", "$reorderLevel" ] }
    }).populate('supplier', 'name email phone');
    
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Import stock items from Excel
// @route   POST /api/stock-items/import
// @access  Private/Admin
const importStockItems = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const jsonData = await parseExcelToJSON(req.file.path);
    
    const stockItems = [];
    const errors = [];

    for (let i = 0; i < jsonData.length; i++) {
      try {
        const itemData = {
          sku: jsonData[i].column1 || `ITM${String(Date.now() + i).slice(-6)}`,
          name: jsonData[i].column2,
          description: jsonData[i].column3,
          category: jsonData[i].column4,
          unit: jsonData[i].column5,
          quantity: jsonData[i].column6 || 0,
          reorderLevel: jsonData[i].column7 || 0,
          unitPrice: jsonData[i].column8 || 0,
          location: jsonData[i].column9,
          createdBy: req.user._id,
        };
        
        const item = await StockItem.create(itemData);
        stockItems.push(item);
      } catch (error) {
        errors.push({ row: i + 2, error: error.message });
      }
    }

    res.json({
      success: true,
      imported: stockItems.length,
      errors: errors,
      message: `Successfully imported ${stockItems.length} stock items`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStockItems,
  getStockItemById,
  createStockItem,
  updateStockItem,
  deleteStockItem,
  updateStockQuantity,
  getLowStockItems,
  importStockItems,
};