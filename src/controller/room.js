const Rooms = require('../schema/room')
const { resp } = require('../utility/resp')

const createRoom = async (req, res) => {
  try {
    const { type, content, user, roomId } = req.body
    const creator = req.userData._id
    await Rooms.findOneAndUpdate(
      {
        roomId,
      },
      {
        creator,
        type,
        content,
        $push: {
          participant: user,
        },
      },
      {
        upsert: true,
      }
    )
    return resp.success(res, '')
  } catch (error) {
    return resp.fail(res)
  }
}

const myRooms = async (req, res) => {
  try {
    const creator = req.userData._id

    const rooms = await Rooms.aggregate([
      {
        creator,
      },
    ])
    return resp.success(res, '', rooms)
  } catch (error) {
    return resp.fail(res)
  }
}
module.exports = {
  myRooms,
  createRoom,
}
