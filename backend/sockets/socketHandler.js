/**
 * Socket.IO Handler
 * Manages real-time socket connections and channel routing.
 */
const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    // Join room based on user ID for personal notifications
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.join(userId);
        console.log(`User socket joined personal room: ${userId}`);
      }
    });

    // Join room based on ticket ID for ticket-specific comment streams
    socket.on('join_ticket', (ticketId) => {
      if (ticketId) {
        socket.join(ticketId);
        console.log(`Socket joined ticket room: ${ticketId}`);
      }
    });

    // Leave ticket room
    socket.on('leave_ticket', (ticketId) => {
      if (ticketId) {
        socket.leave(ticketId);
        console.log(`Socket left ticket room: ${ticketId}`);
      }
    });

    // Handle Client comment addition directly (fallback/alternative to REST comment triggers)
    socket.on('new_comment_posted', (data) => {
      // Broadcast to other users listening to this ticket room
      socket.to(data.ticketId).emit('comment_received', data);
    });

    // Handle disconnects
    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });
};

module.exports = socketHandler;
