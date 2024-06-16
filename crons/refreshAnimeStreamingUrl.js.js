//Fetch Ongoing Anime Latest Episodes
const Content = require('../src/schema/content')
const { refreshAnimeEpisodes } = require('../src/thirdParty/gogoAnime/scraping')

const { resp } = require('../src/utility/resp')
const { sendTelegramLog } = require('../src/utility/sendTeleLogs')

const worker = async (start, limit, dateFilter) => {
  try {
    await sendTelegramLog(`start-${start} from ${limit}`, 'ongoingAnime')
    const animes = await Content.find({
      $or: [
        {
          lastEpisodeRefreshedAt: { $exists: false },
        },
        {
          lastEpisodeRefreshedAt: { $lt: dateFilter },
        },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(start)
      .limit(limit)
      .lean(true)
    const totalCount = animes.length
    const promises = animes.map(async (element) => {
      try {
        await refreshAnimeEpisodes(element)
      } catch (error) {
        await sendTelegramLog('Error', 'ongoingAnime')
      }
    })
    await Promise.all(promises)
    await sendTelegramLog(
      `End -${start} from ${limit} \n\n results -Target${totalCount}`,
      'ongoingAnime'
    )
    return
  } catch (error) {
    await sendTelegramLog(
      `anime ongoing contnet cron ended due to error ${error.message}`,
      'ongoingAnime'
    )
  }
}

exports.refreshAnimeUrl = async (req, res) => {
  try {
    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - 15)
    const total = await Content.count({
      $or: [
        {
          lastEpisodeRefreshedAt: { $exists: false },
        },
        {
          lastEpisodeRefreshedAt: { $lt: dateFilter },
        },
      ],
    })
    const starts = req.body.start
    const totalRecords = total
    const limit = req.body.limitPrRound
    resp.success(
      res,
      `updater is running , totalRecords ${totalRecords} ,starts from ${starts}`
    )

    for (let start = starts; start <= totalRecords; start += limit) {
      await worker(start, limit, dateFilter)
    }
    await sendTelegramLog(`woker done by${totalRecords}`, 'ongoingAnime')
  } catch (error) {
    await sendTelegramLog(
      `woker fail by error - ${error.message}`,
      'ongoingAnime'
    )
  }
}
