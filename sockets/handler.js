const {
  onConnect,
  onDisconnect,
  screenNameUpdates,
  messageEvent,
  manageTyping,
} = require('./socketOperations')

const circuitListener = (socket, io) => {
  onConnect(socket, io)

  socket.on('disconnect', () => {
    onDisconnect(socket, io)
  })
  socket.on('screen-name-updates', ({ lastScreen }) => {
    screenNameUpdates(socket, io, lastScreen)
  })
  socket.on(
    'one-to-one-chat',
    async ({ message, conversationId }, callback) => {
      message.timestamp = new Date()
      callback({
        success: true,
        status: 'sent',
        timestamp: new Date().toISOString(),
      })
      messageEvent(io, socket, conversationId, message)
    }
  )
  socket.on('typing-status', ({ reciever, conversationId }) => {
    manageTyping(io, socket, reciever, conversationId)
  })
  socket.on('joinRoom', ({ roomId, userId }) => {
    console.log(`User ${userId} joined room (${roomId})`)
    socket.join(roomId) // Join the user to the room
  })
  socket.on('leaveRoom', ({ roomId, userId }) => {
    console.log(`User ${userId} left room ${roomId}`)
    socket.leave(roomId) // Leave the room
  })
  socket.on('roomUpdates', ({ roomId, userId, duration, reactionText }) => {
    console.log(reactionText)
    if (reactionText) {
      io.to(roomId).emit('room-events', { userId, reactionText })
    } else {
      socket.broadcast
        .to(roomId)
        .emit('room-events', { userId, duration, reactionText })
    }
  })
}

module.exports = {
  circuitListener,
}
