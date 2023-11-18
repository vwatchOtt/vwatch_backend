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
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    bondId: String,
  },
  {
    timestamps: true,
  }
)

// Create the friend model
const Friends = mongoose.model('Friend', friendSchema)

module.exports = Friends
