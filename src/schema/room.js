const mongoose = require('mongoose')

const roomSchema = new mongoose.Schema(
  {
    roomId: String,
    creator: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
    },
    type: {
      type: String,
      enum: ['custom', 'internal'],
    },
    duration: { type: Number, default: 0 },
    content: Object,
    participant: [
      {
        type: mongoose.Types.ObjectId,
        ref: 'users',
      },
    ],
  },
  {
    timestamps: true,
  }
)
const Rooms = new mongoose.model('rooms', roomSchema)

module.exports = Rooms
