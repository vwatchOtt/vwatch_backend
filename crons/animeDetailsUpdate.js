//myAnimeList details updater by myAnimeListIdKey

const Content = require('../src/schema/content')
const {
  myAnimeListIdToFetchCompleteDetails,
} = require('../src/thirdParty/myAnimeList/helper')
const { resp } = require('../src/utility/resp')

const { sendTelegramLog } = require('../src/utility/sendTeleLogs')

const worker = async (start, limit) => {
  try {
    await sendTelegramLog(`start-${start} from ${limit}`, 'myAnimeListUpdates')

    const foundAnime = await Content.find({
      myAnimeListId: { $exists: true },
    })
      .sort({ createdAt: -1 })
      .skip(start)
      .limit(limit)
      .lean(true)
    const totalCount = foundAnime.length
    const promises = foundAnime.map(async (element) => {
      const animeDetails = await myAnimeListIdToFetchCompleteDetails(
        element.myAnimeListId
      )
      if (!animeDetails) {
        await sendTelegramLog(
          `cron job updateMyAnimeList error >${element.myAnimeListId}`,
          'myAnimeListUpdates'
        )
        return
      }
      await Content.findByIdAndUpdate(element._id, {
        broadcast: animeDetails.broadcast || element.broadcast,
        popularity: animeDetails.popularity || element.popularity,
        members: animeDetails.members || element.members,
        ranked: animeDetails.ranked || element.ranked,
        duration: animeDetails.duration || element.duration,
        theme: animeDetails.theme || element.theme,
        source: animeDetails.source || element.source,
        studios: animeDetails.studios || element.studios,
        licensors: animeDetails.licensors || element.licensors,
        producer: animeDetails.producer || element.producer,
        premiered: animeDetails.premiered || element.premiered,
        myAnimeListDescription:
          animeDetails.myAnimeListDescription || element.myAnimeListDescription,
        trailers:
          animeDetails.trailers.length > 0
            ? animeDetails.trailers
            : element.trailers,
      }).lean(true)
      return true
    })

    const resolvedPromises = await Promise.allSettled(promises)
    const fulfilledPromises = resolvedPromises
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value)
    await sendTelegramLog(
      `End -${start} from ${limit} \n\n results -Target${totalCount} : Scraped : ${fulfilledPromises.length}`,
      'myAnimeListUpdates'
    )

    return
  } catch (error) {
    await sendTelegramLog(
      `anime ongoing content cron ended due to error ${error.message}`,
      'myAnimeListUpdates'
    )
  }
}

exports.updateMyAnimeList = async (req, res) => {
  try {
    const total = await Content.count({
      myAnimeListId: { $exists: true },
    })
    const starts = 0
    const totalRecords = total
    const limit = req.body.limitPrRound
    resp.success(res, 'updater is running', totalRecords)

    for (let start = starts; start <= totalRecords; start += limit) {
      await worker(start, limit)
    }
    await sendTelegramLog(`woker done by${totalRecords}`, 'myAnimeListUpdates')
  } catch (error) {
    await sendTelegramLog(
      `woker fail by error - ${error.message}`,
      'myAnimeListUpdates'
    )
  }
}
