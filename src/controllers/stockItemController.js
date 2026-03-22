// src/controllers/stockItemController.js
const fs = require('fs');
const path = require('path');

const STORAGE_PATH = path.join(__dirname, '../data/stock/items.json');
const MOVEMENTS_PATH = path.join(__dirname, '../data/stock/movements.json');

// Helper functions
const loadItems = () => {
  try {
    if (fs.existsSync(STORAGE_PATH)) {
      const data = fs.readFileSync(STORAGE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading items:', error);
  }
  return [];
};

const saveItems = (items) => {
  try {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(items, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving items:', error);
    return false;
  }
};

const loadMovements = () => {
  try {
    if (fs.existsSync(MOVEMENTS_PATH)) {
      const data = fs.readFileSync(MOVEMENTS_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading movements:', error);
  }
  return [];
};

const saveMovements = (movements) => {
  try {
    fs.writeFileSync(MOVEMENTS_PATH, JSON.stringify(movements, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving movements:', error);
    return false;
  }
};

const addMovement = (itemId, type, quantity, reason, userId, notes = '') => {
  const movements = loadMovements();
  movements.unshift({
    id: Date.now().toString(),
    itemId,
    type, // 'in' or 'out'
    quantity,
    reason,
    userId,
    notes,
    timestamp: new Date().toISOString()
  });
  saveMovements(movements.slice(0, 500)); // Keep last 500 movements
};

// @desc    Get all stock items
// @route   GET /api/stock-items
// @access  Private
const getStockItems = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 10 } = req.query;
    
    let items = loadItems();
    
    // Apply search filter
    if (search) {
      const searchTerm = search.toLowerCase();
      items = items.filter(item => 
        (item.name && item.name.toLowerCase().includes(searchTerm)) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm)) ||
        (item.category && item.category.toLowerCase().includes(searchTerm))
      );
    }
    
    // Apply category filter
    if (category && category !== 'all') {
      items = items.filter(item => item.category === category);
    }
    
    const total = items.length;
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedItems = items.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getStockItems:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stock items'
    });
  }
};

// @desc    Get single stock item
// @route   GET /api/stock-items/:id
// @access  Private
const getStockItemById = async (req, res) => {
  try {
    const items = loadItems();
    const item = items.find(i => i.id === req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Stock item not found'
      });
    }
    
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error in getStockItemById:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stock item'
    });
  }
};

// @desc    Create stock item
// @route   POST /api/stock-items
// @access  Private/Admin
const createStockItem = async (req, res) => {
  try {
    const items = loadItems();
    
    // Generate SKU if not provided
    let sku = req.body.sku;
    if (!sku) {
      const prefix = req.body.category ? req.body.category.substring(0, 3).toUpperCase() : 'ITM';
      const count = items.length + 1;
      sku = `${prefix}${String(count).padStart(6, '0')}`;
    }
    
    // Check for duplicate SKU
    if (items.some(item => item.sku === sku)) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }
    
    const newItem = {
      id: String(Date.now()),
      sku,
      name: req.body.name,
      description: req.body.description || '',
      category: req.body.category || 'Other',
      unit: req.body.unit || 'pcs',
      price: parseFloat(req.body.price) || 0,
      cost: parseFloat(req.body.cost) || 0,
      currentStock: parseInt(req.body.currentStock) || 0,
      minStock: parseInt(req.body.minStock) || 0,
      maxStock: parseInt(req.body.maxStock) || 0,
      location: req.body.location || '',
      supplier: req.body.supplier || '',
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      createdBy: req.user?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    items.push(newItem);
    saveItems(items);
    
    res.status(201).json({
      success: true,
      data: newItem,
      message: 'Stock item created successfully'
    });
  } catch (error) {
    console.error('Error in createStockItem:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create stock item'
    });
  }
};

// @desc    Update stock item
// @route   PUT /api/stock-items/:id
// @access  Private/Admin
const updateStockItem = async (req, res) => {
  try {
    const items = loadItems();
    const index = items.findIndex(i => i.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Stock item not found'
      });
    }
    
    items[index] = {
      ...items[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    saveItems(items);
    
    res.json({
      success: true,
      data: items[index],
      message: 'Stock item updated successfully'
    });
  } catch (error) {
    console.error('Error in updateStockItem:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update stock item'
    });
  }
};

// @desc    Update stock quantity
// @route   PATCH /api/stock-items/:id/quantity
// @access  Private/Manager
const updateStockQuantity = async (req, res) => {
  try {
    const { quantity, type, reason, notes } = req.body;
    
    if (!quantity || !type || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide quantity, type (in/out), and reason'
      });
    }
    
    const items = loadItems();
    const index = items.findIndex(i => i.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Stock item not found'
      });
    }
    
    const oldStock = items[index].currentStock;
    let newStock = oldStock;
    
    if (type === 'in') {
      newStock = oldStock + parseInt(quantity);
    } else if (type === 'out') {
      newStock = oldStock - parseInt(quantity);
      if (newStock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be "in" or "out"'
      });
    }
    
    items[index].currentStock = newStock;
    items[index].updatedAt = new Date().toISOString();
    saveItems(items);
    
    // Record movement
    addMovement(req.params.id, type, parseInt(quantity), reason, req.user?.id, notes);
    
    res.json({
      success: true,
      data: items[index],
      message: `Stock ${type === 'in' ? 'increased' : 'decreased'} successfully`
    });
  } catch (error) {
    console.error('Error in updateStockQuantity:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update stock quantity'
    });
  }
};

// @desc    Delete stock item
// @route   DELETE /api/stock-items/:id
// @access  Private/Admin
const deleteStockItem = async (req, res) => {
  try {
    const items = loadItems();
    const filteredItems = items.filter(i => i.id !== req.params.id);
    
    if (filteredItems.length === items.length) {
      return res.status(404).json({
        success: false,
        message: 'Stock item not found'
      });
    }
    
    saveItems(filteredItems);
    
    res.json({
      success: true,
      message: 'Stock item deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteStockItem:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete stock item'
    });
  }
};

// @desc    Bulk import stock items
// @route   POST /api/stock-items/bulk-import
// @access  Private/Admin
const bulkImportStock = async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format. Expected array of items.'
      });
    }
    
    const existingItems = loadItems();
    const newItems = [];
    const errors = [];
    
    for (let i = 0; i < items.length; i++) {
      try {
        const item = items[i];
        
        let sku = item.sku;
        if (!sku) {
          const prefix = item.category ? item.category.substring(0, 3).toUpperCase() : 'ITM';
          const count = existingItems.length + newItems.length + 1;
          sku = `${prefix}${String(count).padStart(6, '0')}`;
        }
        
        const newItem = {
          id: String(Date.now() + i),
          sku,
          name: item.name,
          description: item.description || '',
          category: item.category || 'Other',
          unit: item.unit || 'pcs',
          price: parseFloat(item.price) || 0,
          cost: parseFloat(item.cost) || 0,
          currentStock: parseInt(item.currentStock) || 0,
          minStock: parseInt(item.minStock) || 0,
          maxStock: parseInt(item.maxStock) || 0,
          location: item.location || '',
          supplier: item.supplier || '',
          isActive: item.isActive !== undefined ? item.isActive : true,
          createdBy: req.user?.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        newItems.push(newItem);
      } catch (error) {
        errors.push({ row: i + 1, error: error.message });
      }
    }
    
    const allItems = [...existingItems, ...newItems];
    saveItems(allItems);
    
    res.json({
      success: true,
      data: newItems,
      errors,
      imported: newItems.length,
      message: `Successfully imported ${newItems.length} items`
    });
  } catch (error) {
    console.error('Error in bulkImportStock:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to import stock items'
    });
  }
};

// @desc    Get low stock items
// @route   GET /api/stock-items/low-stock
// @access  Private
const getLowStockItems = async (req, res) => {
  try {
    const items = loadItems();
    const lowStock = items.filter(item => 
      item.isActive && item.currentStock <= item.minStock
    );
    
    res.json({
      success: true,
      data: lowStock,
      count: lowStock.length
    });
  } catch (error) {
    console.error('Error in getLowStockItems:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch low stock items'
    });
  }
};

// @desc    Get stock by category
// @route   GET /api/stock-items/category/:category
// @access  Private
const getStockByCategory = async (req, res) => {
  try {
    const items = loadItems();
    const categoryItems = items.filter(item => 
      item.category.toLowerCase() === req.params.category.toLowerCase()
    );
    
    res.json({
      success: true,
      data: categoryItems,
      count: categoryItems.length
    });
  } catch (error) {
    console.error('Error in getStockByCategory:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stock by category'
    });
  }
};

// @desc    Get stock summary
// @route   GET /api/stock-items/summary
// @access  Private
const getStockSummary = async (req, res) => {
  try {
    const items = loadItems();
    const categories = {};
    let totalValue = 0;
    let totalItems = 0;
    
    items.forEach(item => {
      if (item.isActive) {
        categories[item.category] = (categories[item.category] || 0) + 1;
        totalValue += (item.currentStock * item.cost);
        totalItems += item.currentStock;
      }
    });
    
    res.json({
      success: true,
      data: {
        totalItems,
        totalValue,
        itemCount: items.filter(i => i.isActive).length,
        categories,
        lowStockCount: items.filter(i => i.isActive && i.currentStock <= i.minStock).length
      }
    });
  } catch (error) {
    console.error('Error in getStockSummary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stock summary'
    });
  }
};

// @desc    Get stock movements
// @route   GET /api/stock-items/movements/:id
// @access  Private
const getStockMovements = async (req, res) => {
  try {
    const movements = loadMovements();
    const itemMovements = movements.filter(m => m.itemId === req.params.id);
    
    res.json({
      success: true,
      data: itemMovements
    });
  } catch (error) {
    console.error('Error in getStockMovements:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stock movements'
    });
  }
};

module.exports = {
  getStockItems,
  getStockItemById,
  createStockItem,
  updateStockItem,
  updateStockQuantity,
  deleteStockItem,
  bulkImportStock,
  getLowStockItems,
  getStockByCategory,
  getStockSummary,
  getStockMovements
};