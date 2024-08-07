const User = require('../schema/users')
const axios = require('axios')
const { resp } = require('../utility/resp')
const jwt = require('jsonwebtoken')
const Friends = require('../schema/friends')
const Content = require('../schema/content')
const {
  generateConversationId,
  triggerNotification,
} = require('../utility/helperFunc')
const { createFireUser } = require('../../firebase/operation')
const { connectedUsers } = require('../../sockets/cache')
const { NOTI_CATEGORIES } = require('../utility/notiConstants')

exports.editMyFriendDetails = async (req, res) => {
  try {
    const { action, iAmCallingAs, _id } = req.body
    const friend = await Friends.findById(_id).lean(true)
    if (action == 'silent') {
      await Friends.findByIdAndUpdate(_id, {
        'settings.notification': !friend.settings.notification,
      })
    }
    if (action == 'block') {
      await Friends.findByIdAndUpdate(_id, {
        'settings.block': !friend.settings.block,
      })
    }
    if (action == 'unfriend') {
      await Friends.deleteMany({
        conversationId: friend.conversationId,
      })
    }
    if (action == 'editName') {
      await Friends.findByIdAndUpdate(_id, {
        iAmCallingAs: iAmCallingAs,
      })
    }
    return resp.success(res)
  } catch (error) {
    return resp.fail(res, error, '')
  }
}

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

    let user = await User.findOne({ email }).lean(true)
    const toBeUpdate = {}

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
    user = await User.findOneAndUpdate({ email: email }, toBeUpdate, {
      upsert: true,
      new: true,
    })
    const accessToken = jwt.sign(
      {
        email: payload.email,
        user: user._id,
      },
      'supersecret'
    )

    user = await User.findOneAndUpdate(
      { email: email },
      {
        accessToken: accessToken,
      },
      {
        upsert: true,
        new: true,
      }
    )
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

exports.isValidUsername = async (req, res) => {
  try {
    let data
    if (req.query.type == 'username') {
      data = await User.findOne({
        username: req.query.username,
      })
    }
    return resp.success(res, '', {
      isValid: data ? false : true,
      reason: 'Space not allowed',
    })
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
    const frndData = await User.findById(req.body.friend).lean(true)
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
    triggerNotification({
      channelId: 'default',
      categoryId: NOTI_CATEGORIES.FRIEND_REQUEST,
      sound: 'default',
      to: frndData?.expoToken,
      title: req.userData.username,
      body: `Hey, ${frndData.name} You got a new friend request`,
      data: {
        pageId: null,
        type: 'friend-request',
        itemId: req.userData._id,
      },
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
    triggerNotification({
      channelId: 'default',
      categoryId: NOTI_CATEGORIES.FRIEND_REQUEST,
      sound: 'default',
      to: data?.expoToken,
      title: req.userData.username,
      body: `Your friend request has been rejected by ${req.userData.name}`,
      data: {
        pageId: null,
        type: 'friend-request',
        itemId: req.userData._id,
      },
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
    triggerNotification({
      channelId: 'default',
      categoryId: NOTI_CATEGORIES.FRIEND_REQUEST,
      sound: 'default',
      to: data?.expoToken,
      title: req.userData.username,
      body: `Your friend request has been accepted by ${req.userData.name}`,
      data: {
        pageId: null,
        type: 'friend-request',
        itemId: req.userData._id,
      },
    })
    return resp.success(res, '')
  } catch (error) {
    return resp.unknown(res, error.message)
  }
}

exports.friendsListing = async (req, res) => {
  try {
    let frnds = await Friends.find({
      user: req.userData._id,
      status: 'accepted',
    })
      .lean(true)
      .populate('friend')
      .lean(true)
    frnds = frnds.map((my) => {
      if (connectedUsers.has(my.friend._id.toString()))
        my.friend.fireStore = { status: 'online' }
      else {
        my.friend.fireStore = { status: 'offline' }
      }
      return my
    })
    return resp.success(res, '', frnds)
  } catch (error) {
    return resp.unknown(res, error.message)
  }
}

//For feth filters data and filters values
exports.initialCall = async (req, res) => {
  try {
    const { need, expoToken } = req.body
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
      const profile = await User.findByIdAndUpdate(
        req.userData._id,
        {
          expoToken,
        },
        { new: true }
      )
      responseData[need] = profile
    }
    return resp.success(res, '', responseData)
  } catch (error) {
    return resp.fail(res)
  }
}

exports.updateUser = async (req, res) => {
  try {
    const userId = req.userData._id
    await User.findByIdAndUpdate(userId, req.body)
    return resp.success(res, '')
  } catch (error) {
    return resp.fail(res, '', error)
  }
}

exports.viewProfile = async (req, res) => {
  try {
    const user = await User.findById(req.query.userId)
      .select({
        _id: 1,
        profilePic: 1,
        setting: 1,
        lastOnlineAt: 1,
        username: 1,
        name: 1,
      })
      .lean(true)
    user.friendsCount = await Friends.count({
      user: req.query.userId,
      status: 'accepted',
    })
    return resp.success(res, '', user)
  } catch (error) {
    return resp.fail(res, '', error)
  }
}
exports.notificationListing = async (req, res) => {
  try {
    let user = await Friends.find(
      {
        user: req.userData._id,
        status: {
          $in: ['pending', 'waiting-for-acceptance'],
        },
      },
      {
        _id: 1,
        status: 1,
        friend: 1,
      }
    )
      .populate('friend', 'email name _id profilePic username')
      .lean(true)
    user = user.map((u) => {
      return {
        _id: u.friend._id,
        email: u.friend.email,
        name: u.friend.name,
        profilePic: u.friend.profilePic,
        username: u.friend.username,
        friendshipId: u._id,
        status: u.status,
      }
    })
    return resp.success(res, '', user)
  } catch (error) {
    return resp.fail(res, '', error)
  }
}
