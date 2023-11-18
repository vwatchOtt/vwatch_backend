const User = require('../schema/users')
const axios = require('axios')
const { resp } = require('../utility/resp')
const jwt = require('jsonwebtoken')
const Friends = require('../schema/friends')
const Content = require('../schema/content')

exports.socialSignin = async (req, res) => {
  const token = req.body.token
  try {
    const response = await axios.get(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    const { email, name, picture } = response.data

    const payload = {
      email,
      name,
      profilePic: picture,
    }
    console.log(payload)
    if (!payload) {
      return resp.taken(res, '')
    }
    const accessToken = jwt.sign(
      {
        email: payload.email,
      },
      'supersecret'
    )
    let user = await User.findOne({ email })
    const toBeUpdate = {
      accessToken: accessToken,
    }
    if (!user) {
      toBeUpdate.username = `user_${Math.floor(
        Math.random() * 1000000
      )}${Math.random().toString(36).substring(2, 5)}`
      toBeUpdate.email = payload.email
      toBeUpdate.name = payload.name
      toBeUpdate.profilePic =
        payload.profilePic || 'https://www.vwatch.in/statics?type=profilePic'
    } else {
      toBeUpdate.name = payload.name
    }
    user = await User.findOneAndUpdate({ email: email }, toBeUpdate, {
      upsert: true,
      new: true,
    })
    return resp.success(res, '', user)
  } catch (error) {
    return resp.fail(res, error.message)
  }
}

exports.logout = async (req, res) => {
  try {
    const data = await User.findByIdAndUpdate(
      req.userData._id,
      {
        accessToken: '',
        deviceToken: null,
      },
      {
        new: true,
      }
    )
    if (!data) {
      return resp.fail(res)
    }
    return resp.success(res)
  } catch (e) {
    return res.status(400).json({
      message: e.message,
    })
  }
}

exports.appFirstCall = async (req, res) => {
  try {
    req.userData.maintinense = null
    req.userData.screenBlockNeedTOPurchasePlan = null
    return resp.success(res, '', req.userData)
  } catch (error) {
    req.userData.maintinense = null
    return resp.success(
      res,
      'App is under maintinense please be patient will fix soon',
      req.userData
    )
  }
}

exports.isValidUsername = async (req, res) => {
  try {
    const data = await User.findOne({
      username: req.query.username,
    })
    if (data) {
      return resp.unknown(res, 'username already exist')
    }
    return resp.success(res, '')
  } catch (error) {
    return resp.unknown(res, error.message)
  }
}

exports.searchByUsername = async (req, res) => {
  try {
    const alternateStatus = {
      pending: 'waiting', //
      accepted: 'accepted',
    }
    const data = await User.find({
      _id: {
        $ne: req.userData._id,
      },
      username: new RegExp(req.query.username, 'i'),
    }).lean(true)
    const userPromises = data.map(async (user) => {
      user.status = 'unknown'
      const isHeSendMe = await Friends.findOne({
        user: req.userData._id,
        friend: user._id,
      }).lean(true)
      if (isHeSendMe) {
        user.status = alternateStatus[isHeSendMe.status]
        user.friendDoc_id = isHeSendMe._id
      } else {
        const isISendBefore = await Friends.findOne({
          user: user._id,
          friend: req.userData._id,
        }).lean(true)
        if (isISendBefore) {
          user.status = isISendBefore.status
          user.friendDoc_id = isISendBefore._id
        }
      }
      return user
    })
    const users = await Promise.all(userPromises)
    return resp.success(res, '', users)
  } catch (error) {
    return resp.unknown(res, error.message)
  }
}

exports.sendFriendRequest = async (req, res) => {
  try {
    const isHesendMeAnyRequest = await Friends.findOne({
      user: req.userData._id,
      friend: req.body.friend,
    }).lean(true)
    if (isHesendMeAnyRequest) {
      return resp.unknown(
        res,
        'You have already recieve a request from this user'
      )
    }
    const isIsendThisRequestBefor = await Friends.findOne({
      friend: req.userData._id,
      user: req.body.friend,
    }).lean(true)
    if (isIsendThisRequestBefor) {
      return resp.unknown(res, 'You have already send a request for this user')
    }
    await Friends.create({
      user: req.body.friend,
      friend: req.userData._id,
      status: 'pending',
    })
    return resp.success(res, '')
  } catch (error) {
    return resp.unknown(res, error.message)
  }
}

exports.rejectFriendRequest = async (req, res) => {
  try {
    await Friends.findByIdAndDelete(req.body._id)
    return resp.success(res, '')
  } catch (error) {
    return resp.unknown(res, error.message)
  }
}

exports.acceptfriendRequest = async (req, res) => {
  try {
    const data = await Friends.findById(req.body._id).lean(true)
    if (!data) {
      return resp.unknown(res, 'There is no friend request for accept')
    }
    const bondId = [...Array(16)]
      .map(() => Math.random().toString(36)[2])
      .join('')
    await Friends.findByIdAndUpdate(req.body._id, {
      status: 'accepted',
      bondId: bondId,
    }).lean(true)
    await Friends.create({
      user: data.friend,
      friend: data.user,
      status: 'accepted',
      bondId: bondId,
    })
    return resp.success(res, '')
  } catch (error) {
    return resp.unknown(res, error.message)
  }
}

exports.friendsListing = async (req, res) => {
  try {
    const frnds = await Friends.find({
      user: req.userData._id,
      status: 'accepted',
    })
      .populate('friend')
      .lean(true)
    return resp.success(res, '', frnds)
  } catch (error) {
    return resp.unknown(res, error.message)
  }
}
exports.createRoom = async (req, res) => {
  try {
    return resp.success(res, '')
  } catch (error) {
    return resp.unknown(res, error.message)
  }
}

//For feth filters data and filters values
exports.initialCall = async (req, res) => {
  try {
    const { need } = req.body
    const responseData = {}
    if (need == 'categories') {
      responseData[need] = await Content.distinct('categories')
    }
    if (need == 'homescreen') {
      responseData[need] = [
        {
          id: 'recent-release',
          title: 'Recent Release',
        },
        {
          id: 'latest-episodes',
          title: 'Latest Episodes',
        },
        {
          id: 'romance',
          title: 'Romance',
        },
        {
          id: 'movies',
          title: 'Movies',
        },
        {
          id: 'dub',
          title: 'Dub',
        },
        {
          id: 'upcoming',
          title: 'Upcoming',
        },
        {
          id: 'top-10',
          title: 'Top 10',
        },
      ]
    }
    if (need == 'profile') {
      responseData[need] = req.userData
    }
    return resp.success(res, '', responseData)
  } catch (error) {
    return resp.fail(res)
  }
}
