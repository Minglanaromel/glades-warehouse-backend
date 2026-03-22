// src/controllers/userController.js
const bcrypt = require('bcryptjs');
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

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    let users = loadUsers();
    
    // Apply search filter
    if (search) {
      const searchTerm = search.toLowerCase();
      users = users.filter(user => 
        (user.name && user.name.toLowerCase().includes(searchTerm)) ||
        (user.email && user.email.toLowerCase().includes(searchTerm)) ||
        (user.username && user.username.toLowerCase().includes(searchTerm)) ||
        (user.department && user.department.toLowerCase().includes(searchTerm))
      );
    }
    
    const total = users.length;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedUsers = users.slice(startIndex, endIndex);
    
    const usersWithoutPasswords = paginatedUsers.map(({ password, ...user }) => user);
    
    res.json({
      success: true,
      data: usersWithoutPasswords,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getUsers:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get users'
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
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

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
  try {
    const users = loadUsers();
    const { username, email, password, name, role, department, plant, phone } = req.body;
    
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
    
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      success: true,
      data: userWithoutPassword,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error in createUser:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create user'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
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
    
    // Update user fields
    users[index] = {
      ...users[index],
      name: req.body.name || users[index].name,
      email: req.body.email || users[index].email,
      role: req.body.role || users[index].role,
      department: req.body.department || users[index].department,
      plant: req.body.plant || users[index].plant,
      phone: req.body.phone || users[index].phone,
      isActive: req.body.isActive !== undefined ? req.body.isActive : users[index].isActive,
      updatedAt: new Date().toISOString()
    };
    
    // Update password if provided
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      users[index].password = await bcrypt.hash(req.body.password, salt);
    }
    
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

// @desc    Delete user
// @route   DELETE /api/users/:id
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

// @desc    Toggle user active status
// @route   PATCH /api/users/:id/toggle
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

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private/Admin
const getUserStats = async (req, res) => {
  try {
    const users = loadUsers();
    
    const stats = {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length,
      byRole: {
        admin: users.filter(u => u.role === 'admin').length,
        manager: users.filter(u => u.role === 'manager').length,
        supervisor: users.filter(u => u.role === 'supervisor').length,
        user: users.filter(u => u.role === 'user').length
      },
      byDepartment: {}
    };
    
    // Group by department
    users.forEach(user => {
      const dept = user.department || 'Unassigned';
      stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;
    });
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error in getUserStats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user statistics'
    });
  }
};

// @desc    Bulk update users
// @route   POST /api/users/bulk
// @access  Private/Admin
const bulkUpdateUsers = async (req, res) => {
  try {
    const { users: updates } = req.body;
    
    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format. Expected array of users.'
      });
    }
    
    const existingUsers = loadUsers();
    const updated = [];
    const errors = [];
    
    for (const update of updates) {
      const index = existingUsers.findIndex(u => String(u.id) === String(update.id));
      if (index !== -1) {
        existingUsers[index] = {
          ...existingUsers[index],
          ...update,
          updatedAt: new Date().toISOString()
        };
        updated.push(existingUsers[index].id);
      } else {
        errors.push({ id: update.id, error: 'User not found' });
      }
    }
    
    saveUsers(existingUsers);
    
    res.json({
      success: true,
      updated: updated.length,
      errors,
      message: `Updated ${updated.length} users`
    });
  } catch (error) {
    console.error('Error in bulkUpdateUsers:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to bulk update users'
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserActive,
  getUserStats,
  bulkUpdateUsers
};