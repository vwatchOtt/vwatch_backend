const express = require('express')
const { Joi, celebrate } = require('celebrate')
const userController = require('../controller/user')
const Auth = require('../utility/middleware')

const router = express.Router()
router.post(
  '/initial-call',
  celebrate({
    body: Joi.object().keys({
      need: Joi.string()
        .valid('profile', 'categories', 'homescreen')
        .required(),
    }),
  }),
  Auth.verifyToken,
  userController.initialCall
)
router.post(
  '/social-signin',
  celebrate({
    body: Joi.object().keys({
      token: Joi.string().required(),
    }),
  }),
  userController.socialSignin
)
router.get('/app-first-call', Auth.verifyToken, userController.appFirstCall)

router.post('/logout', Auth.verifyToken, userController.logout)

router.get('/isValidUsername', userController.isValidUsername)

router.get('/searchUser', Auth.verifyToken, userController.searchUser)
router.post(
  '/sendFrndRequest',
  Auth.verifyToken,
  userController.sendFriendRequest
)

router.post(
  '/acceptfrndRequest',
  Auth.verifyToken,
  userController.acceptfriendRequest
)
router.get('/myfrnds', Auth.verifyToken, userController.friendsListing)
router.post(
  '/rejectFriendRequest',
  Auth.verifyToken,
  userController.rejectFriendRequest
)
module.exports = router
