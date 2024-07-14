const express = require('express')
// const Auth = require('../utility/middleware')
const { Joi, celebrate } = require('celebrate')

const {
  homeScreen,
  searchAnime,
  contentById,
  fetchWatchHistory,
  watchHistory,
  getFinishedContents,
} = require('../controller/anime')
const { verifyToken } = require('../utility/middleware')
const router = express.Router()

router.post(
  '/content-listing',
  celebrate({
    body: Joi.object().keys({
      filter: Joi.string().required(),
      page: Joi.number().min(0).max(999999).required(),
    }),
  }),
  verifyToken,
  homeScreen
)

router.post(
  '/search-anime',
  celebrate({
    body: Joi.object().keys({
      search: Joi.string().required(),
      page: Joi.number().min(0).required(),
    }),
  }),
  verifyToken,

  searchAnime
)
router.post(
  '/content-by-Id',
  celebrate({
    body: Joi.object().keys({
      contentId: Joi.string().required(),
    }),
  }),
  verifyToken,
  contentById
)
router.get('/watch-history', verifyToken, fetchWatchHistory)
router.post('/watch-history', verifyToken, watchHistory)
router.get('/finished-content', verifyToken, getFinishedContents)

module.exports = router
