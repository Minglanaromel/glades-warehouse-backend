const fs = require('fs');
const path = require('path');

const DASHBOARDS_FILE = path.join(__dirname, '../data/dashboards.json');

class Dashboard {
  static findAll() {
    if (!fs.existsSync(DASHBOARDS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(DASHBOARDS_FILE, 'utf8');
    return JSON.parse(data);
  }

  static save(dashboards) {
    fs.writeFileSync(DASHBOARDS_FILE, JSON.stringify(dashboards, null, 2));
  }

  static async findByUser(userId) {
    const dashboards = this.findAll();
    return dashboards.find(d => String(d.user) === String(userId));
  }

  static async create(userId, dashboardData) {
    const dashboards = this.findAll();
    
    // Check if user already has a dashboard
    const existingIndex = dashboards.findIndex(d => String(d.user) === String(userId));
    
    const dashboard = {
      id: Date.now().toString(),
      user: userId,
      widgets: dashboardData.widgets || [],
      layout: dashboardData.layout || 'grid',
      isDefault: dashboardData.isDefault || false,
      settings: dashboardData.settings || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (existingIndex !== -1) {
      dashboards[existingIndex] = { ...dashboards[existingIndex], ...dashboard, updatedAt: new Date().toISOString() };
    } else {
      dashboards.push(dashboard);
    }
    
    this.save(dashboards);
    return dashboard;
  }

  static async update(userId, updateData) {
    const dashboards = this.findAll();
    const index = dashboards.findIndex(d => String(d.user) === String(userId));
    
    if (index === -1) {
      throw new Error('Dashboard not found');
    }
    
    dashboards[index] = {
      ...dashboards[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    this.save(dashboards);
    return dashboards[index];
  }

  static async delete(userId) {
    const dashboards = this.findAll();
    const filteredDashboards = dashboards.filter(d => String(d.user) !== String(userId));
    this.save(filteredDashboards);
    return true;
  }

  static async addWidget(userId, widget) {
    const dashboard = await this.findByUser(userId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }
    
    const newWidget = {
      id: Date.now().toString(),
      ...widget,
      createdAt: new Date().toISOString()
    };
    
    dashboard.widgets.push(newWidget);
    await this.update(userId, { widgets: dashboard.widgets });
    return newWidget;
  }

  static async updateWidget(userId, widgetId, widgetData) {
    const dashboard = await this.findByUser(userId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }
    
    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) {
      throw new Error('Widget not found');
    }
    
    dashboard.widgets[widgetIndex] = {
      ...dashboard.widgets[widgetIndex],
      ...widgetData,
      updatedAt: new Date().toISOString()
    };
    
    await this.update(userId, { widgets: dashboard.widgets });
    return dashboard.widgets[widgetIndex];
  }

  static async removeWidget(userId, widgetId) {
    const dashboard = await this.findByUser(userId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }
    
    dashboard.widgets = dashboard.widgets.filter(w => w.id !== widgetId);
    await this.update(userId, { widgets: dashboard.widgets });
    return true;
  }

  static async reorderWidgets(userId, widgetOrder) {
    const dashboard = await this.findByUser(userId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }
    
    const reorderedWidgets = widgetOrder.map(id => dashboard.widgets.find(w => w.id === id)).filter(Boolean);
    await this.update(userId, { widgets: reorderedWidgets });
    return reorderedWidgets;
  }
}

module.exports = Dashboard;