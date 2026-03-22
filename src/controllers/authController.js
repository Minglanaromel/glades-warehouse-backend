// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const USERS_PATH = path.join(__dirname, '../data/users.json');

// Load users from JSON file
const loadUsers = () => {
  try {
    if (fs.existsSync(USERS_PATH)) {
      const data = fs.readFileSync(USERS_PATH, 'utf8');
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
    fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving users:', error);
    return false;
  }
};

// Find user by ID
const findUserById = (id) => {
  const users = loadUsers();
  return users.find(u => String(u.id) === String(id));
};

// Find user by username or email
const findUserByUsernameOrEmail = (usernameOrEmail) => {
  const users = loadUsers();
  return users.find(u => u.username === usernameOrEmail || u.email === usernameOrEmail);
};

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: String(user.id), 
      email: user.email, 
      username: user.username,
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const loginIdentifier = username || email;
    
    console.log('🔐 Login attempt for:', loginIdentifier);
    
    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username/email and password'
      });
    }
    
    const user = findUserByUsernameOrEmail(loginIdentifier);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if user is active
    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'Account is disabled. Please contact administrator.'
      });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate token
    const token = generateToken(user);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    console.log('✅ Login successful for:', user.email);
    
    res.json({
      success: true,
      data: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to login'
    });
  }
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { username, email, password, name, role = 'user', department, plant, phone } = req.body;
    
    console.log('📝 Register attempt for:', email);
    
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email and password'
      });
    }
    
    const users = loadUsers();
    
    // Check if user exists
    if (users.find(u => u.email === email)) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }
    
    if (users.find(u => u.username === username)) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Generate new ID
    const newId = users.length > 0 ? Math.max(...users.map(u => parseInt(u.id) || 0)) + 1 : 1;
    
    // Create new user
    const newUser = {
      id: newId,
      username,
      email,
      name: name || username,
      password: hashedPassword,
      role: role || 'user',
      department: department || '',
      plant: plant || 'Both',
      phone: phone || '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    users.push(newUser);
    saveUsers(users);
    
    // Generate token
    const token = generateToken(newUser);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    
    console.log('✅ User registered successfully:', email);
    
    res.status(201).json({
      success: true,
      data: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to register user'
    });
  }
};

// @desc    Get user profile (alias for getMe)
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = findUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const { password, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error in getProfile:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get profile'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = findUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const { password, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error in getMe:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const users = loadUsers();
    const index = users.findIndex(u => String(u.id) === String(req.user.id));
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update allowed fields
    const updateData = {
      name: req.body.name || users[index].name,
      phone: req.body.phone || users[index].phone,
      department: req.body.department || users[index].department,
      plant: req.body.plant || users[index].plant,
      updatedAt: new Date().toISOString()
    };
    
    users[index] = { ...users[index], ...updateData };
    saveUsers(users);
    
    const { password, ...userWithoutPassword } = users[index];
    
    res.json({
      success: true,
      data: userWithoutPassword,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error in updateProfile:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile'
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }
    
    const users = loadUsers();
    const index = users.findIndex(u => String(u.id) === String(req.user.id));
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const isPasswordValid = await bcrypt.compare(currentPassword, users[index].password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    const salt = await bcrypt.genSalt(10);
    users[index].password = await bcrypt.hash(newPassword, salt);
    users[index].updatedAt = new Date().toISOString();
    saveUsers(users);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error in changePassword:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to change password'
    });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = loadUsers();
    const usersWithoutPassword = users.map(({ password, ...rest }) => rest);
    
    res.json({
      success: true,
      data: usersWithoutPassword
    });
  } catch (error) {
    console.error('Error in getUsers:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get users'
    });
  }
};

// @desc    Get user by ID (Admin only)
// @route   GET /api/auth/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const users = loadUsers();
    const user = users.find(u => String(u.id) === String(req.params.id));
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const { password, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error in getUserById:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user'
    });
  }
};

// @desc    Update user (Admin only)
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const users = loadUsers();
    const index = users.findIndex(u => String(u.id) === String(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update allowed fields
    const updateData = {
      name: req.body.name || users[index].name,
      email: req.body.email || users[index].email,
      role: req.body.role || users[index].role,
      department: req.body.department || users[index].department,
      plant: req.body.plant || users[index].plant,
      isActive: req.body.isActive !== undefined ? req.body.isActive : users[index].isActive,
      updatedAt: new Date().toISOString()
    };
    
    users[index] = { ...users[index], ...updateData };
    saveUsers(users);
    
    const { password, ...userWithoutPassword } = users[index];
    
    res.json({
      success: true,
      data: userWithoutPassword,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error in updateUser:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user'
    });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const users = loadUsers();
    const filteredUsers = users.filter(u => String(u.id) !== String(req.params.id));
    
    if (filteredUsers.length === users.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    saveUsers(filteredUsers);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete user'
    });
  }
};

// @desc    Toggle user active status (Admin only)
// @route   PATCH /api/auth/users/:id/toggle
// @access  Private/Admin
const toggleUserActive = async (req, res) => {
  try {
    const users = loadUsers();
    const index = users.findIndex(u => String(u.id) === String(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    users[index].isActive = !users[index].isActive;
    users[index].updatedAt = new Date().toISOString();
    saveUsers(users);
    
    const { password, ...userWithoutPassword } = users[index];
    
    res.json({
      success: true,
      data: userWithoutPassword,
      message: `User ${userWithoutPassword.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error in toggleUserActive:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to toggle user status'
    });
  }
};

module.exports = {
  login,
  register,
  getProfile,
  getMe,
  updateProfile,
  changePassword,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserActive
};