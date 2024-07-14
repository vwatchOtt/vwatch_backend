const {
  onConnect,
  onDisconnect,
  screenNameUpdates,
  messageEvent,
  manageTyping,
  // onBackground,
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
  socket.on('roomUpdates', ({ roomId, userId, value, type }) => {
    if (type == 'reaction') {
      io.to(roomId).emit('room-events', { userId, value, type })
    } else {
      socket.broadcast.to(roomId).emit('room-events', { userId, value, type })
    }
  })
  // socket.on('on-background', () => {
  //   onBackground(socket, io)
  // })
  socket.on('reconnect', (attemptNumber) => {
    console.log('Reconnected to server after', attemptNumber, 'attempts')
  })

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('Reconnection attempt', attemptNumber)
  })

  socket.on('reconnecting', (attemptNumber) => {
    console.log('Reconnecting to server, attempt', attemptNumber)
  })

  socket.on('reconnect_error', (error) => {
    console.error('Reconnection error:', error)
  })

  socket.on('reconnect_failed', () => {
    console.error('Reconnection failed')
  })
}

module.exports = {
  circuitListener,
}
