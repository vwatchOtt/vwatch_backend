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
          participant: [user],
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
    const { createdBy, roomId } = req.query
    const creator = req.userData._id
    const matchStage = {}
    if (createdBy == 'my') {
      matchStage['$match'] = {
        creator,
      }
    }
    if (createdBy == 'others') {
      matchStage['$match'] = {
        participant: creator,
      }
    }
    if (roomId) {
      matchStage['$match'] = {
        roomId,
      }
    }
    const rooms = await Rooms.aggregate([
      matchStage,
      {
        $addFields: {
          participant: {
            $concatArrays: ['$participant', ['$creator']],
          },
        },
      },
      {
        $lookup: {
          from: 'contents',
          localField: 'content.contentId',
          foreignField: 'contentId',
          as: 'temp',
        },
      },
      {
        $addFields: {
          video: { $arrayElemAt: ['$temp', 0] },
        },
      },
      {
        $addFields: {
          filteredVideo: {
            $filter: {
              input: '$video.episodes',
              as: 'episode',
              cond: {
                $eq: ['$$episode.episodeId', '$content.videoId'],
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'participant',
          foreignField: '_id',
          as: 'participant',
        },
      },

      {
        $project: {
          roomId: 1,
          createdAt: 1,
          participant: {
            _id: 1,
            name: 1,
            username: 1,
            profilePic: 1,
          },
          image: '$video.image',
          creator: 1,
          duration: 1,
          content: {
            $arrayElemAt: ['$filteredVideo', 0],
          },
        },
      },
    ])
    return resp.success(res, '', rooms)
  } catch (error) {
    return resp.fail(res)
  }
}

const kickOutFromRoom = async (req, res) => {
  try {
    const { roomId, user } = req.body
    await Rooms.findOneAndUpdate(
      {
        roomId,
      },
      {
        $pull: {
          participant: user, // Assuming user._id is the identifier of the element to remove
        },
      },
      {
        new: true, // To return the updated document
      }
    ).lean(true)

    return resp.success(res, '')
  } catch (error) {
    return resp.fail(res)
  }
}
module.exports = {
  myRooms,
  createRoom,
  kickOutFromRoom,
}
