const mongoose = require('mongoose')

const contentSchema = new mongoose.Schema(
  {
    contentId: { type: String, unique: true },
    description: String,
    title: String,
    releaseDate: String,
    type: String,
    age: String,
    isMovie: {
      type: Boolean,
      default: false,
    },
    languages: [],
    categories: [],
    imageInfo: [],
    trailer: [],
    totalSeasons: Number,
    videosCount: Number,
    stream: {},
    seasons: [
      {
        title: String,
        episodeCount: Number,
        id: String,
        episodes: [{}],
      },
    ],
    fetchedFrom: {
      type: String,
      default: 'mx',
    },
  },
  {
    timestamps: true,
  }
)
const Bhws = new mongoose.model('bhws', contentSchema)

module.exports = Bhws
