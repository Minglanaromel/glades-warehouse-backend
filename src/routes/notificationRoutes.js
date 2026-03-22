// src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  createNotification
} = require('../controllers/notificationController');

// All routes require authentication
router.use(protect);

// Notification endpoints
router.get('/', getNotifications);
router.get('/unread/count', getUnreadCount);
router.get('/:id', getNotificationById);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);
router.post('/', createNotification);

module.exports = router;