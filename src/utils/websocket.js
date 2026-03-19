const socketio = require('socket.io');

let io;

const initializeSocket = (server) => {
  io = socketio(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join user to their personal room
    socket.on('join', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Handle messages
    socket.on('send_message', (data) => {
      // Send to specific user
      if (data.recipientId) {
        io.to(`user_${data.recipientId}`).emit('new_message', data);
      }
      // Send to room
      if (data.room) {
        io.to(data.room).emit('message', data);
      }
    });

    // Handle notifications
    socket.on('send_notification', (data) => {
      io.to(`user_${data.userId}`).emit('notification', data);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO,
};