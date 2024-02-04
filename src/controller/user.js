const User = require('../schema/users')
const axios = require('axios')
const { resp } = require('../utility/resp')
const jwt = require('jsonwebtoken')
const Friends = require('../schema/friends')
const Content = require('../schema/content')
const { generateConversationId } = require('../utility/helperFunc')
const { createFireUser } = require('../../firebase/operation')

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
    let user = await User.findOne({ email }).lean(true)
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
    if (!user?.fireId) {
      toBeUpdate.fireId = await createFireUser({
        email: payload.email,
        status: 'offline',
      })
    }
    console.log(toBeUpdate.fireId)
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

exports.searchUser = async (req, res) => {
  try {
    const { search, page } = req.body
    const end = 20
    const start = page * end
    const usersWithStatus = await User.aggregate([
      {
        $match: {
          _id: { $ne: req.userData._id },
          username: { $regex: new RegExp(search, 'i') },
        },
      },
      {
        $lookup: {
          from: 'friends',
          let: { friendId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$user', req.userData._id] },
                    { $eq: ['$friend', '$$friendId'] },
                  ],
                },
              },
            },
          ],
          as: 'friendship',
        },
      },
      {
        $skip: start,
      },
      {
        $limit: end,
      },
      {
        $project: {
          username: 1,
          email: 1,
          profilePic: 1,
          name: 1,
          friendshipId: { $arrayElemAt: ['$friendship._id', 0] },
          status: {
            $ifNull: [{ $arrayElemAt: ['$friendship.status', 0] }, null],
          },
        },
      },
    ])
    const contentsCount = await User.count({
      _id: { $ne: req.userData._id },
      username: { $regex: new RegExp(search, 'i') },
    })
    const pages = Math.ceil(contentsCount / end) - 1
    return resp.success(res, '', {
      users: usersWithStatus,
      pages,
      currentPage: page,
    })
  } catch (error) {
    return resp.unknown(res, error.message)
  }
}

exports.sendFriendRequest = async (req, res) => {
  try {
    const fetchStatus = await Friends.findOne({
      user: req.userData._id,
      friend: req.body.friend,
    }).lean(true)
    if (fetchStatus) {
      return resp.unknown(res, 'Request already exist')
    }
    await Friends.create({
      user: req.userData._id,
      friend: req.body.friend,
      status: 'pending',
    })
    await Friends.create({
      user: req.body.friend,
      friend: req.userData._id,
      status: 'waiting-for-acceptance',
    })
    return resp.success(res, '')
  } catch (error) {
    return resp.unknown(res, error.message)
  }
}

exports.rejectFriendRequest = async (req, res) => {
  try {
    const data = await Friends.findByIdAndDelete(req.body._id)
    await Friends.findByIdAndDelete({
      user: data.friend,
      friend: data.user,
    })
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
    const conversationId = generateConversationId()
    const mydata = await Friends.findByIdAndUpdate(req.body._id, {
      status: 'accepted',
      conversationId,
    }).lean(true)
    await Friends.findOneAndUpdate(
      {
        user: mydata.friend,
        friend: mydata.user,
      },
      {
        conversationId,
        status: 'accepted',
      }
    )
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
      .lean(true)
      .populate('friend')
      .lean(true)

    return resp.success(res, '', frnds)
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
