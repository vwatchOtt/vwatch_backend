//Fetch Ongoing Anime Latest Episodes
const Content = require('../src/schema/content')
const { scrapeStreamingUrl } = require('../src/thirdParty/gogoAnime/scraping')
const { resp } = require('../src/utility/resp')
const { sendTelegramLog } = require('../src/utility/sendTeleLogs')

const worker = async (start, limit) => {
  try {
    await sendTelegramLog(`start-${start} from ${limit}`, 'ongoingAnime')
    const animes = await Content.find({
      lastEpisodeRefreshedAt: { $exists: false },
      // lastEpisodeRefreshedAt: { $lt: dateFilter },
    })
      .sort({ createdAt: -1 })
      .skip(start)
      .limit(limit)
      .lean(true)
    const totalCount = animes.length
    const promises = animes.map(async (element) => {
      const latestEpisodePromises = element.episodes.map(async (episode) => {
        const streamingData = await scrapeStreamingUrl({
          id: episode.episodeId,
        })
        if (
          !streamingData.defaultStreamingUrl ||
          !streamingData.permanentStreamingUrl ||
          !streamingData.temporaryStreamingUrl
        ) {
          await sendTelegramLog(
            `red alert video not scraped - ${episode.episodeId}`,
            'ongoingAnime'
          )
        } else {
          episode.updatedAt = new Date()
          console.log('episode refreshed - ', episode.episodeId)
        }
        episode.defaultStreamingUrl = streamingData?.defaultStreamingUrl || null
        episode.permanentStreamingUrl =
          streamingData?.permanentStreamingUrl || null
        episode.temporaryStreamingUrl =
          streamingData?.temporaryStreamingUrl || null
        return episode
      })

      const resolvedPromises = await Promise.all(latestEpisodePromises)
      await Content.findByIdAndUpdate(element._id, {
        episodes: resolvedPromises,
        latestEpisode: resolvedPromises.length,
        lastEpisodeRefreshedAt: new Date(),
      }).lean(true)
      await sendTelegramLog(
        `new episodes updated\n\n${element.contentId}\n\n${element._id}`,
        'ongoingAnime'
      )
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
      lastEpisodeRefreshedAt: { $exists: false },
      // lastEpisodeRefreshedAt: { $lt: dateFilter },
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
