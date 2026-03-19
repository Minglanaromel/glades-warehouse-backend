const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const StockItem = require('../models/StockItem');
const PurchaseOrder = require('../models/PurchaseOrder');
const SalesOrder = require('../models/SalesOrder');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');

// @desc    Generate stock report
// @route   GET /api/reports/stock
// @access  Private
const getStockReport = async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const stockItems = await StockItem.find({})
      .populate('supplier', 'name code')
      .sort({ category: 1, name: 1 });

    const summary = {
      totalItems: stockItems.length,
      totalValue: stockItems.reduce((sum, item) => sum + (item.quantity * (item.unitPrice || 0)), 0),
      lowStock: stockItems.filter(item => item.quantity <= item.reorderLevel).length,
      outOfStock: stockItems.filter(item => item.quantity === 0).length,
      byCategory: {}
    };

    // Group by category
    stockItems.forEach(item => {
      const category = item.category || 'Uncategorized';
      if (!summary.byCategory[category]) {
        summary.byCategory[category] = {
          count: 0,
          value: 0
        };
      }
      summary.byCategory[category].count++;
      summary.byCategory[category].value += item.quantity * (item.unitPrice || 0);
    });

    if (format === 'excel') {
      return generateStockExcel(res, stockItems, summary);
    } else if (format === 'pdf') {
      return generateStockPDF(res, stockItems, summary);
    }

    res.json({
      summary,
      items: stockItems,
      generatedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate purchase report
// @route   GET /api/reports/purchases
// @access  Private
const getPurchaseReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const purchases = await PurchaseOrder.find(filter)
      .populate('supplier', 'name code')
      .populate('items.item', 'name sku')
      .sort({ createdAt: -1 });

    const summary = {
      totalOrders: purchases.length,
      totalValue: purchases.reduce((sum, po) => sum + po.total, 0),
      byStatus: {},
      bySupplier: {}
    };

    purchases.forEach(po => {
      // By status
      summary.byStatus[po.status] = (summary.byStatus[po.status] || 0) + 1;
      
      // By supplier
      const supplierName = po.supplier?.name || 'Unknown';
      if (!summary.bySupplier[supplierName]) {
        summary.bySupplier[supplierName] = {
          count: 0,
          value: 0
        };
      }
      summary.bySupplier[supplierName].count++;
      summary.bySupplier[supplierName].value += po.total;
    });

    if (format === 'excel') {
      return generatePurchaseExcel(res, purchases, summary);
    }

    res.json({
      summary,
      purchases,
      dateRange: { startDate, endDate },
      generatedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate sales report
// @route   GET /api/reports/sales
// @access  Private
const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const sales = await SalesOrder.find(filter)
      .populate('customer', 'name code')
      .populate('items.item', 'name sku')
      .sort({ createdAt: -1 });

    const summary = {
      totalOrders: sales.length,
      totalValue: sales.reduce((sum, so) => sum + so.total, 0),
      byStatus: {},
      byCustomer: {},
      byMonth: {}
    };

    sales.forEach(so => {
      // By status
      summary.byStatus[so.status] = (summary.byStatus[so.status] || 0) + 1;
      
      // By customer
      const customerName = so.customer?.name || 'Unknown';
      if (!summary.byCustomer[customerName]) {
        summary.byCustomer[customerName] = {
          count: 0,
          value: 0
        };
      }
      summary.byCustomer[customerName].count++;
      summary.byCustomer[customerName].value += so.total;

      // By month
      const month = so.createdAt.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!summary.byMonth[month]) {
        summary.byMonth[month] = {
          count: 0,
          value: 0
        };
      }
      summary.byMonth[month].count++;
      summary.byMonth[month].value += so.total;
    });

    if (format === 'excel') {
      return generateSalesExcel(res, sales, summary);
    }

    res.json({
      summary,
      sales,
      dateRange: { startDate, endDate },
      generatedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Excel generation functions
const generateStockExcel = async (res, items, summary) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Stock Report');

  // Add title
  worksheet.mergeCells('A1:G1');
  const titleRow = worksheet.getRow(1);
  titleRow.getCell(1).value = 'Stock Report';
  titleRow.getCell(1).font = { size: 16, bold: true };
  titleRow.getCell(1).alignment = { horizontal: 'center' };

  // Add summary
  worksheet.addRow([]);
  worksheet.addRow(['Summary']);
  worksheet.addRow(['Total Items:', summary.totalItems]);
  worksheet.addRow(['Total Value:', summary.totalValue]);
  worksheet.addRow(['Low Stock Items:', summary.lowStock]);
  worksheet.addRow(['Out of Stock:', summary.outOfStock]);

  worksheet.addRow([]);
  worksheet.addRow(['Stock Items']);

  // Add headers
  const headers = ['SKU', 'Name', 'Category', 'Quantity', 'Unit Price', 'Total Value', 'Supplier'];
  worksheet.addRow(headers);

  // Style headers
  const headerRow = worksheet.getRow(worksheet.lastRow.number);
  headerRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  });

  // Add data
  items.forEach(item => {
    worksheet.addRow([
      item.sku,
      item.name,
      item.category || '-',
      item.quantity,
      item.unitPrice || 0,
      (item.quantity * (item.unitPrice || 0)).toFixed(2),
      item.supplier?.name || '-'
    ]);
  });

  // Set column widths
  worksheet.columns = [
    { width: 15 },
    { width: 30 },
    { width: 15 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 20 }
  ];

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=stock-report.xlsx');

  await workbook.xlsx.write(res);
  res.end();
};

const generatePurchaseExcel = async (res, purchases, summary) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Purchase Report');

  // Similar structure as stock report but for purchases
  // ... (implementation similar to generateStockExcel)

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=purchase-report.xlsx');

  await workbook.xlsx.write(res);
  res.end();
};

const generateSalesExcel = async (res, sales, summary) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');

  // Similar structure as stock report but for sales
  // ... (implementation similar to generateStockExcel)

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

  await workbook.xlsx.write(res);
  res.end();
};

const generateStockPDF = async (res, items, summary) => {
  // PDF generation logic
  // ... (implement with PDFKit)
  res.status(200).json({ message: 'PDF generation not implemented yet' });
};

module.exports = {
  getStockReport,
  getPurchaseReport,
  getSalesReport,
};