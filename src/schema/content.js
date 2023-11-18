const mongoose = require('mongoose')
require('../../connections/db')

const contentSchema = new mongoose.Schema(
  {
    filters: [
      {
        title: {
          type: String,
          enum: [
            'latestEpisodes',
            'topAiring',
            'popularAnime',
            'newMovies',
            'newSeason',
          ],
        },
        sorting: Number,
      },
    ],
    contentId: { type: String, unique: true, required: true },
    title: String,
    type: String,
    releasedYear: String,
    status: {
      type: String,
      enum: ['ongoing', 'upcoming', 'completed'],
    },
    categories: [],
    otherTitle: String,
    description: String,
    image: String,
    latestEpisode: String,
    isMovie: {
      type: Boolean,
      default: false,
    },
    defaultStreamingUrl: String,
    permanentStreamingUrl: String,
    episodes: [],
    currentLang: {
      type: String,
    },
    myAnimeListId: String,
    myAnimeListDescription: String, //It's a title of anime .
    airedAt: String,
    rating: String,
    trailers: [],
    broadcast: String,
    popularity: String,
    ranked: String,
    duration: String,
    source: String,
    studios: String,
    licensors: String,
    producer: String,
    actors: [],
    director: String,
    otherImage: String,
    fetchedFrom: {
      type: String,
      enum: ['mx', 'gogoanime'],
    },
  },
  {
    timestamps: true,
  }
)
contentSchema.path('filters').default([])
const Content = new mongoose.model('contents', contentSchema)

module.exports = Content
