const PurchaseOrder = require('../models/PurchaseOrder');
const StockItem = require('../models/StockItem');

// @desc    Get all purchase orders
// @route   GET /api/purchase-orders
// @access  Private
const getPurchaseOrders = async (req, res) => {
  try {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;
    
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.supplier) filter.supplier = req.query.supplier;

    const count = await PurchaseOrder.countDocuments(filter);
    const purchaseOrders = await PurchaseOrder.find(filter)
      .populate('supplier', 'name code')
      .populate('createdBy', 'name email')
      .populate('items.item', 'name sku')
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ createdAt: -1 });

    res.json({
      purchaseOrders,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get purchase order by ID
// @route   GET /api/purchase-orders/:id
// @access  Private
const getPurchaseOrderById = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id)
      .populate('supplier')
      .populate('createdBy', 'name email')
      .populate('items.item');
    
    if (purchaseOrder) {
      res.json(purchaseOrder);
    } else {
      res.status(404).json({ message: 'Purchase order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a purchase order
// @route   POST /api/purchase-orders
// @access  Private/Admin/Manager
const createPurchaseOrder = async (req, res) => {
  try {
    // Generate PO number
    const count = await PurchaseOrder.countDocuments();
    const poNumber = `PO${new Date().getFullYear()}${String(count + 1).padStart(6, '0')}`;

    // Calculate totals
    let subtotal = 0;
    const items = req.body.items.map(item => {
      const total = item.quantity * item.unitPrice;
      subtotal += total;
      return { ...item, total };
    });

    const tax = req.body.tax || 0;
    const total = subtotal + tax;

    const purchaseOrder = await PurchaseOrder.create({
      poNumber,
      ...req.body,
      items,
      subtotal,
      tax,
      total,
      createdBy: req.user._id,
    });

    res.status(201).json(purchaseOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update purchase order
// @route   PUT /api/purchase-orders/:id
// @access  Private/Admin/Manager
const updatePurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);
    
    if (purchaseOrder) {
      // Don't allow updates if already received or cancelled
      if (['received', 'cancelled'].includes(purchaseOrder.status)) {
        return res.status(400).json({ message: `Cannot update ${purchaseOrder.status} order` });
      }

      // Recalculate totals if items changed
      if (req.body.items) {
        let subtotal = 0;
        req.body.items = req.body.items.map(item => {
          const total = item.quantity * item.unitPrice;
          subtotal += total;
          return { ...item, total };
        });
        req.body.subtotal = subtotal;
        req.body.total = subtotal + (req.body.tax || purchaseOrder.tax);
      }

      Object.assign(purchaseOrder, req.body);
      const updatedPO = await purchaseOrder.save();
      res.json(updatedPO);
    } else {
      res.status(404).json({ message: 'Purchase order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update purchase order status
// @route   PUT /api/purchase-orders/:id/status
// @access  Private/Admin/Manager
const updatePOStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);
    
    if (purchaseOrder) {
      purchaseOrder.status = status;
      
      // If received, update stock quantities
      if (status === 'received') {
        for (const item of purchaseOrder.items) {
          await StockItem.findByIdAndUpdate(item.item, {
            $inc: { quantity: item.quantity }
          });
        }
      }
      
      const updatedPO = await purchaseOrder.save();
      res.json(updatedPO);
    } else {
      res.status(404).json({ message: 'Purchase order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete purchase order
// @route   DELETE /api/purchase-orders/:id
// @access  Private/Admin
const deletePurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);
    
    if (purchaseOrder) {
      if (purchaseOrder.status !== 'draft') {
        return res.status(400).json({ message: 'Cannot delete non-draft orders' });
      }
      await purchaseOrder.deleteOne();
      res.json({ message: 'Purchase order removed' });
    } else {
      res.status(404).json({ message: 'Purchase order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePOStatus,
  deletePurchaseOrder,
};