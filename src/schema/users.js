const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    accessToken: String,
    verificationCode: String,
    name: String,
    profilePic: {
      type: String,
      default: '',
    },
    fireId: String,
    subscription: {
      type: String,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isProfileCompleted: {
      type: Boolean,
      default: false,
    },
    mobileNumber: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      uniquue: true,
    },
    username: {
      type: String,
      uniquue: true,
    },
    setting: {
      showOnline: Boolean,
      showScreenStatus: Boolean,
      showFriendsList: Boolean,
      showWatchHistory: Boolean,
      showSaves: Boolean,
    },
  },
  {
    timestamps: true,
  }
)
const user = new mongoose.model('users', userSchema)

module.exports = user
