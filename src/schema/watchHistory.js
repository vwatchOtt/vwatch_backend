const mongoose = require('mongoose')

const watchHistorySchema = new mongoose.Schema(
  {
    contentId: String,
    userId: {
      type: mongoose.Types.ObjectId,
      ref: 'users',
    },
    history: [
      {
        episodeId: String,
        episodeNumber: Number,
        lastDuration: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
)
const watchHistory = new mongoose.model('watchHistory', watchHistorySchema)

module.exports = watchHistory
