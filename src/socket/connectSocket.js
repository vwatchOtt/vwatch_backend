const Messages = require('../schema/chats')

const onConnectUser = (socket) => {
  console.log('connected')
}
const onJoin = (socket, chatId) => {
  socket.join(chatId)

  console.log('joined')
}
const onMessage = (data) => {
  const { text, senderId, chatId } = data
  console.log('onMessage')

  Messages.create({
    text,
    senderId,
    chatId,
  })
}
module.exports = {
  onConnectUser,
  onJoin,
  onMessage,
}
