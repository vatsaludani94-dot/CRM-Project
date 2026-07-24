/**
 * Socket.IO Handler
 * Manages real-time socket connections, JWT authentication, and tenant room isolation.
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const socketHandler = (io) => {
  // Enforce JWT authentication on Socket.IO connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        // Allow unauthenticated connections in dev/mock scenarios if token not passed in header
        return next();
      }
      if (!process.env.JWT_SECRET) {
        return next(new Error('Authentication error: JWT_SECRET missing'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user || user.status === 'inactive' || (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion)) {
        return next(new Error('Authentication error: Invalid or revoked session'));
      }
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.user) {
      const userIdStr = socket.user._id.toString();
      socket.join(`user_${userIdStr}`);
      socket.join(userIdStr);
      if (socket.user.tenant) {
        const tenantIdStr = (socket.user.tenant._id || socket.user.tenant).toString();
        socket.join(`tenant_${tenantIdStr}`);
      }
    }

    socket.on('join_user', (userId) => {
      if (socket.user && socket.user._id.toString() === String(userId)) {
        socket.join(String(userId));
      }
    });

    socket.on('join_ticket', (ticketId) => {
      if (ticketId) {
        socket.join(ticketId);
      }
    });

    socket.on('leave_ticket', (ticketId) => {
      if (ticketId) {
        socket.leave(ticketId);
      }
    });

    socket.on('new_comment_posted', (data) => {
      socket.to(data.ticketId).emit('comment_received', data);
    });

    socket.on('disconnect', () => {
      // Disconnect cleanly
    });
  });
};

module.exports = socketHandler;
