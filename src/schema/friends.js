const mongoose = require('mongoose')

// Define the friend schema
const friendSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    friend: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    conversationId: String,
    status: {
      type: String,
      enum: ['pending', 'waiting-for-acceptance', 'accepted', 'rejected'],
    },
  },
  {
    timestamps: true,
  }
)

// Create the friend model
const Friends = mongoose.model('Friend', friendSchema)

module.exports = Friends
