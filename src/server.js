const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');

const { connectDB } = require('./config/database');
const { PORT, NODE_ENV, CLIENT_URL, CLIENT_URL_ALT } = require('./config/env');
const errorHandler = require('./middleware/errorMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
// ✅ ADD THIS LINE - Excel routes
const excelRoutes = require('./routes/excelRoutes');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

// CORS configuration - Allow multiple origins
const allowedOrigins = [CLIENT_URL, CLIENT_URL_ALT, 'http://localhost:3000', 'http://localhost:3001'];

// Middleware
app.use(helmet());
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// ✅ ADD THIS LINE - Mount Excel routes
app.use('/api/excel', excelRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    environment: NODE_ENV,
    database: 'MySQL Connected',
    // ✅ Optional: Add excel route to health check
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      excel: '/api/excel'
    }
  });
});

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.url} not found` });
});

server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log('📋 Available routes:');
  console.log('   - /api/auth');
  console.log('   - /api/users');
  console.log('   - /api/excel ✅'); // Added Excel route to console log
  console.log('='.repeat(50));
});

process.on('unhandledRejection', (err) => {
  console.log('❌ UNHANDLED REJECTION:', err);
  server.close(() => process.exit(1));
});