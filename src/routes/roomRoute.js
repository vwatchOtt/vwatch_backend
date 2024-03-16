const express = require('express')
const { Joi, celebrate } = require('celebrate')
const roomController = require('../controller/room')

const Auth = require('../utility/middleware')

const router = express.Router()

router.post(
  '/createRoom',
  celebrate({
    body: Joi.object().keys({
      type: Joi.string().valid('custom', 'internal').optional(),
      content: Joi.object()
        .keys({
          videoId: Joi.string(),
          contentId: Joi.string(),
          contentName: Joi.string(),
          streamUrl: Joi.string(),
        })
        .optional(),
      user: Joi.string(),
      roomId: Joi.string(),
    }),
  }),
  Auth.verifyToken,
  roomController.createRoom
)
router.get(
  '/myRooms',
  celebrate({
    query: Joi.object().keys({
      createdBy: Joi.string().valid('my', 'others').optional(),
      roomId: Joi.string().optional(),
    }),
  }),
  Auth.verifyToken,
  roomController.myRooms
)

router.post(
  '/kickOutFromRoom',
  celebrate({
    body: Joi.object().keys({
      user: Joi.string().required(),
      roomId: Joi.string().required(),
    }),
  }),
  Auth.verifyToken,
  roomController.kickOutFromRoom
)
module.exports = router
