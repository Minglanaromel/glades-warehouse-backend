const Dashboard = require('../models/Dashboard');
const StockItem = require('../models/StockItem');
const PurchaseOrder = require('../models/PurchaseOrder');
const SalesOrder = require('../models/SalesOrder');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');

// @desc    Get user dashboard
// @route   GET /api/dashboard
// @access  Private
const getDashboard = async (req, res) => {
  try {
    let dashboard = await Dashboard.findOne({ user: req.user._id });
    
    if (!dashboard) {
      // Create default dashboard
      dashboard = await Dashboard.create({
        user: req.user._id,
        widgets: getDefaultWidgets(req.user.role),
        layout: 'grid',
        isDefault: true
      });
    }

    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update dashboard layout
// @route   PUT /api/dashboard/layout
// @access  Private
const updateLayout = async (req, res) => {
  try {
    const { widgets, layout } = req.body;
    
    let dashboard = await Dashboard.findOne({ user: req.user._id });
    
    if (dashboard) {
      dashboard.widgets = widgets || dashboard.widgets;
      dashboard.layout = layout || dashboard.layout;
      await dashboard.save();
      res.json(dashboard);
    } else {
      res.status(404).json({ message: 'Dashboard not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalCustomers,
      totalSuppliers,
      totalStockItems,
      lowStockItems,
      pendingPOs,
      pendingSOs,
      recentPOs,
      recentSOs
    ] = await Promise.all([
      Customer.countDocuments({ status: 'active' }),
      Supplier.countDocuments({ status: 'active' }),
      StockItem.countDocuments({ status: 'active' }),
      StockItem.countDocuments({
        $expr: { $lte: [ "$quantity", "$reorderLevel" ] }
      }),
      PurchaseOrder.countDocuments({ status: 'pending' }),
      SalesOrder.countDocuments({ status: 'pending' }),
      PurchaseOrder.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('supplier', 'name'),
      SalesOrder.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('customer', 'name')
    ]);

    // Get monthly sales data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlySales = await SalesOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          status: { $in: ['delivered', 'shipped'] }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      counts: {
        customers: totalCustomers,
        suppliers: totalSuppliers,
        stockItems: totalStockItems,
        lowStock: lowStockItems,
        pendingPOs,
        pendingSOs
      },
      recentActivity: {
        purchaseOrders: recentPOs,
        salesOrders: recentSOs
      },
      monthlySales,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to get default widgets based on role
const getDefaultWidgets = (role) => {
  const commonWidgets = [
    {
      id: 'stats',
      type: 'stats',
      title: 'Quick Stats',
      position: { x: 0, y: 0, w: 6, h: 2 }
    },
    {
      id: 'recent-purchases',
      type: 'recent-purchases',
      title: 'Recent Purchase Orders',
      position: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      id: 'recent-sales',
      type: 'recent-sales',
      title: 'Recent Sales Orders',
      position: { x: 6, y: 2, w: 6, h: 4 }
    }
  ];

  if (role === 'admin') {
    commonWidgets.push({
      id: 'monthly-sales',
      type: 'chart',
      title: 'Monthly Sales',
      position: { x: 6, y: 0, w: 6, h: 2 }
    });
  }

  if (role === 'manager') {
    commonWidgets.push({
      id: 'low-stock',
      type: 'low-stock',
      title: 'Low Stock Alert',
      position: { x: 6, y: 0, w: 6, h: 2 }
    });
  }

  return commonWidgets;
};

module.exports = {
  getDashboard,
  updateLayout,
  getDashboardStats,
};