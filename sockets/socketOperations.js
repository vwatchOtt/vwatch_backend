const { triggerNotification } = require('../src/utility/helperFunc')
const {
  connectedUsers,
  currentScreens,
  screenNames,
  session,
} = require('./cache')
const { myFriends } = require('./dbOperation')
const NOTI_CATEGORIES = {
  CHATTING: 'chatting',
  ROOM: 'room',
}
/**
 * Notifies the online status and last screen of a user to their friends.
 */
const triggerMyStatusToMyFriends = async (
  myUserId,
  isOnline,
  lastScreen,
  io
) => {
  const friends = await myFriends(myUserId)
  friends.map(({ friend }) => {
    const friendSocketId = connectedUsers.get(friend.toString())
    if (friendSocketId) {
      io.to(friendSocketId).emit('status-update', {
        myUserId,
        isOnline: isOnline,
        lastScreen,
        isTyping: null,
      })
    }
  })
}

/**
 * Sends a message to the specified receiver in a one-to-one conversation.
 * Sets the status of the message to 'sent' and emits the message to the receiver's socket.
 * Waits for acknowledgement from the receiver within 5 seconds and returns the result.
 */
const transferMessageToTheReciever = async (
  socket,
  conversationId,
  message
) => {
  const reciverSocketId =
    message.type == 'one-to-one'
      ? connectedUsers.get(message.reciever)
      : conversationId
  message.status = 'sent'
  const isRecieved = await socket.broadcast
    .timeout(5000)
    .to(reciverSocketId)
    .emitWithAck('listen-one-to-one-messages', {
      message,
      conversationId,
      type: 'add',
    })
  return isRecieved[0]
}

/**
 * Updates the status of a message to 'delivered' and emits an acknowledgement to the sender's socket,
 * indicating that the message was successfully delivered. Returns a boolean value to indicate the success
 * of the operation.
 */
const markAsDelivered = async (conversationId, message, io) => {
  const senderSocketId = connectedUsers.get(message.sender)
  const reciverScreen = currentScreens.get(message.reciever)
  let isRead = false
  if (reciverScreen) {
    const sc = reciverScreen.split('||')[1]
    if (sc == conversationId) {
      isRead = true
    }
  }
  message.status = 'delivered'
  const isMarked = await io
    .timeout(5000)
    .to(senderSocketId)
    .emitWithAck('listen-one-to-one-messages', {
      message,
      conversationId,
      type: 'update',
      isRead,
    })
  return isMarked[0]
}

/**
 * Sets up the initial connection for a user.
 * - Stores the user ID and socket ID in the connectedUsers map.
 * - Sets the lastScreen to the splash screen.
 * - Triggers the status update for the user's friends, indicating that the user is online and on the splash screen.
 * - Logs the connection information.
 */
const onConnect = (socket, io) => {
  connectedUsers.set(socket.userData?._id.toString(), socket.id)
  const lastScreen = currentScreens.get(socket.userData?._id.toString())
  triggerMyStatusToMyFriends(
    socket.userData?._id.toString(),
    'online',
    lastScreen,
    io
  )
  console.log('User Connected', connectedUsers)
}

/**
 * Handles the disconnection event for a socket connection.
 * Removes the user's ID from the connected users list.
 * Removes the user's ID from the current screens list.
 * Retrieves the user's last screen from the current screens list.
 * Triggers the status update to the user's friends with the offline status and last screen.
 * Logs the disconnection event with the socket ID.
 */
const onDisconnect = (socket, io) => {
  connectedUsers.delete(socket.userData?._id.toString())
  const lastScreen = currentScreens.get(socket.userData?._id.toString())
  triggerMyStatusToMyFriends(
    socket.userData?._id.toString(),
    'offline',
    lastScreen,
    io
  )
  console.log('User Disconnected', socket.id)
}

/**
 * Updates the screen name of a user, triggers status changes to user's friends by calling `triggerMyStatusToMyFriends` function,
 * and stores the updated screen name using the `currentScreens` map.
 */
const screenNameUpdates = (socket, io, lastScreen) => {
  currentScreens.set(socket.userData?._id.toString(), lastScreen)
  triggerMyStatusToMyFriends(
    socket.userData?._id.toString(),
    'online',
    lastScreen,
    io
  )
}

/**
 * Transfers the given message to the receiver in the conversation.
 */
const messageEvent = async (io, socket, conversationId, message) => {
  const isRecieved = await transferMessageToTheReciever(
    socket,
    conversationId,
    message
  )

  if (isRecieved) {
    if (message.reciever && currentScreens.get(message.reciever)) {
      let recieverScreen = currentScreens.get(message.reciever).split('||')
      recieverScreen = recieverScreen[1]
      if (recieverScreen != conversationId) {
        triggerNotification({
          channelId: 'default',
          categoryId: NOTI_CATEGORIES.CHATTING,
          sound: 'default',
          to: session[message.reciever].expoToken,
          title: session[message.reciever].username,
          body: message.text,
          data: {
            pageId: conversationId,
            type: 'conversation',
            itemId: message.reciever,
          },
        })
      }
    }
    const markAsDeliver = await markAsDelivered(conversationId, message, io)
    console.log(markAsDeliver)
  }
}

const manageTyping = (io, socket, reciever, conversationId) => {
  const friendSocketId = connectedUsers.get(reciever)
  io.to(friendSocketId).emit('status-update', {
    myUserId: socket.userData?._id.toString(),
    isTyping: conversationId,
    isOnline: 'online',
  })
}
module.exports = {
  triggerMyStatusToMyFriends,
  transferMessageToTheReciever,
  markAsDelivered,
  onConnect,
  onDisconnect,
  screenNameUpdates,
  messageEvent,
  manageTyping,
}
