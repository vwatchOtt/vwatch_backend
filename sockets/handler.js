const {
  onConnect,
  onDisconnect,
  screenNameUpdates,
  messageEvent,
  triggerMyStatusToMyFriends,
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
      callback({ success: true, status: 'sent' })
      messageEvent(io, conversationId, message)
    }
  )
  socket.on('typing-status', ({ reciever, conversationId }) => {
    manageTyping(io, socket, reciever, conversationId)
  })
}

module.exports = {
  circuitListener,
}
