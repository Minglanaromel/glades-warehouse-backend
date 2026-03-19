const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// @desc    Upload and process Excel file
// @route   POST /api/excel/upload
// @access  Private
const uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    
    // Process each sheet
    const data = {};
    
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      data[sheetName] = XLSX.utils.sheet_to_json(sheet);
    });

    // Save processed data to a JSON file for quick access
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(dataDir, 'excel-data.json'), 
      JSON.stringify(data, null, 2)
    );

    res.json({
      message: 'File uploaded successfully',
      sheets: workbook.SheetNames,
      data: data
    });
  } catch (error) {
    console.error('Excel upload error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get processed Excel data
// @route   GET /api/excel/data
// @access  Private
const getExcelData = async (req, res) => {
  try {
    const dataPath = path.join(__dirname, '../../data/excel-data.json');
    
    if (!fs.existsSync(dataPath)) {
      return res.json({
        capacityData: [],
        machineStatus: [],
        downtimeData: [],
        attendanceData: []
      });
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // Map sheet names to expected data structures
    const response = {
      capacityData: data['Capacity Utilization'] || [],
      machineStatus: data['Machine Status'] || [],
      downtimeData: data['Downtime'] || [],
      attendanceData: data['Attendance'] || [],
      productionData: data['Production'] || []
    };

    res.json(response);
  } catch (error) {
    console.error('Get Excel data error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadExcel,
  getExcelData
};