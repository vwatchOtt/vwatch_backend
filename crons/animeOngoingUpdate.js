//Fetch Ongoing Anime Latest Episodes
const Content = require('../src/schema/content')
const {
  scrapeStreamingUrl,
  scrapeAnimeDetails,
} = require('../src/thirdParty/gogoAnime/scraping')
const { resp } = require('../src/utility/resp')
const { sendTelegramLog } = require('../src/utility/sendTeleLogs')

// Custom comparison function to sort episodes by their number property
const solved = (a, b) =>
  a.episodeNum.localeCompare(b.episodeNum, undefined, { numeric: true })

const compareEpisodesByNum = (a, b) =>
  b.episodeNum.localeCompare(a.episodeNum, undefined, { numeric: true })

// Sort the array using the custom comparison function

const worker = async (start, limit) => {
  try {
    await sendTelegramLog(`start-${start} from ${limit}`, 'ongoingAnime')
    const ongoingAnime = await Content.find({
      status: { $in: ['ongoing', 'upcoming'] },
    })
      .sort({ createdAt: -1 })
      .skip(start)
      .limit(limit)
      .lean(true)
    const totalCount = ongoingAnime.length
    const promises = ongoingAnime.map(async (element) => {
      const animeDetails = await scrapeAnimeDetails(element.contentId)
      if (!animeDetails) {
        await sendTelegramLog(
          `cron job scrapeAnimeDetails error >${element.contentId} `,
          'ongoingAnime'
        )
        return
      }
      if (element.episodes.length == animeDetails.episodesList.length) {
        return
      }
      if (animeDetails.episodesList.length > element.episodes.length) {
        animeDetails.episodesList.sort(compareEpisodesByNum)
        if (element.episodes.length != 0) {
          animeDetails.episodesList.splice(-element.episodes.length)
        }
        animeDetails.episodesList.sort(solved)

        if (animeDetails.episodesList.length == 0) {
          await sendTelegramLog(
            'something is wrong in calculation of merging episodes',
            'ongoingAnime'
          )
          return
        }
        await sendTelegramLog(
          `new episodes found ${animeDetails.episodesList.length}\n\n ${element?.contentId} \n\nid-${element._id} `,
          'ongoingAnime'
        )
        const latestEpisodePromises = animeDetails.episodesList.map(
          async (episode) => {
            try {
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
                throw 'something went wrong'
              }
              episode.defaultStreamingUrl = streamingData.defaultStreamingUrl
              episode.permanentStreamingUrl =
                streamingData.permanentStreamingUrl
              episode.temporaryStreamingUrl =
                streamingData.temporaryStreamingUrl
              episode.updatedAt = new Date(new Date().setHours(1, 0, 0, 0))
              return episode
            } catch (error) {
              throw episode
            }
          }
        )

        const resolvedPromises = await Promise.allSettled(latestEpisodePromises)

        const fulfilledPromises = resolvedPromises
          .filter((result) => result.status === 'fulfilled')
          .map((result) => result.value)
        if (animeDetails.episodesList.length != fulfilledPromises.length) {
          await sendTelegramLog(
            `fail ${animeDetails.episodesList.length}!=fulfilledPromises.length`,
            'ongoingAnime'
          )
          throw 'error'
        }
        const mergedEpisodes = element.episodes.concat(fulfilledPromises)
        await Content.findByIdAndUpdate(element._id, {
          episodes: mergedEpisodes,
          status: animeDetails.status.toLowerCase(),
          latestEpisode: animeDetails.latestEpisode,
        }).lean(true)
        await sendTelegramLog(
          `new episodes updated\n\n${element.contentId}\n\n${element._id}`,
          'ongoingAnime'
        )
      }
    })
    const resolvedPromises = await Promise.allSettled(promises)

    const fulfilledPromises = resolvedPromises
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value)
    await sendTelegramLog(
      `End -${start} from ${limit} \n\n results -Target${totalCount} : Scraped : ${fulfilledPromises.length}`,
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

exports.updateIncompleteAnime = async (req, res) => {
  try {
    const total = await Content.count({
      status: { $in: ['ongoing', 'upcoming'] },
    })
    const starts = 0
    const totalRecords = total
    const limit = req.body.limitPrRound
    resp.success(res, 'updater is running', totalRecords)

    for (let start = starts; start <= totalRecords; start += limit) {
      await worker(start, limit)
    }
    await sendTelegramLog(`woker done by${totalRecords}`, 'ongoingAnime')
  } catch (error) {
    await sendTelegramLog(
      `woker fail by error - ${error.message}`,
      'ongoingAnime'
    )
  }
}
