const jwt = require('jsonwebtoken') // used to create, sign, and verify tokens
const Users = require('../schema/users')
const { resp } = require('./resp')
const { session } = require('../../sockets/cache')

exports.verifyToken = (req, res, next) => {
  try {
    const token = req.headers.accesstoken
    if (!token) return resp.unauthorized(res, '')
    jwt.verify(token, 'supersecret', async function (err, decode) {
      if (err) return resp.unauthorized(res, '')
      const userId = decode.user
      if (!session[userId]) {
        const user = await Users.findOne({
          accessToken: token,
        }).lean(true)
        if (!user) return resp.unauthorized(res, '')
        if (!user.profilePic) {
          user.profilePic = 'https://www.vwatch.in/statics?type=profilePic'
        }
        session[userId] = {
          _id: user._id,
          username: user.username,
          expoToken: user.expoToken,
        }
      }

      req.userData = session[userId]
      next()
    })
  } catch (error) {
    console.log(error)
  }
}

exports.verifyAdmin = (req, res, next) => {
  try {
    if (req.headers.accesstoken != 'life-hope') {
      return resp.unauthorized(res, '')
    }
    next()
  } catch (error) {
    console.log(error)
  }
}

exports.socketMiddlewere = (socket, next) => {
  console.log('event fetched')
  const token = socket.handshake.query?.token
  console.log(token, 'token---')
  if (!token) return false

  jwt.verify(token, 'supersecret', async function (err, decode) {
    if (err) {
      return false
    }
    const userId = decode.user
    if (!session[userId]) {
      const user = await Users.findOne({
        accessToken: token,
      }).lean(true)
      if (!user) return false
      session[userId] = {
        _id: user._id,
        username: user.username,
        expoToken: user.expoToken,
      }
    }
    socket.userData = session[userId]
    next()
  })
}
