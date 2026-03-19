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

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// ✅ FIX: Increase rate limit for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // 1000 attempts in dev
  message: 'Too many requests from this IP, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
});

// ✅ Add auth-specific limiter (more lenient)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 attempts per hour
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// CORS configuration
const allowedOrigins = [
  CLIENT_URL, 
  CLIENT_URL_ALT, 
  'http://localhost:3000', 
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

// Middleware
app.use(helmet());
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('❌ Blocked origin:', origin);
      return callback(null, false);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting
app.use('/api/', limiter);

// Apply stricter limit to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    environment: NODE_ENV,
    database: 'MySQL Connected',
    rateLimit: 'Adjusted for development'
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
  console.log(`🛡️ Rate limit: ${process.env.NODE_ENV === 'development' ? '1000' : '100'} requests/15min`);
  console.log('='.repeat(50));
});

process.on('unhandledRejection', (err) => {
  console.log('❌ UNHANDLED REJECTION:', err);
  server.close(() => process.exit(1));
});