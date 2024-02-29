const Friends = require('../src/schema/friends')

const connectedUsers = new Map()

const myFriends = async (myUserId) => {
  const friends = await Friends.find(
    {
      user: myUserId,
      status: 'accepted',
    },
    {
      friend: 1,
    }
  ).lean(true)
  return friends
}

const triggerMyStatusToMyFriends = async (myUserId, isOnline, io) => {
  const friends = await myFriends(myUserId)
  friends.map(({ friend }) => {
    const friendSocketId = connectedUsers.get(friend.toString())
    if (friendSocketId) {
      io.to(friendSocketId).emit('status-update', {
        myUserId,
        isOnline: isOnline,
      })
    }
  })
}
const circuitListener = (socket, io) => {
  connectedUsers.set(socket.userData?._id.toString(), socket.id)
  triggerMyStatusToMyFriends(socket.userData?._id.toString(), 'online', io)
  console.log('User Connected', connectedUsers)

  //   socket.on('message', ({ room, message }) => {
  //     console.log({ room, message })
  //     socket.to(room).emit('receive-message', message)
  //   })

  //   socket.on('join-room', (room) => {
  //     socket.join(room)
  //     console.log(`User joined room ${room}`)
  //   })

  socket.on('disconnect', () => {
    connectedUsers.delete(socket.userData?._id)
    triggerMyStatusToMyFriends(socket.userData?._id.toString(), 'offline', io)
    console.log('User Disconnected', socket.id)
  })
  socket.on('one-to-one-chat', ({ message, conversationId }, callback) => {
    const socketId = connectedUsers.get(message.reciever) // Corrected variable name
    if (socketId) {
      io.to(socketId).emit('listen-one-to-one-messages', {
        message,
        conversationId,
      })
    }
    callback({ success: true, status: 'sent' })
  })
}

module.exports = {
  circuitListener,
  connectedUsers,
}
