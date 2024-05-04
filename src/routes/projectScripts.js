const express = require('express')
const router = express.Router()
const { refreshAnimeUrl } = require('../../crons/refreshAnimeStreamingUrl.js')
const { verifyAdmin } = require('../utility/middleware')
const { updateMyAnimeList } = require('../../crons/animeDetailsUpdate')
const { animeFilterAdder } = require('../../crons/animeFiltersUpdater')
const { scrapeAnimesByPagesScript } = require('../../crons/scrapeAnimePages')
const { Joi, celebrate } = require('celebrate')
const {
  mergeFreshAnimeWithMyAnimeList,
} = require('../../crons/mergeWithMyanimeList')

router.post(
  '/refresh-anime-url',
  celebrate({
    body: Joi.object().keys({
      limitPrRound: Joi.number().min(1).required(),
      start: Joi.number().min(0).required(),
    }),
  }),
  verifyAdmin,
  refreshAnimeUrl
)
router.post(
  '/update-myAnimeList-data',
  celebrate({
    body: Joi.object().keys({
      limitPrRound: Joi.number().min(1).required(),
    }),
  }),
  verifyAdmin,
  updateMyAnimeList
)
router.post(
  '/update-anime-filter-adder',
  celebrate({
    body: Joi.object().keys({
      limit: Joi.number().min(10).required(),
    }),
  }),
  verifyAdmin,
  animeFilterAdder
)
router.post(
  '/scrape-anime-by-pages',
  celebrate({
    body: Joi.object().keys({
      limit: Joi.string().required(),
    }),
  }),
  verifyAdmin,
  scrapeAnimesByPagesScript
)

router.post(
  '/merge-with-myanimelist',
  celebrate({
    body: Joi.object().keys({
      start: Joi.number().min(0).default(0),
      limitPrRound: Joi.number().max(10).default(1),
    }),
  }),
  verifyAdmin,
  mergeFreshAnimeWithMyAnimeList
)

module.exports = router
