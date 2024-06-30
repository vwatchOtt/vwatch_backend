const mongoose = require('mongoose')

const watchHistorySchema = new mongoose.Schema(
  {
    contentId: String,
    userId: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
    },
    status: {
      type: String,
      enum: ['in-progress', 'finished'],
    },
    lastWatched: Number,
    history: [
      {
        episodeId: String,
        episodeNumber: Number,
        lastDuration: Number,
        totalDuration: Number,
        finsihedPercentage: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
)
const watchHistory = new mongoose.model('watchhistories', watchHistorySchema)

module.exports = watchHistory
