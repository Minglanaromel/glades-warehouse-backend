const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, '../data/users.json');

// Load users from JSON file
const loadUsers = () => {
  try {
    if (fs.existsSync(usersFilePath)) {
      const data = fs.readFileSync(usersFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  return [];
};

// Save users to JSON file
const saveUsers = (users) => {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving users:', error);
    return false;
  }
};

// Find user by ID - Convert both to string for comparison
const findUserById = (id) => {
  const users = loadUsers();
  return users.find(u => String(u.id) === String(id));
};

// Find user by email
const findUserByEmail = (email) => {
  const users = loadUsers();
  return users.find(u => u.email === email);
};

// Find user by username
const findUserByUsername = (username) => {
  const users = loadUsers();
  return users.find(u => u.username === username);
};

// Main protect middleware
const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user by ID
      const user = findUserById(decoded.id);
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Check if user is active
      if (user.isActive === false) {
        return res.status(401).json({ 
          success: false, 
          message: 'Account is disabled. Please contact administrator.' 
        });
      }
      
      // Remove password from user object
      const { password, ...userWithoutPassword } = user;
      req.user = userWithoutPassword;
      
      next();
    } catch (error) {
      console.error('Auth error:', error);
      res.status(401).json({ 
        success: false, 
        message: 'Not authorized, token failed' 
      });
    }
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Not authorized, no token' 
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Role ${req.user.role} is not authorized to access this route` 
      });
    }
    next();
  };
};

// Admin middleware (alias for authorize('admin'))
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      message: 'Not authorized as admin' 
    });
  }
};

// Check if user has permission for specific resource
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    const permissions = {
      admin: ['*'],
      manager: ['view_dashboard', 'view_machines', 'view_attendance', 'upload_excel', 'manage_stock'],
      supervisor: ['view_dashboard', 'view_machines', 'view_attendance', 'update_stock'],
      user: ['view_dashboard', 'view_machines']
    };
    
    const userPermissions = permissions[userRole] || [];
    
    if (userPermissions.includes('*') || userPermissions.includes(`${action}_${resource}`)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: `You don't have permission to ${action} ${resource}`
      });
    }
  };
};

module.exports = { 
  protect, 
  authorize,
  admin,
  checkPermission,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  loadUsers,
  saveUsers
};