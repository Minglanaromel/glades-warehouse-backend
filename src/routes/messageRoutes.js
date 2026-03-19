const express = require('express');
const router = express.Router();
const {
  getMessages,
  getMessageById,
  sendMessage,
  deleteMessage,
  getUnreadCount,
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getMessages)
  .post(protect, sendMessage);

router.get('/unread/count', protect, getUnreadCount);

router.route('/:id')
  .get(protect, getMessageById)
  .delete(protect, deleteMessage);

module.exports = router;