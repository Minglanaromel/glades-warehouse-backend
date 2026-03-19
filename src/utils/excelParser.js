const ExcelJS = require('exceljs');

const parseExcelToJSON = async (filePath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const worksheet = workbook.getWorksheet(1);
  const jsonData = [];
  
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row
    const rowData = {};
    row.eachCell((cell, colNumber) => {
      rowData[`column${colNumber}`] = cell.value;
    });
    jsonData.push(rowData);
  });
  
  return jsonData;
};

const generateExcelFromJSON = async (data, headers, filePath) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');
  
  // Add headers
  worksheet.addRow(headers);
  
  // Add data
  data.forEach(item => {
    worksheet.addRow(Object.values(item));
  });
  
  await workbook.xlsx.writeFile(filePath);
  return filePath;
};

module.exports = {
  parseExcelToJSON,
  generateExcelFromJSON,
};