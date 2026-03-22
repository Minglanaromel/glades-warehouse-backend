// src/routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getMessages,
  getMessageById,
  sendMessage,
  markAsRead,
  deleteMessage,
  getUnreadCount,
  getConversations,
  replyToMessage
} = require('../controllers/messageController');

// All routes require authentication
router.use(protect);

// Message endpoints
router.get('/', getMessages);
router.get('/unread/count', getUnreadCount);
router.get('/conversations', getConversations);
router.get('/:id', getMessageById);
router.post('/', sendMessage);
router.post('/:id/reply', replyToMessage);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteMessage);

module.exports = router;