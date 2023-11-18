const { default: mongoose } = require('mongoose')
const Content = require('../schema/content')
const { resp } = require('../utility/resp')

//For mixed content and add subdub linking
const linkingContent = async (contents) => {
  const removedData = []
  const sturucturedContent = []
  for (const content of contents) {
    content.linkedData = [
      {
        language: content.currentLang,
        linkedId: content._id,
        contentId: content.contentId,

        totalEpisodes: content.totalEpisodes,
      },
    ]
    const isLinking = await Content.findOne({
      myAnimeListId: content.myAnimeListId,
      _id: { $ne: content._id },
    }).lean(true)
    if (!isLinking) {
      sturucturedContent.push(content)
      continue
    }
    removedData.push(isLinking._id.toString())
    content.linkedData.push({
      language: isLinking.currentLang,
      linkedId: isLinking._id,
      contentId: isLinking.contentId,
      totalEpisodes: isLinking.episodes.length,
    })
    if (!removedData.includes(content._id.toString())) {
      sturucturedContent.push(content)
    }
  }
  return sturucturedContent
}

//For Basic anime details
const animeSmallBoxProjection = {
  $project: {
    contentId: 1,
    title: {
      $cond: {
        if: { $ne: ['$myAnimeListDescription', null] },
        then: '$myAnimeListDescription',
        else: {
          $cond: {
            if: { $ne: ['$title', null] },
            then: '$title',
            else: '$otherTitle',
          },
        },
      },
    },
    releasedYear: 1,
    status: 1,
    trailers: 1,
    ranked: 1,
    popularity: 1,
    categories: 1,
    duration: 1,
    airedAt: 1,
    description: 1,
    myAnimeListId: 1,
    studios: 1,
    currentLang: 1,
    title: 1,
    image: 1,
    source: 1,
    rating: 1,
    totalEpisodes: { $size: '$episodes' },
  },
}
//For Complete anime details includes episodes
const animeDetailedBoxProjection = {
  $project: {
    contentId: 1,
    title: {
      $cond: {
        if: { $ne: ['$myAnimeListDescription', null] },
        then: '$myAnimeListDescription',
        else: {
          $cond: {
            if: { $ne: ['$title', null] },
            then: '$title',
            else: '$otherTitle',
          },
        },
      },
    },
    releasedYear: 1,
    status: 1,
    trailers: 1,
    ranked: 1,
    popularity: 1,
    categories: 1,
    duration: 1,
    airedAt: 1,
    description: 1,
    myAnimeListId: 1,
    studios: 1,
    currentLang: 1,
    rating: 1,
    episodes: 1,
    image: 1,
    source: 1,
    studios: 1,
    licensors: 1,
    producer: 1,
    type: 1,
    director: 1,
    totalEpisodes: { $size: '$episodes' },
  },
}

//Handle all home screen listing with pages
exports.homeScreen = async (req, res) => {
  try {
    const { filter, page } = req.body
    const end = 20
    const start = page * end

    const query = {
      fetchedFrom: 'gogoanime',
      status: { $ne: 'upcoming' },
      myAnimeListId: { $exists: true },
    }
    let sorting = { releasedYear: -1 }
    switch (filter) {
      case 'recent-release':
        query.createdAt = {
          $gt: new Date(`${new Date().getFullYear()}-01-01T00:00:00Z`),
        }
        break
      case 'latest-episodes':
        query.updatedAt = {
          $gt: new Date(`${new Date().getFullYear()}-01-01T00:00:00Z`),
        }
        break
      case 'romance':
        query.categories = {
          $in: ['Romance'],
        }
        break
      case 'movies':
        query.type = 'Movie'
        break
      case 'dub':
        query.categories = {
          $in: ['Dub'],
        }
        break
      case 'upcoming':
        query.status = 'upcoming'
        break
      case 'top-10':
        sorting = { popularity: 1 }
        break
      default:
        break
    }
    const contents = await Content.aggregate([
      {
        $match: query,
      },
      animeSmallBoxProjection,
      {
        $sort: sorting,
      },
      {
        $skip: start,
      },
      {
        $limit: end,
      },
    ])
    const linkedData = await linkingContent(contents)
    const contentsCount = await Content.count(query)
    const pages = Math.ceil(contentsCount / end)
    return resp.success(res, '', {
      contents: linkedData,
      pages,
      currentPage: page,
    })
  } catch (error) {
    return resp.fail(res)
  }
}

//For search anime
exports.searchAnime = async (req, res) => {
  try {
    const { search, page } = req.body
    const end = 20
    const start = page * end
    const searchKeys = [
      'myAnimeListDescription',
      'title',
      'releasedYear',
      'status',
      'studios',
      'otherTitle',
      'type',
    ]

    const regexQuery = new RegExp(search, 'i')
    const query = {
      $or: searchKeys.map((key) => ({ [key]: regexQuery })),
    }
    const contents = await Content.aggregate([
      {
        $match: query,
      },
      animeSmallBoxProjection,
      {
        $skip: start,
      },
      {
        $limit: end,
      },
    ])
    const contentsCount = await Content.count(query)
    const linkedData = await linkingContent(contents)
    const pages = Math.ceil(contentsCount / end)
    return resp.success(res, '', {
      contents: linkedData,
      pages,
      currentPage: page,
    })
  } catch (error) {
    return resp.fail(res)
  }
}

//For fetch complete details
exports.contentById = async (req, res) => {
  try {
    const { contentId } = req.body
    const content = await Content.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(contentId) },
      },
      animeDetailedBoxProjection,
    ])

    return resp.success(res, '', content[0])
  } catch (error) {
    return resp.fail(res, error.message)
  }
}
