const jwt = require('jsonwebtoken') // used to create, sign, and verify tokens
const Users = require('../schema/users')
const { resp } = require('./resp')

exports.verifyToken = (req, res, next) => {
  try {
    const token = req.headers.accesstoken
    if (!token) return resp.unauthorized(res, '')
    jwt.verify(token, 'supersecret', async function (err) {
      if (err) return resp.unauthorized(res, '')
      const user = await Users.findOne({
        accessToken: token,
      }).lean(true)
      if (!user) return resp.unauthorized(res, '')
      if (!user.profilePic) {
        user.profilePic = 'https://www.vwatch.in/statics?type=profilePic'
      }
      req.userData = user
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
  jwt.verify(token, 'supersecret', async function (err) {
    if (err) return false
    const user = await Users.findOne(
      {
        accessToken: token,
      },
      { _id: 1 }
    ).lean(true)
    socket.userData = user._id
    console.log(user, 'userData')
    if (!user) return false
    next()
  })
}
