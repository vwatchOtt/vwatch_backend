const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    accessToken: String,
    verificationCode: String,
    profileId: String,
    name: String,
    profilePic: {
      type: String,
      default: '',
    },
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
  },
  {
    timestamps: true,
  }
)
const user = new mongoose.model('users', userSchema)

module.exports = user
