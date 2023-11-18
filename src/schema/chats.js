const mongoose = require('mongoose')

const chatSchema = new mongoose.Schema(
  {
    text: String,
    sender: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
    },
    chatId: String,
  },
  {
    timestamps: true,
  }
)
const Messages = new mongoose.model('messages', chatSchema)

module.exports = Messages
