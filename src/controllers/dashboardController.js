// src/controllers/dashboardController.js
const excelParser = require('../utils/excelParser');

const getDashboardStats = async (req, res) => {
  try {
    const data = excelParser.getCurrentData();
    res.json({ success: true, data: data.dashboardStats || {} });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard stats' });
  }
};

const getCapacityData = async (req, res) => {
  try {
    const data = excelParser.getCurrentData();
    res.json({ success: true, data: data.capacityUtilization || [] });
  } catch (error) {
    console.error('Error fetching capacity data:', error);
    res.status(500).json({ success: false, message: 'Error fetching capacity data' });
  }
};

const getMachineStatus = async (req, res) => {
  try {
    const data = excelParser.getCurrentData();
    res.json({ success: true, data: data.machineStatus || [] });
  } catch (error) {
    console.error('Error fetching machine status:', error);
    res.status(500).json({ success: false, message: 'Error fetching machine status' });
  }
};

const getDowntime = async (req, res) => {
  try {
    const data = excelParser.getCurrentData();
    res.json({ success: true, data: data.downtime || [] });
  } catch (error) {
    console.error('Error fetching downtime:', error);
    res.status(500).json({ success: false, message: 'Error fetching downtime' });
  }
};

const getAttendance = async (req, res) => {
  try {
    const data = excelParser.getCurrentData();
    res.json({ success: true, data: data.attendance || { shiftA: {}, shiftB: {} } });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ success: false, message: 'Error fetching attendance' });
  }
};

const getHourlyProduction = async (req, res) => {
  try {
    const data = excelParser.getCurrentData();
    const { machine } = req.query;
    let production = data.hourlyProduction || [];
    if (machine && machine !== 'all') {
      production = production.filter(p => p.machine === machine);
    }
    res.json({ success: true, data: production });
  } catch (error) {
    console.error('Error fetching hourly production:', error);
    res.status(500).json({ success: false, message: 'Error fetching hourly production' });
  }
};

const getTroubleReports = async (req, res) => {
  try {
    const data = excelParser.getCurrentData();
    res.json({ success: true, data: data.troubleReports || [] });
  } catch (error) {
    console.error('Error fetching trouble reports:', error);
    res.status(500).json({ success: false, message: 'Error fetching trouble reports' });
  }
};

const getOTIF = async (req, res) => {
  try {
    const data = excelParser.getCurrentData();
    res.json({ success: true, data: data.otif || {} });
  } catch (error) {
    console.error('Error fetching OTIF:', error);
    res.status(500).json({ success: false, message: 'Error fetching OTIF' });
  }
};

const getProductionSummary = async (req, res) => {
  try {
    const data = excelParser.getCurrentData();
    const { dashboardStats, hourlyProduction, capacityUtilization } = data;
    
    const summary = {
      totalProduction: dashboardStats?.production?.hourlyTotal || 0,
      avgUtilization: dashboardStats?.production?.avgUtilization || 0,
      totalMachines: dashboardStats?.machines?.total || 0,
      runningMachines: dashboardStats?.machines?.running || 0,
      attendanceRate: dashboardStats?.attendance?.rate || 0,
      otifRate: data.otif?.overallOTIF || 0,
      topPerformers: hourlyProduction?.slice(0, 5).map(p => ({
        machine: p.machine,
        output: p.total
      })) || []
    };
    
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching production summary:', error);
    res.status(500).json({ success: false, message: 'Error fetching production summary' });
  }
};

const getRealTimeMetrics = async (req, res) => {
  try {
    const data = excelParser.getCurrentData();
    const { dashboardStats, machineStatus, downtime } = data;
    
    const metrics = {
      timestamp: new Date().toISOString(),
      machines: {
        running: dashboardStats?.machines?.running || 0,
        idle: dashboardStats?.machines?.idle || 0,
        breakdown: dashboardStats?.machines?.breakdown || 0,
        total: dashboardStats?.machines?.total || 0,
        availability: dashboardStats?.machines?.availability || 0
      },
      production: {
        currentOutput: dashboardStats?.production?.hourlyTotal || 0,
        efficiency: dashboardStats?.production?.avgUtilization || 0
      },
      quality: {
        troubleReports: dashboardStats?.troubleReports?.total || 0,
        criticalIssues: dashboardStats?.troubleReports?.critical || 0
      },
      downtime: {
        totalHours: dashboardStats?.downtime?.total || 0,
        events: dashboardStats?.downtime?.events || 0,
        recent: downtime?.slice(0, 5) || []
      }
    };
    
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error fetching real-time metrics:', error);
    res.status(500).json({ success: false, message: 'Error fetching real-time metrics' });
  }
};

module.exports = { 
  getDashboardStats, 
  getCapacityData, 
  getMachineStatus, 
  getDowntime, 
  getAttendance, 
  getHourlyProduction, 
  getTroubleReports,
  getOTIF,
  getProductionSummary,
  getRealTimeMetrics
};