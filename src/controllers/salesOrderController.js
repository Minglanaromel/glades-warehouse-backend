const SalesOrder = require('../models/SalesOrder');
const StockItem = require('../models/StockItem');

// @desc    Get all sales orders
// @route   GET /api/sales-orders
// @access  Private
const getSalesOrders = async (req, res) => {
  try {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;
    
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.customer) filter.customer = req.query.customer;

    const count = await SalesOrder.countDocuments(filter);
    const salesOrders = await SalesOrder.find(filter)
      .populate('customer', 'name code')
      .populate('createdBy', 'name email')
      .populate('items.item', 'name sku')
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ createdAt: -1 });

    res.json({
      salesOrders,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get sales order by ID
// @route   GET /api/sales-orders/:id
// @access  Private
const getSalesOrderById = async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id)
      .populate('customer')
      .populate('createdBy', 'name email')
      .populate('items.item');
    
    if (salesOrder) {
      res.json(salesOrder);
    } else {
      res.status(404).json({ message: 'Sales order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a sales order
// @route   POST /api/sales-orders
// @access  Private
const createSalesOrder = async (req, res) => {
  try {
    // Generate SO number
    const count = await SalesOrder.countDocuments();
    const soNumber = `SO${new Date().getFullYear()}${String(count + 1).padStart(6, '0')}`;

    // Calculate totals
    let subtotal = 0;
    const items = req.body.items.map(item => {
      const total = item.quantity * item.unitPrice;
      subtotal += total;
      return { ...item, total };
    });

    const tax = req.body.tax || 0;
    const total = subtotal + tax;

    // Check stock availability
    for (const item of items) {
      const stockItem = await StockItem.findById(item.item);
      if (stockItem.quantity < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${stockItem.name}. Available: ${stockItem.quantity}` 
        });
      }
    }

    const salesOrder = await SalesOrder.create({
      soNumber,
      ...req.body,
      items,
      subtotal,
      tax,
      total,
      createdBy: req.user._id,
    });

    res.status(201).json(salesOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update sales order
// @route   PUT /api/sales-orders/:id
// @access  Private/Admin/Manager
const updateSalesOrder = async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id);
    
    if (salesOrder) {
      if (['shipped', 'delivered', 'cancelled'].includes(salesOrder.status)) {
        return res.status(400).json({ message: `Cannot update ${salesOrder.status} order` });
      }

      if (req.body.items) {
        let subtotal = 0;
        req.body.items = req.body.items.map(item => {
          const total = item.quantity * item.unitPrice;
          subtotal += total;
          return { ...item, total };
        });
        req.body.subtotal = subtotal;
        req.body.total = subtotal + (req.body.tax || salesOrder.tax);
      }

      Object.assign(salesOrder, req.body);
      const updatedSO = await salesOrder.save();
      res.json(updatedSO);
    } else {
      res.status(404).json({ message: 'Sales order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update sales order status
// @route   PUT /api/sales-orders/:id/status
// @access  Private/Admin/Manager
const updateSOStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const salesOrder = await SalesOrder.findById(req.params.id);
    
    if (salesOrder) {
      // If confirming order, check and reserve stock
      if (status === 'confirmed' && salesOrder.status === 'draft') {
        for (const item of salesOrder.items) {
          const stockItem = await StockItem.findById(item.item);
          if (stockItem.quantity < item.quantity) {
            return res.status(400).json({ 
              message: `Insufficient stock for item ${stockItem.name}` 
            });
          }
        }
      }
      
      // If shipping, deduct from stock
      if (status === 'shipped') {
        for (const item of salesOrder.items) {
          await StockItem.findByIdAndUpdate(item.item, {
            $inc: { quantity: -item.quantity }
          });
        }
      }
      
      salesOrder.status = status;
      const updatedSO = await salesOrder.save();
      res.json(updatedSO);
    } else {
      res.status(404).json({ message: 'Sales order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update payment status
// @route   PUT /api/sales-orders/:id/payment
// @access  Private/Admin/Manager
const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const salesOrder = await SalesOrder.findById(req.params.id);
    
    if (salesOrder) {
      salesOrder.paymentStatus = paymentStatus;
      const updatedSO = await salesOrder.save();
      res.json(updatedSO);
    } else {
      res.status(404).json({ message: 'Sales order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete sales order
// @route   DELETE /api/sales-orders/:id
// @access  Private/Admin
const deleteSalesOrder = async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id);
    
    if (salesOrder) {
      if (salesOrder.status !== 'draft') {
        return res.status(400).json({ message: 'Cannot delete non-draft orders' });
      }
      await salesOrder.deleteOne();
      res.json({ message: 'Sales order removed' });
    } else {
      res.status(404).json({ message: 'Sales order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrder,
  updateSOStatus,
  updatePaymentStatus,
  deleteSalesOrder,
};