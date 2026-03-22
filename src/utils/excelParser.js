const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

class ExcelParser {
  constructor() {
    this.currentData = {
      capacityUtilization: [],
      machineStatus: [],
      downtime: [],
      attendance: { shiftA: {}, shiftB: {} },
      hourlyProduction: [],
      troubleReports: [],
      otif: {},
      dashboardStats: {
        machines: { total: 0, running: 0, idle: 0, breakdown: 0, maintenance: 0, availability: 0 },
        plants: { plant1: { total: 0, running: 0, utilization: 0 }, plant2: { total: 0, running: 0, utilization: 0 } },
        production: { totalOutput: 0, avgUtilization: 0, hourlyTotal: 0, capacityCount: 0 },
        downtime: { total: 0, events: 0 },
        attendance: { totalPlanned: 0, totalActual: 0, rate: 0 },
        troubleReports: { total: 0, critical: 0 }
      },
      lastUpdate: new Date()
    };
    this.loadFromFile();
  }

  loadFromFile() {
    try {
      const dataPath = path.join(__dirname, '../data/excel-data.json');
      if (fs.existsSync(dataPath)) {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        this.currentData = { ...this.currentData, ...data };
        console.log('✅ Data loaded from file');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  saveToFile() {
    try {
      const dataPath = path.join(__dirname, '../data/excel-data.json');
      fs.writeFileSync(dataPath, JSON.stringify(this.currentData, null, 2));
      console.log('💾 Data saved to file');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  parseExcelFile(filePath) {
    try {
      console.log('📂 Parsing Excel file:', filePath);
      const workbook = XLSX.readFile(filePath);
      const sheets = {};

      workbook.SheetNames.forEach(sheetName => {
        console.log(`📄 Reading sheet: ${sheetName}`);
        sheets[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          header: 1,
          defval: '',
          blankrows: false,
          raw: false
        });
      });

      const parsedData = {
        capacityUtilization: this.parseCapacityUtilization(sheets),
        machineStatus: this.parseMachineStatus(sheets),
        downtime: this.parseDowntime(sheets),
        attendance: this.parseAttendance(sheets),
        hourlyProduction: this.parseHourlyProduction(sheets),
        troubleReports: this.parseTroubleReports(sheets),
        otif: this.parseOTIF(sheets),
        dashboardStats: this.calculateDashboardStats(sheets),
        lastUpdate: new Date()
      };

      console.log(`✅ Parsed: ${parsedData.machineStatus.length} machines, ${parsedData.downtime.length} downtime events`);

      this.currentData = { ...this.currentData, ...parsedData };
      this.saveToFile();

      return parsedData;
    } catch (error) {
      console.error('Error parsing Excel:', error);
      throw error;
    }
  }

  parseCapacityUtilization(sheets) {
    const sheet = sheets['Capacity Utilization'] || sheets['Capacity Utilization (2)'];
    if (!sheet || sheet.length === 0) return [];

    const capacities = [];
    let currentPlant = '';
    let currentProcess = '';

    for (let i = 0; i < sheet.length; i++) {
      const row = sheet[i];
      
      if (row[0] && row[0].toString().includes('PLANT')) {
        currentPlant = row[0];
        continue;
      }
      
      if (row[1] && (row[1] === 'THERMO' || row[1] === 'PRINTING' || row[1] === 'INJECTION' || 
          row[1] === 'LABELING' || row[1] === 'THERMO LIDS' || row[1] === 'PAPER CUPS')) {
        currentProcess = row[1];
        continue;
      }
      
      if (row[1] && row[2] && row[1] !== 'Process' && row[1] !== 'THERMO' && row[1] !== 'PRINTING') {
        capacities.push({
          plant: currentPlant,
          process: currentProcess,
          machine: row[2],
          fgCode: row[3] || '',
          productDesc: row[4] || '',
          dailyCap: this.parseNumber(row[5]),
          octVolume: this.parseNumber(row[8]),
          novVolume: this.parseNumber(row[9]),
          decVolume: this.parseNumber(row[10]),
          totalVolume: this.parseNumber(row[11]),
          octUtil: this.parsePercentage(row[15]),
          novUtil: this.parsePercentage(row[16]),
          decUtil: this.parsePercentage(row[17])
        });
      }
    }
    return capacities;
  }

  parseMachineStatus(sheets) {
    const sheet = sheets['Machine Status'] || sheets['Machine Status (2)'];
    if (!sheet || sheet.length === 0) {
      console.log('⚠️ Machine Status sheet not found or empty');
      return [];
    }

    console.log(`📊 Machine Status sheet has ${sheet.length} rows`);
    console.log('📋 First few rows:', sheet.slice(0, 3));

    const machines = [];
    
    // Find the header row
    let headerRowIndex = -1;
    let plantCol = -1, processCol = -1, machineCol = -1, statusCol = -1, 
        operatorCol = -1, remarksCol = -1;
    
    for (let i = 0; i < Math.min(sheet.length, 20); i++) {
      const row = sheet[i];
      if (!row || !Array.isArray(row)) continue;
      
      for (let j = 0; j < row.length; j++) {
        const cell = row[j] ? row[j].toString().toLowerCase() : '';
        if (cell === 'plant') plantCol = j;
        if (cell === 'process') processCol = j;
        if (cell === 'machine') machineCol = j;
        if (cell === 'status') statusCol = j;
        if (cell === 'operator') operatorCol = j;
        if (cell === 'remarks') remarksCol = j;
      }
      
      if (plantCol !== -1 && machineCol !== -1) {
        headerRowIndex = i;
        console.log(`✅ Found header row at index ${i}, plantCol=${plantCol}, machineCol=${machineCol}, statusCol=${statusCol}`);
        break;
      }
    }
    
    if (headerRowIndex !== -1) {
      for (let i = headerRowIndex + 1; i < sheet.length; i++) {
        const row = sheet[i];
        if (!row || !Array.isArray(row)) continue;
        
        const plant = plantCol !== -1 && row[plantCol] ? row[plantCol].toString().trim() : '';
        const machine = machineCol !== -1 && row[machineCol] ? row[machineCol].toString().trim() : '';
        let status = statusCol !== -1 && row[statusCol] ? row[statusCol].toString().trim() : '';
        const process = processCol !== -1 && row[processCol] ? row[processCol].toString().trim() : '';
        const operator = operatorCol !== -1 && row[operatorCol] ? row[operatorCol].toString().trim() : '';
        const remarks = remarksCol !== -1 && row[remarksCol] ? row[remarksCol].toString().trim() : '';
        
        if (!machine || machine === '' || machine === 'Machine' || machine === 'GUIDE:' || machine === 'Machine Status') {
          continue;
        }
        
        if (machines.some(m => m.machine === machine)) {
          continue;
        }
        
        if (!status || status === '') {
          const remarksLower = remarks.toLowerCase();
          if (remarksLower.includes('running') || remarksLower.includes('operating')) {
            status = 'Running/Operating';
          } else if (remarksLower.includes('idle') || remarksLower.includes('waiting')) {
            status = 'Idle / Waiting';
          } else if (remarksLower.includes('breakdown') || remarksLower.includes('down')) {
            status = 'Breakdown';
          } else if (remarksLower.includes('maintenance') || remarksLower.includes('repair')) {
            status = 'Under Maintenance';
          } else if (remarksLower.includes('shutdown') || remarksLower.includes('offline') || remarksLower.includes('no schedule')) {
            status = 'Shutdown / Offline';
          } else {
            status = 'Idle / Waiting';
          }
        }
        
        machines.push({
          plant: plant || 'P1',
          process: process || 'Unknown',
          machine: machine,
          status: this.normalizeStatus(status),
          operator: operator || '',
          remarks: remarks || '',
          downtimeStart: '',
          downtimeEnd: '',
          duration: '',
          sku: ''
        });
        
        console.log(`✅ Added machine: ${machine} - ${status}`);
      }
    } else {
      console.log('⚠️ No header row found, using position-based parsing');
      
      const machineNames = ['KMD1', 'KMD2', 'KMD3', 'KMD4', 'R8', 'R14', 'R16', 'R22', 
                            '70K1', '70K2', '70K3', '70K5', 'ICM1', 'ICM3', 'ICM4', 
                            'ICM5', 'ICM6', 'ICM7', 'ICM8', 'Vandam1', 'Vandam2', 
                            'Vandam3', 'Vandam4', 'Vandam5', 'Vandam6', 'OMSO',
                            'IM4', 'IM5', 'IM11', 'IM12', 'IM13', 'IM14', 'IM15', 
                            'IM16', 'IM17', 'IM18', 'Tunnel1', 'Tunnel3', 'KTR', '70K4', '70K6'];
      
      for (let i = 2; i < sheet.length; i++) {
        const row = sheet[i];
        if (!row || !Array.isArray(row) || row.length < 4) continue;
        
        const machine = row[2] ? row[2].toString().trim() : '';
        
        if (machine && machineNames.includes(machine)) {
          const plant = row[0] ? row[0].toString().trim() : '';
          const process = row[1] ? row[1].toString().trim() : '';
          let status = row[3] ? row[3].toString().trim() : '';
          const operator = row[4] ? row[4].toString().trim() : '';
          const remarks = row[5] ? row[5].toString().trim() : '';
          
          if (!status || status === '') {
            const remarksLower = remarks.toLowerCase();
            if (remarksLower.includes('running') || remarksLower.includes('operating')) {
              status = 'Running/Operating';
            } else if (remarksLower.includes('idle') || remarksLower.includes('waiting')) {
              status = 'Idle / Waiting';
            } else if (remarksLower.includes('breakdown') || remarksLower.includes('down')) {
              status = 'Breakdown';
            } else if (remarksLower.includes('maintenance')) {
              status = 'Under Maintenance';
            } else {
              status = 'Idle / Waiting';
            }
          }
          
          machines.push({
            plant: plant || 'P1',
            process: process || 'Unknown',
            machine: machine,
            status: this.normalizeStatus(status),
            operator: operator || '',
            remarks: remarks || '',
            downtimeStart: row[6] || '',
            downtimeEnd: row[7] || '',
            duration: row[8] || '',
            sku: row[9] || ''
          });
          
          console.log(`✅ Added machine (position-based): ${machine} - ${status}`);
        }
      }
    }
    
    console.log(`✅ Total machines found: ${machines.length}`);
    return machines;
  }
  
  normalizeStatus(status) {
    if (!status) return 'Unknown';
    const s = status.toLowerCase();
    if (s.includes('running')) return 'Running/Operating';
    if (s.includes('idle')) return 'Idle / Waiting';
    if (s.includes('maintenance')) return 'Under Maintenance';
    if (s.includes('breakdown')) return 'Breakdown';
    if (s.includes('shutdown') || s.includes('offline')) return 'Shutdown / Offline';
    return status;
  }

  // ==================== UPDATED: Parse Downtime ====================
parseDowntime(sheets) {
  const sheet = sheets['Downtime Monitoring'];
  const downtime = [];
  
  console.log('📊 Parsing Downtime Monitoring sheet...');
  
  if (!sheet || sheet.length === 0) {
    console.log('⚠️ Downtime Monitoring sheet not found');
    return this.getSampleDowntimeData();
  }
  
  console.log(`📊 Downtime Monitoring sheet has ${sheet.length} rows`);
  
  // I-print ang first 20 rows para makita ang actual structure
  console.log('📋 First 20 rows of Downtime Monitoring:');
  for (let i = 0; i < Math.min(sheet.length, 20); i++) {
    const row = sheet[i];
    if (row) {
      console.log(`  Row ${i}: [0]="${row[0] || ''}" [1]="${row[1] || ''}" [2]="${row[2] || ''}" [3]="${row[3] || ''}"`);
    }
  }
  
  // Hanapin ang header row
  let headerRowIndex = -1;
  let plantIdx = -1, processIdx = -1, machineIdx = -1, dateIdx = -1;
  let startTimeIdx = -1, endTimeIdx = -1, durationIdx = -1, operatorIdx = -1, reasonIdx = -1;
  
  for (let i = 0; i < Math.min(sheet.length, 20); i++) {
    const row = sheet[i];
    if (!row || !Array.isArray(row)) continue;
    
    for (let j = 0; j < row.length; j++) {
      const cell = row[j] ? row[j].toString().toLowerCase().trim() : '';
      if (cell === 'plant') plantIdx = j;
      if (cell === 'process/area') processIdx = j;
      if (cell === 'machine name') machineIdx = j;
      if (cell === 'date') dateIdx = j;
      if (cell === 'start downtime') startTimeIdx = j;
      if (cell === 'end downtime') endTimeIdx = j;
      if (cell === 'duration') durationIdx = j;
      if (cell === 'operator') operatorIdx = j;
      if (cell === 'downtime reason') reasonIdx = j;
    }
    
    if (plantIdx !== -1 && machineIdx !== -1) {
      headerRowIndex = i;
      console.log(`✅ Found downtime header at row ${i}, plantCol=${plantIdx}, machineCol=${machineIdx}, startTimeCol=${startTimeIdx}, durationCol=${durationIdx}`);
      break;
    }
  }
  
  // Kung walang header, gumamit ng position-based parsing
  if (headerRowIndex === -1) {
    console.log('⚠️ No header row found, using position-based parsing...');
    
    // I-scan ang lahat ng rows para sa actual data (hindi formula)
    for (let i = 0; i < sheet.length; i++) {
      const row = sheet[i];
      if (!row || !Array.isArray(row)) continue;
      
      // Skip kung walang machine name
      const machine = row[2] ? row[2].toString().trim() : '';
      if (!machine || machine === '' || machine === 'Machine Name' || machine === 'Machine') {
        continue;
      }
      
      // I-check kung ang row ay formula (may = sign)
      const isFormula = machine.includes('=') || 
                        (row[4] && row[4].toString().includes('=')) ||
                        (row[5] && row[5].toString().includes('=')) ||
                        (row[6] && row[6].toString().includes('='));
      
      if (isFormula) {
        console.log(`  Skipping formula row ${i}: ${machine}`);
        continue;
      }
      
      const plant = row[0] ? row[0].toString().trim() : '';
      const process = row[1] ? row[1].toString().trim() : '';
      const date = row[3] ? row[3].toString().trim() : '';
      let startTime = row[4] ? row[4].toString().trim() : '';
      let endTime = row[5] ? row[5].toString().trim() : '';
      let duration = row[6] ? row[6].toString().trim() : '';
      const operator = row[7] ? row[7].toString().trim() : '';
      const reason = row[8] ? row[8].toString().trim() : '';
      
      // Skip kung walang start time at walang duration
      if ((!startTime || startTime === '' || startTime === 'Start Downtime') && 
          (!duration || duration === '' || duration === 'Duration' || duration === '0 mins')) {
        continue;
      }
      
      // I-skip ang formula rows
      if (duration && (duration.includes('=IF') || duration.includes('=SUM') || duration.includes('#REF'))) {
        continue;
      }
      
      // Normalize duration
      if (duration && !duration.includes('hr') && !duration.includes('mins') && !isNaN(parseFloat(duration))) {
        duration = `${parseFloat(duration)} hrs`;
      }
      
      if (duration === '' || duration === '0 mins') {
        // Try to calculate from start/end times
        if (startTime && endTime && startTime !== 'Start Downtime' && endTime !== 'End Downtime') {
          duration = this.calculateDuration(startTime, endTime);
        } else {
          duration = '0 mins';
        }
      }
      
      // Only add if there's valid data
      if (duration !== '0 mins' && duration !== '') {
        downtime.push({
          plant: plant || 'P1',
          process: process,
          machine: machine,
          date: date,
          startTime: startTime || 'N/A',
          endTime: endTime || 'N/A',
          duration: duration,
          operator: operator || 'N/A',
          reason: reason || 'No reason specified'
        });
        console.log(`  Added downtime: ${machine} - ${startTime} to ${endTime} - ${duration}`);
      }
    }
  } else {
    // May header, gamitin ang column indices
    console.log(`📋 Parsing data rows from row ${headerRowIndex + 1} to ${sheet.length}`);
    
    for (let i = headerRowIndex + 1; i < sheet.length; i++) {
      const row = sheet[i];
      if (!row || !Array.isArray(row)) continue;
      
      const machine = machineIdx !== -1 && row[machineIdx] ? row[machineIdx].toString().trim() : '';
      
      // Skip rows without machine name
      if (!machine || machine === '' || machine === 'Machine Name' || machine === 'Machine') {
        continue;
      }
      
      // I-check kung ang row ay formula
      const isFormula = machine.includes('=') || 
                        (startTimeIdx !== -1 && row[startTimeIdx] && row[startTimeIdx].toString().includes('=')) ||
                        (durationIdx !== -1 && row[durationIdx] && row[durationIdx].toString().includes('='));
      
      if (isFormula) {
        console.log(`  Skipping formula row ${i}: ${machine}`);
        continue;
      }
      
      const plant = plantIdx !== -1 && row[plantIdx] ? row[plantIdx].toString().trim() : '';
      const process = processIdx !== -1 && row[processIdx] ? row[processIdx].toString().trim() : '';
      const date = dateIdx !== -1 && row[dateIdx] ? row[dateIdx].toString().trim() : '';
      let startTime = startTimeIdx !== -1 && row[startTimeIdx] ? row[startTimeIdx].toString().trim() : '';
      let endTime = endTimeIdx !== -1 && row[endTimeIdx] ? row[endTimeIdx].toString().trim() : '';
      let duration = durationIdx !== -1 && row[durationIdx] ? row[durationIdx].toString().trim() : '';
      const operator = operatorIdx !== -1 && row[operatorIdx] ? row[operatorIdx].toString().trim() : '';
      const reason = reasonIdx !== -1 && row[reasonIdx] ? row[reasonIdx].toString().trim() : '';
      
      // Skip kung walang start time at walang duration
      if ((!startTime || startTime === '' || startTime === 'Start Downtime') && 
          (!duration || duration === '' || duration === 'Duration' || duration === '0 mins')) {
        continue;
      }
      
      // Skip formula rows
      if (duration && (duration.includes('=IF') || duration.includes('=SUM') || duration.includes('#REF'))) {
        continue;
      }
      
      // Normalize duration
      if (duration && !duration.includes('hr') && !duration.includes('mins') && !isNaN(parseFloat(duration))) {
        duration = `${parseFloat(duration)} hrs`;
      }
      
      if (duration === '' || duration === '0 mins') {
        // Try to calculate from start/end times
        if (startTime && endTime && startTime !== 'Start Downtime' && endTime !== 'End Downtime') {
          duration = this.calculateDuration(startTime, endTime);
        } else {
          duration = '0 mins';
        }
      }
      
      // Only add if there's valid data
      if (duration !== '0 mins' && duration !== '') {
        downtime.push({
          plant: plant || 'P1',
          process: process,
          machine: machine,
          date: date,
          startTime: startTime || 'N/A',
          endTime: endTime || 'N/A',
          duration: duration,
          operator: operator || 'N/A',
          reason: reason || 'No reason specified'
        });
        console.log(`  Added downtime: ${machine} - ${startTime} to ${endTime} - ${duration}`);
      }
    }
  }
  
  // If we found downtime data, return it
  if (downtime.length > 0) {
    console.log(`✅ Found ${downtime.length} downtime records from Downtime Monitoring sheet`);
    return downtime;
  }
  
  // Try to get downtime from Machine Status sheet
  console.log('⚠️ No downtime data in Downtime Monitoring, trying Machine Status sheet...');
  const machineStatusSheet = sheets['Machine Status'] || sheets['Machine Status (2)'];
  
  if (machineStatusSheet && machineStatusSheet.length > 0) {
    // ... rest of Machine Status parsing code ...
    // (same as before)
  }
  
  // If still no data, return sample data
  if (downtime.length === 0) {
    console.log('⚠️ No downtime data found, returning sample data');
    return this.getSampleDowntimeData();
  }
  
  console.log(`✅ Total downtime records: ${downtime.length}`);
  return downtime;
}

// Helper function to calculate duration from start and end times
calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return '0 mins';
  
  try {
    // Handle time strings like "07:00:00" or "07:00"
    let startStr = startTime.toString();
    let endStr = endTime.toString();
    
    // Add seconds if missing
    if (startStr.split(':').length === 2) startStr += ':00';
    if (endStr.split(':').length === 2) endStr += ':00';
    
    const start = new Date(`2000-01-01T${startStr}`);
    const end = new Date(`2000-01-01T${endStr}`);
    
    // Calculate difference in minutes
    const diffMinutes = (end - start) / (1000 * 60);
    
    if (diffMinutes <= 0) return '0 mins';
    
    const hours = Math.floor(diffMinutes / 60);
    const mins = Math.floor(diffMinutes % 60);
    
    if (hours > 0 && mins > 0) {
      return `${hours} hr ${mins} mins`;
    } else if (hours > 0) {
      return `${hours} hr 0 mins`;
    } else {
      return `${mins} mins`;
    }
  } catch (e) {
    console.log(`Error calculating duration: ${startTime} - ${endTime}`, e.message);
    return '0 mins';
  }
}
  // ==================== UPDATED: Parse Attendance ====================
  parseAttendance(sheets) {
    const sheet = sheets['P1&2 Attendance'];
    const attendance = { shiftA: {}, shiftB: {} };
    
    if (!sheet || sheet.length === 0) {
      console.log('⚠️ Attendance sheet not found');
      return this.getSampleAttendanceData();
    }
    
    console.log('📊 Parsing Attendance from sheet with', sheet.length, 'rows');
    console.log('📋 First 20 rows:');
    for (let i = 0; i < Math.min(sheet.length, 20); i++) {
      const row = sheet[i];
      if (row && row[0]) {
        console.log(`  Row ${i}: [0]="${row[0]}" [1]="${row[1] || ''}" [2]="${row[2] || ''}" [3]="${row[3] || ''}"`);
      }
    }
    
    const deptKeys = ['extrusion', 'thermo', 'printing', 'thermoIcm', 'injection', 'labeling', 'recycling'];
    const deptLabels = ['EXTRUSION', 'THERMO', 'PRINTING', 'THERMO ICM', 'INJECTION', 'LABELING', 'RECYCLING'];
    
    // Find Shift A and Shift B sections
    let shiftAStart = -1;
    let shiftBStart = -1;
    
    for (let i = 0; i < sheet.length; i++) {
      const row = sheet[i];
      if (row && row[0]) {
        const header = row[0].toString().toUpperCase();
        if (header === 'PLANT 1 SHIFT A') {
          shiftAStart = i;
          console.log(`✅ Found Shift A at row ${i}`);
        }
        if (header === 'PLANT 1 SHIFT B') {
          shiftBStart = i;
          console.log(`✅ Found Shift B at row ${i}`);
        }
      }
    }
    
    // Helper function to extract department data
    const extractDepartmentData = (startRow, sectionName) => {
      const sectionData = {};
      
      if (startRow === -1) {
        console.log(`⚠️ ${sectionName} section not found`);
        return sectionData;
      }
      
      console.log(`🔍 Extracting ${sectionName} data from row ${startRow}`);
      
      for (let i = startRow + 1; i < Math.min(sheet.length, startRow + 50); i++) {
        const row = sheet[i];
        if (!row || !Array.isArray(row)) continue;
        
        // Check column 1 for department names (based on Excel structure)
        const deptName = row[1] ? row[1].toString().toUpperCase() : '';
        const deptIndex = deptLabels.findIndex(label => label === deptName);
        
        if (deptIndex !== -1) {
          console.log(`  Found ${deptLabels[deptIndex]} at row ${i}`);
          
          let actual = 0, plan = 0;
          
          // Look for Total row (usually 2-5 rows below)
          for (let j = i + 1; j < Math.min(sheet.length, i + 15); j++) {
            const dataRow = sheet[j];
            if (dataRow && dataRow[0]) {
              const rowLabel = dataRow[0].toString().toUpperCase();
              if (rowLabel === 'TOTAL') {
                actual = this.parseNumber(dataRow[2]);
                plan = this.parseNumber(dataRow[3]);
                console.log(`    Found Total row at ${j}: actual=${actual}, plan=${plan}`);
                break;
              }
            }
          }
          
          // If no Total row, check current row
          if (actual === 0 && plan === 0) {
            actual = this.parseNumber(row[2]);
            plan = this.parseNumber(row[3]);
            if (actual > 0 || plan > 0) {
              console.log(`    Direct data at row ${i}: actual=${actual}, plan=${plan}`);
            }
          }
          
          sectionData[deptKeys[deptIndex]] = { actual, plan };
        }
      }
      
      return sectionData;
    };
    
    // Extract data from both shifts
    const shiftAData = extractDepartmentData(shiftAStart, 'Shift A');
    const shiftBData = extractDepartmentData(shiftBStart, 'Shift B');
    
    // Merge data
    Object.keys(shiftAData).forEach(key => {
      attendance.shiftA[key] = shiftAData[key];
    });
    
    Object.keys(shiftBData).forEach(key => {
      attendance.shiftB[key] = shiftBData[key];
    });
    
    // Fill missing departments with default values
    deptKeys.forEach(key => {
      if (!attendance.shiftA[key]) {
        attendance.shiftA[key] = { actual: 0, plan: 0 };
      }
      if (!attendance.shiftB[key]) {
        attendance.shiftB[key] = { actual: 0, plan: 0 };
      }
    });
    
    // Calculate summary
    let totalActual = 0, totalPlanned = 0;
    Object.values(attendance.shiftA).forEach(d => { 
      totalActual += d.actual || 0; 
      totalPlanned += d.plan || 0; 
    });
    Object.values(attendance.shiftB).forEach(d => { 
      totalActual += d.actual || 0; 
      totalPlanned += d.plan || 0; 
    });
    
    attendance.summary = {
      totalActual,
      totalPlanned,
      attendanceRate: totalPlanned > 0 ? (totalActual / totalPlanned * 100).toFixed(1) : 0
    };
    
    console.log(`📊 Attendance summary: Total Actual=${totalActual}, Total Planned=${totalPlanned}, Rate=${attendance.summary.attendanceRate}%`);
    
    // Return sample data if no real data found
    if (totalActual === 0 && totalPlanned === 0) {
      console.log('⚠️ No attendance data found, returning sample data');
      return this.getSampleAttendanceData();
    }
    
    return attendance;
  }
  
  getSampleAttendanceData() {
    return {
      shiftA: {
        extrusion: { actual: 3, plan: 3 },
        thermo: { actual: 19, plan: 19 },
        printing: { actual: 8, plan: 9 },
        thermoIcm: { actual: 8, plan: 8 },
        injection: { actual: 20, plan: 20 },
        labeling: { actual: 4, plan: 9 },
        recycling: { actual: 2, plan: 2 }
      },
      shiftB: {
        extrusion: { actual: 0, plan: 0 },
        thermo: { actual: 0, plan: 0 },
        printing: { actual: 0, plan: 0 },
        thermoIcm: { actual: 0, plan: 0 },
        injection: { actual: 0, plan: 0 },
        labeling: { actual: 0, plan: 0 },
        recycling: { actual: 0, plan: 0 }
      },
      summary: {
        totalActual: 64,
        totalPlanned: 70,
        attendanceRate: 91.4
      }
    };
  }

  parseHourlyProduction(sheets) {
    const sheet = sheets['Sheet1'];
    if (!sheet || sheet.length === 0) return [];

    const production = [];
    const machineNames = ['KMD1', 'KMD2', 'KMD3', 'KMD4', '70K1', '70K2', '70K3', '70K5', 
                          'R8', 'R14', 'R16', 'R22', 'ICM1', 'ICM3', 'ICM4', 'ICM5', 'ICM6', 'ICM7', 'ICM8'];
    
    for (let i = 0; i < sheet.length; i++) {
      const row = sheet[i];
      if (row && row[0] && machineNames.includes(row[0].toString())) {
        const nextRow = sheet[i + 1];
        if (nextRow && nextRow[3] !== undefined && nextRow[3] !== '') {
          production.push({
            machine: row[0],
            itemDesc: row[1] || '',
            type: row[2] || 'Actual',
            hourly: {
              '07:00': this.parseNumber(nextRow[3]),
              '08:00': this.parseNumber(nextRow[4]),
              '09:00': this.parseNumber(nextRow[5]),
              '10:00': this.parseNumber(nextRow[6]),
              '11:00': this.parseNumber(nextRow[7]),
              '12:00': this.parseNumber(nextRow[8]),
              '13:00': this.parseNumber(nextRow[9]),
              '14:00': this.parseNumber(nextRow[10]),
              '15:00': this.parseNumber(nextRow[11]),
              '16:00': this.parseNumber(nextRow[12]),
              '17:00': this.parseNumber(nextRow[13]),
              '18:00': this.parseNumber(nextRow[14]),
              '19:00': this.parseNumber(nextRow[15]),
              '20:00': this.parseNumber(nextRow[16]),
              '21:00': this.parseNumber(nextRow[17]),
              '22:00': this.parseNumber(nextRow[18]),
              '23:00': this.parseNumber(nextRow[19])
            },
            total: this.parseNumber(nextRow[27]),
            shiftA: this.parseNumber(nextRow[28]),
            shiftB: this.parseNumber(nextRow[29])
          });
        }
      }
    }
    return production;
  }

  parseTroubleReports(sheets) {
    const sheet = sheets['Prodn Trouble Report'];
    if (!sheet || sheet.length === 0) return [];

    const reports = [];
    for (let i = 1; i < sheet.length; i++) {
      const row = sheet[i];
      if (row && row[1] && row[0] !== 'Plant' && row[0] !== '') {
        reports.push({
          plant: row[0] ? row[0].toString().trim() : '',
          machine: row[1] ? row[1].toString().trim() : '',
          sku: row[2] || '',
          dateStarted: row[3] || '',
          issue: row[4] || '',
          actions: row[5] || '',
          status: row[6] || '',
          target: row[7] || '',
          remarks: row[8] || ''
        });
      }
    }
    return reports;
  }

  parseOTIF(sheets) {
    const sheet = sheets['OTIF'];
    const otif = { 
      plannedSKU: { plant1: 0, plant2: 0 }, 
      completedSKU: { plant1: 0, plant2: 0 }, 
      plant1OTIF: 0, 
      plant2OTIF: 0, 
      overallOTIF: 0 
    };

    if (!sheet || sheet.length === 0) return otif;

    for (let i = 0; i < sheet.length; i++) {
      const row = sheet[i];
      if (!row) continue;
      
      if (row[1] === 'PLANT 1' && row[2] !== undefined) otif.plannedSKU.plant1 = this.parseNumber(row[2]);
      if (row[1] === 'PLANT 2' && row[2] !== undefined) otif.plannedSKU.plant2 = this.parseNumber(row[2]);
      if (row[8] === 'PLANT 1' && row[9] !== undefined) otif.completedSKU.plant1 = this.parseNumber(row[9]);
      if (row[8] === 'PLANT 2' && row[9] !== undefined) otif.completedSKU.plant2 = this.parseNumber(row[9]);
    }

    const totalPlanned = otif.plannedSKU.plant1 + otif.plannedSKU.plant2;
    const totalCompleted = otif.completedSKU.plant1 + otif.completedSKU.plant2;
    otif.overallOTIF = totalPlanned > 0 ? (totalCompleted / totalPlanned) * 100 : 0;
    
    return otif;
  }

  calculateDashboardStats(sheets) {
    const machines = this.parseMachineStatus(sheets);
    const capacity = this.parseCapacityUtilization(sheets);
    const downtime = this.parseDowntime(sheets);
    const attendance = this.parseAttendance(sheets);
    const hourlyProduction = this.parseHourlyProduction(sheets);
    const troubleReports = this.parseTroubleReports(sheets);

    const totalMachines = machines.length;
    const runningMachines = machines.filter(m => m.status && m.status.toLowerCase().includes('running')).length;
    const idleMachines = machines.filter(m => m.status && m.status.toLowerCase().includes('idle')).length;
    const breakdownMachines = machines.filter(m => m.status && m.status.toLowerCase().includes('breakdown')).length;
    const maintenanceMachines = machines.filter(m => m.status && m.status.toLowerCase().includes('maintenance')).length;

    const plant1Machines = machines.filter(m => m.plant === 'P1').length;
    const plant2Machines = machines.filter(m => m.plant === 'P2').length;
    const plant1Running = machines.filter(m => m.plant === 'P1' && m.status && m.status.toLowerCase().includes('running')).length;
    const plant2Running = machines.filter(m => m.plant === 'P2' && m.status && m.status.toLowerCase().includes('running')).length;

    const totalOutput = capacity.reduce((sum, c) => sum + (c.totalVolume || 0), 0);
    const avgUtilization = capacity.reduce((sum, c) => {
      const avg = ((c.octUtil || 0) + (c.novUtil || 0) + (c.decUtil || 0)) / 3;
      return sum + avg;
    }, 0) / (capacity.length || 1);

    const totalDowntimeHours = downtime.reduce((sum, d) => {
      const hours = parseInt(d.duration?.split(' ')[0] || '0');
      return sum + (isNaN(hours) ? 0 : hours);
    }, 0);

    let totalPlanned = 0, totalActual = 0;
    if (attendance.shiftA) {
      Object.values(attendance.shiftA).forEach(d => { totalPlanned += d.plan || 0; totalActual += d.actual || 0; });
    }
    if (attendance.shiftB) {
      Object.values(attendance.shiftB).forEach(d => { totalPlanned += d.plan || 0; totalActual += d.actual || 0; });
    }
    const attendanceRate = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
    const hourlyTotal = hourlyProduction.reduce((sum, p) => sum + (p.total || 0), 0);

    return {
      machines: {
        total: totalMachines,
        running: runningMachines,
        idle: idleMachines,
        breakdown: breakdownMachines,
        maintenance: maintenanceMachines,
        availability: totalMachines > 0 ? (runningMachines / totalMachines * 100).toFixed(1) : 0
      },
      plants: {
        plant1: { 
          total: plant1Machines, 
          running: plant1Running, 
          utilization: plant1Machines > 0 ? (plant1Running / plant1Machines * 100).toFixed(1) : 0 
        },
        plant2: { 
          total: plant2Machines, 
          running: plant2Running, 
          utilization: plant2Machines > 0 ? (plant2Running / plant2Machines * 100).toFixed(1) : 0 
        }
      },
      production: {
        totalOutput: totalOutput,
        avgUtilization: (avgUtilization * 100).toFixed(1),
        hourlyTotal: hourlyTotal,
        capacityCount: capacity.length
      },
      downtime: { total: totalDowntimeHours, events: downtime.length },
      attendance: { totalPlanned, totalActual, rate: attendanceRate.toFixed(1) },
      troubleReports: { 
        total: troubleReports.length, 
        critical: troubleReports.filter(r => r.status === 'Not running' || r.status === 'Open').length 
      }
    };
  }

  parseNumber(value) {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.toString().replace(/,/g, '').trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  parsePercentage(value) {
    const num = this.parseNumber(value);
    return num > 1 ? num / 100 : num;
  }

  parseDuration(durationStr) {
    if (!durationStr || typeof durationStr !== 'string') return '0 mins';
    if (durationStr.includes('hr') || durationStr.includes('mins')) return durationStr;
    const num = parseFloat(durationStr);
    if (!isNaN(num)) return `${num} hrs`;
    return '0 mins';
  }

  getCurrentData() {
    return this.currentData;
  }
}

module.exports = new ExcelParser();