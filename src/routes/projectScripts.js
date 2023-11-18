const express = require('express')
const router = express.Router()
const { updateIncompleteAnime } = require('../../crons/animeOngoingUpdate')
const { verifyAdmin } = require('../utility/middleware')
const { updateMyAnimeList } = require('../../crons/animeDetailsUpdate')
const { animeFilterAdder } = require('../../crons/animeFiltersUpdater')
const { yearlyAnimeUpdater } = require('../../crons/animeYearlyUpdates')
const { Joi, celebrate } = require('celebrate')
const {
  mergeFreshAnimeWithMyAnimeList,
} = require('../../crons/mergeWithMyanimeList')

router.post(
  '/update-incomplete-anime',
  celebrate({
    body: Joi.object().keys({
      limitPrRound: Joi.number().min(1).required(),
    }),
  }),
  verifyAdmin,
  updateIncompleteAnime
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
  '/yearly-anime-updater',
  celebrate({
    body: Joi.object().keys({
      year: Joi.number().min(1900).required(),
      limit: Joi.number().min(10).required(),
    }),
  }),
  verifyAdmin,
  yearlyAnimeUpdater
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
