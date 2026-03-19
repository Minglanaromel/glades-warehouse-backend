const Message = require('../models/Message');
const { getIO } = require('../utils/websocket');

// @desc    Get all messages for user
// @route   GET /api/messages
// @access  Private
const getMessages = async (req, res) => {
  try {
    const pageSize = 20;
    const page = Number(req.query.page) || 1;
    
    const filter = {
      recipients: req.user._id,
      isDeleted: false
    };

    const count = await Message.countDocuments(filter);
    const messages = await Message.find(filter)
      .populate('sender', 'name email')
      .populate('recipients', 'name email')
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({
      messages,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
      unread: messages.filter(m => {
        const readEntry = m.isRead.find(r => r.user.toString() === req.user._id.toString());
        return !readEntry;
      }).length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get message by ID
// @route   GET /api/messages/:id
// @access  Private
const getMessageById = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('sender', 'name email')
      .populate('recipients', 'name email')
      .populate('isRead.user', 'name email');
    
    if (message) {
      // Mark as read if user is recipient
      if (message.recipients.some(r => r._id.toString() === req.user._id.toString())) {
        const readEntry = message.isRead.find(r => r.user.toString() === req.user._id.toString());
        if (!readEntry) {
          message.isRead.push({
            user: req.user._id,
            readAt: new Date()
          });
          await message.save();
          
          // Notify sender that message was read
          const io = getIO();
          io.to(`user_${message.sender._id}`).emit('message_read', {
            messageId: message._id,
            userId: req.user._id,
            readAt: new Date()
          });
        }
      }
      
      res.json(message);
    } else {
      res.status(404).json({ message: 'Message not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { recipients, subject, content } = req.body;

    const message = await Message.create({
      sender: req.user._id,
      recipients,
      subject,
      content,
      isRead: []
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email')
      .populate('recipients', 'name email');

    // Send real-time notification via socket
    const io = getIO();
    recipients.forEach(recipientId => {
      io.to(`user_${recipientId}`).emit('new_message', populatedMessage);
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete message (soft delete)
// @route   DELETE /api/messages/:id
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (message) {
      // Only sender or recipient can delete
      if (message.sender.toString() === req.user._id.toString() || 
          message.recipients.some(r => r.toString() === req.user._id.toString())) {
        message.isDeleted = true;
        await message.save();
        res.json({ message: 'Message deleted' });
      } else {
        res.status(403).json({ message: 'Not authorized to delete this message' });
      }
    } else {
      res.status(404).json({ message: 'Message not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get unread count
// @route   GET /api/messages/unread/count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const messages = await Message.find({
      recipients: req.user._id,
      isDeleted: false
    });

    const unreadCount = messages.filter(m => {
      const readEntry = m.isRead.find(r => r.user.toString() === req.user._id.toString());
      return !readEntry;
    }).length;

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMessages,
  getMessageById,
  sendMessage,
  deleteMessage,
  getUnreadCount,
};