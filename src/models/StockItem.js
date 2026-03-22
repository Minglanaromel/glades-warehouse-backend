const fs = require('fs');
const path = require('path');

const STOCK_FILE = path.join(__dirname, '../data/stock/items.json');
const MOVEMENTS_FILE = path.join(__dirname, '../data/stock/movements.json');

class StockItem {
  static findAll() {
    if (!fs.existsSync(STOCK_FILE)) {
      return [];
    }
    const data = fs.readFileSync(STOCK_FILE, 'utf8');
    return JSON.parse(data);
  }

  static save(items) {
    fs.writeFileSync(STOCK_FILE, JSON.stringify(items, null, 2));
  }

  static findAllMovements() {
    if (!fs.existsSync(MOVEMENTS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(MOVEMENTS_FILE, 'utf8');
    return JSON.parse(data);
  }

  static saveMovements(movements) {
    fs.writeFileSync(MOVEMENTS_FILE, JSON.stringify(movements, null, 2));
  }

  static create(itemData) {
    const items = this.findAll();
    
    // Generate SKU if not provided
    let sku = itemData.sku;
    if (!sku) {
      const prefix = itemData.category ? itemData.category.substring(0, 3).toUpperCase() : 'ITM';
      const count = items.length + 1;
      sku = `${prefix}${String(count).padStart(6, '0')}`;
    }
    
    const newItem = {
      id: Date.now().toString(),
      sku,
      name: itemData.name,
      description: itemData.description || '',
      category: itemData.category || 'Other',
      unit: itemData.unit || 'pcs',
      price: parseFloat(itemData.price) || 0,
      cost: parseFloat(itemData.cost) || 0,
      currentStock: parseInt(itemData.currentStock) || 0,
      minStock: parseInt(itemData.minStock) || 0,
      maxStock: parseInt(itemData.maxStock) || 0,
      location: itemData.location || '',
      supplier: itemData.supplier || '',
      isActive: itemData.isActive !== undefined ? itemData.isActive : true,
      createdBy: itemData.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    items.push(newItem);
    this.save(items);
    return newItem;
  }

  static findById(id) {
    const items = this.findAll();
    return items.find(i => i.id === id);
  }

  static findByCode(sku) {
    const items = this.findAll();
    return items.find(i => i.sku === sku);
  }

  static findByCategory(category) {
    const items = this.findAll();
    return items.filter(i => i.category === category);
  }

  static update(id, updateData) {
    const items = this.findAll();
    const index = items.findIndex(i => i.id === id);
    
    if (index === -1) {
      throw new Error('Item not found');
    }

    items[index] = { 
      ...items[index], 
      ...updateData, 
      updatedAt: new Date().toISOString() 
    };
    this.save(items);
    return items[index];
  }

  static updateStock(id, quantity, type, reason, userId, notes = '') {
    const items = this.findAll();
    const index = items.findIndex(i => i.id === id);
    
    if (index === -1) {
      throw new Error('Item not found');
    }
    
    const oldStock = items[index].currentStock;
    let newStock = oldStock;
    
    if (type === 'in') {
      newStock = oldStock + quantity;
    } else if (type === 'out') {
      newStock = oldStock - quantity;
      if (newStock < 0) {
        throw new Error('Insufficient stock');
      }
    } else {
      throw new Error('Invalid type. Must be "in" or "out"');
    }
    
    items[index].currentStock = newStock;
    items[index].updatedAt = new Date().toISOString();
    this.save(items);
    
    // Record movement
    const movements = this.findAllMovements();
    movements.unshift({
      id: Date.now().toString(),
      itemId: id,
      type,
      quantity,
      oldStock,
      newStock,
      reason,
      userId,
      notes,
      timestamp: new Date().toISOString()
    });
    this.saveMovements(movements.slice(0, 500));
    
    return items[index];
  }

  static delete(id) {
    const items = this.findAll();
    const filteredItems = items.filter(i => i.id !== id);
    this.save(filteredItems);
    return true;
  }

  static getLowStock() {
    const items = this.findAll();
    return items.filter(item => item.isActive && item.currentStock <= item.minStock);
  }

  static getMovements(itemId) {
    const movements = this.findAllMovements();
    return movements.filter(m => m.itemId === itemId);
  }

  static getSummary() {
    const items = this.findAll();
    let totalValue = 0;
    let totalItems = 0;
    const categories = {};
    
    items.forEach(item => {
      if (item.isActive) {
        categories[item.category] = (categories[item.category] || 0) + 1;
        totalValue += (item.currentStock * item.cost);
        totalItems += item.currentStock;
      }
    });
    
    return {
      totalItems,
      totalValue,
      itemCount: items.filter(i => i.isActive).length,
      categories,
      lowStockCount: this.getLowStock().length
    };
  }
}

module.exports = StockItem;