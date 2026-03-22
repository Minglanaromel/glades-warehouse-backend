// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { 
  getUsers, 
  getUserById, 
  createUser,
  updateUser, 
  deleteUser,
  toggleUserActive,
  getUserStats,
  bulkUpdateUsers
} = require('../controllers/userController');

// All user routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// CRUD operations
router.get('/', getUsers);
router.get('/stats', getUserStats);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/toggle', toggleUserActive);
router.post('/bulk', bulkUpdateUsers);

module.exports = router;