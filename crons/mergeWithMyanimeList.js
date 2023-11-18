const Content = require('../src/schema/content')
const {
  searchAnimeByTitleAndFetchData,
} = require('../src/thirdParty/myAnimeList/scraper')
const { resp } = require('../src/utility/resp')
const { sendTelegramLog } = require('../src/utility/sendTeleLogs')

const worker = async (start, limit) => {
  try {
    await sendTelegramLog(`start-${start} from ${limit}`, 'ongoingAnime')
    const freshContent = await Content.find({
      myAnimeListId: { $exists: false },
    })
      .sort({ createdAt: -1 })
      .skip(start)
      .limit(limit)
      .lean(true)
    const promises = freshContent.map(async (content) => {
      const isFound = await searchAnimeByTitleAndFetchData(content)
      if (isFound) {
        await Content.findByIdAndUpdate(content._id, isFound)

        await sendTelegramLog(
          `content title matched in MyAnimeList, success and added in db \n\n\n - ${JSON.stringify(
            isFound
          )}`,
          'myAnimeListUpdates'
        )
      }
    })
    await Promise.all(promises)
    await sendTelegramLog(`End -${start} from ${limit}`, 'myAnimeListUpdates')
  } catch (error) {
    await sendTelegramLog(
      `mergeFreshAnimeWithMyAnimeList cron ended due to error ${error}`,
      'myAnimeListUpdates'
    )
  }
}

exports.mergeFreshAnimeWithMyAnimeList = async (req, res) => {
  try {
    const { start, limitPrRound } = req.body
    const total = await Content.count({
      myAnimeListId: { $exists: false },
    })
    const starts = start
    const totalRecords = total
    const limit = limitPrRound
    resp.success(res, 'mergeFreshAnimeWithMyAnimeList is running', totalRecords)

    for (let start = starts; start <= totalRecords; start += limit) {
      await worker(start, limit)
    }
    await sendTelegramLog(
      ` mergeFreshAnimeWithMyAnimeList woker done by${totalRecords}`,
      'myAnimeListUpdates'
    )
  } catch (error) {
    await sendTelegramLog(
      `woker fail by error - ${error.message}`,
      'myAnimeListUpdates'
    )
  }
}
