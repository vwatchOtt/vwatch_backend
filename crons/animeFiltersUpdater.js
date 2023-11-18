//Anime filters updater by direct website
const Content = require('../src/schema/content')
const animeScraper = require('../src/thirdParty/gogoAnime/scraping')
const { resp } = require('../src/utility/resp')
const { sendTelegramLog } = require('../src/utility/sendTeleLogs')
let defaultLimit = 100
exports.animeFilterAdder = async (req, res) => {
  try {
    if (req.body.limit) {
      defaultLimit = parseInt(req.body.limit)
    }
    await Content.updateMany(
      {},
      {
        $set: {
          filters: [],
        },
      }
    )
    resp.success(res, `worker is started with limits of - ${defaultLimit}`)
    const jobs = [
      'topAiring',
      'latestEpisodes',
      'popularAnime',
      'newMovies',
      'newSeason',
    ]
    for (const job of jobs) {
      await sendTelegramLog(`Filters Job - ${job} started`, 'animeFilter')

      const updates = await animeScraper[job](defaultLimit)
      const promises = updates.map(async (anime, index) => {
        const content = await Content.findOne({ contentId: anime.id }).lean(
          true
        )
        const filter = {
          sorting: index,
          title: job,
        }
        if (content) {
          const filterIndex = content.filters.findIndex(
            (filter) => filter.title === job
          )
          const updateObj = {}

          if (filterIndex == -1) {
            updateObj.filters = content.filters.concat([filter])
          } else {
            updateObj[`filters.${filterIndex}`] = filter
          }
          const updated = await Content.findByIdAndUpdate(content._id, {
            $set: updateObj,
          }).lean(true)
          return updated
        }
        await animeScraper.animeContentIdTodb(anime.id, filter)
        return true
      })
      await Promise.all(promises)
      await sendTelegramLog(`Filters Job - ${job} done`, 'animeFilter')
    }
    await sendTelegramLog(
      'Filters and adder work is done\n shut down worker success',
      'animeFilter'
    )
    return
  } catch (error) {
    await sendTelegramLog(
      `Something is wrong during update filters , error - ${error.message}`,
      'animeFilter'
    )
  }
}
