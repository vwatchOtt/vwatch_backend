const mongoose = require('mongoose')

const roomSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
    },
    joiner: [
      {
        user: {
          type: mongoose.Types.ObjectId,
          ref: 'users',
        },
        status: {
          type: String,
          enum: ['Pending', 'Ready', 'Watching', 'Left'],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
)
const Rooms = new mongoose.model('rooms', roomSchema)

module.exports = Rooms
