// src/server.js - Comment out CCTV routes temporarily
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const excelRoutes = require('./routes/excelRoutes');
const userRoutes = require('./routes/userRoutes');
const stockItemRoutes = require('./routes/stockItemRoutes');
// Comment out CCTV and other routes that require mongoose
// const cctvRoutes = require('./routes/cctvRoutes');
// const customerRoutes = require('./routes/customerRoutes');
// const messageRoutes = require('./routes/messageRoutes');
// const notificationRoutes = require('./routes/notificationRoutes');
// const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
// const reportRoutes = require('./routes/reportRoutes');
// const salesOrderRoutes = require('./routes/salesOrderRoutes');
// const supplierRoutes = require('./routes/supplierRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// Ensure data directories exist
const ensureDirectories = () => {
  const dirs = [
    path.join(__dirname, 'data'),
    path.join(__dirname, 'data/users'),
    path.join(__dirname, 'data/stock'),
    path.join(__dirname, 'data/excel'),
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads/excel'),
    path.join(__dirname, 'uploads/images'),
    path.join(__dirname, 'uploads/documents')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

ensureDirectories();

// Initialize data files if they don't exist
const initializeDataFiles = () => {
  const files = {
    'data/users.json': [],
    'data/stock/items.json': [],
    'data/excel-data.json': JSON.stringify({
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
      lastUpdate: new Date().toISOString()
    }, null, 2)
  };
  
  Object.entries(files).forEach(([file, defaultData]) => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, defaultData);
      console.log(`Created file: ${file}`);
    }
  });
};

initializeDataFiles();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => req.path === '/api/health' || req.path === '/api/test'
});
app.use('/api/', limiter);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Make io and uploads path available to routes
app.use((req, res, next) => {
  req.io = io;
  req.uploadPath = path.join(__dirname, 'uploads');
  next();
});

// Routes - Commented out routes that require mongoose
console.log('📡 Mounting routes...');
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stock-items', stockItemRoutes);
// app.use('/api/cctv', cctvRoutes);
// app.use('/api/customers', customerRoutes);
// app.use('/api/messages', messageRoutes);
// app.use('/api/notifications', notificationRoutes);
// app.use('/api/purchase-orders', purchaseOrderRoutes);
// app.use('/api/reports', reportRoutes);
// app.use('/api/sales-orders', salesOrderRoutes);
// app.use('/api/suppliers', supplierRoutes);

console.log('✅ Routes mounted:');
console.log('   - /api/auth (login, register, profile)');
console.log('   - /api/dashboard (dashboard stats, machines, attendance)');
console.log('   - /api/excel (upload and get Excel data)');
console.log('   - /api/users (user management)');
console.log('   - /api/stock-items (stock management)');

// Socket.io connection with authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  } else {
    next(new Error('Authentication required'));
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}, User: ${socket.userId}`);
  
  if (socket.userId) {
    socket.join(`user_${socket.userId}`);
  }
  
  socket.on('join-dashboard', () => {
    socket.join('dashboard');
    console.log('Client joined dashboard room');
  });
  
  socket.on('leave-dashboard', () => {
    socket.leave('dashboard');
    console.log('Client left dashboard room');
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'API is working!', 
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: `http://localhost:${PORT}/api/auth`,
      dashboard: `http://localhost:${PORT}/api/dashboard`,
      excel: `http://localhost:${PORT}/api/excel`,
      users: `http://localhost:${PORT}/api/users`,
      stockItems: `http://localhost:${PORT}/api/stock-items`,
      health: `http://localhost:${PORT}/api/health`
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 10MB.'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📁 Data directory: ${path.join(__dirname, 'data')}`);
  console.log(`📁 Uploads directory: ${path.join(__dirname, 'uploads')}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n✅ Server ready!`);
  console.log(`🔗 Test: http://localhost:${PORT}/api/test\n`);
});

module.exports = { app, server, io };