const express = require('express')
const router = express.Router()

router.post('/initial-call', () => {
  return {
    ANIME: {
      initialCall: () => 'anime/initial-call', //initial call of anime
      recentRelese: () => 'anime/content-listing',
      latestEpisodes: () => 'anime/content-listing',
      romance: () => 'anime/content-listing',
      movies: () => 'anime/content-listing',
      dub: () => 'anime/content-listing',
      upcoming: () => 'anime/content-listing',
      top10: () => 'anime/content-listing',
      searchAnime: () => 'anime/search-anime',
      getContentById: () => 'anime/content-by-Id',
    },
    PROJECT: {
      initialCall: () => 'm',
    },
    USER: {
      initialCall: () => 'user/app-first-call',
      socialSignin: () => 'user/social-signin',
      logout: () => 'user/logout',
      isValidUsername: () => 'user/isValidUsername',
      searchByusername: () => 'user/searchByusername',
      socialSignin: () => 'user/social-signin',
    },
  }
})

module.exports = router
