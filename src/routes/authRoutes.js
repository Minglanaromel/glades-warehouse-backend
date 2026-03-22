// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.register);

// Protected routes
router.get('/me', protect, authController.getMe);
router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);
router.put('/change-password', protect, authController.changePassword);

// Admin only routes
router.get('/users', protect, authorize('admin'), authController.getUsers);
router.get('/users/:id', protect, authorize('admin'), authController.getUserById);
router.put('/users/:id', protect, authorize('admin'), authController.updateUser);
router.delete('/users/:id', protect, authorize('admin'), authController.deleteUser);
router.patch('/users/:id/toggle', protect, authorize('admin'), authController.toggleUserActive);

module.exports = router;