const Content = require('../src/schema/content')
const {
  scrapeAnimesByPages,
  structureAnime,
} = require('../src/thirdParty/gogoAnime/scraping')
const { resp } = require('../src/utility/resp')
const { sendTelegramLog } = require('../src/utility/sendTeleLogs')

exports.scrapeAnimesByPagesScript = async (req, res) => {
  try {
    const { limit } = req.body

    resp.success(res, `yearly anime worker is started -Limit ${limit}`)
    await sendTelegramLog(
      `yearly anime worker is started -Limit ${limit}`,
      'yearlyAnimeLogs'
    )
    const yearlyData = await scrapeAnimesByPages(limit)
    const promises = yearlyData.map(async (anime) => {
      const isExist = await Content.findOne({ contentId: anime.id }).lean(true)
      if (!isExist) {
        const structuredData = structureAnime(anime)
        structuredData.lastEpisodeRefreshedAt = new Date()
        await Content.create(structuredData)
        sendTelegramLog(
          `Found anime from yearlyAnime and updated in db - ${anime.id}`,
          'yearlyAnimeLogs'
        )
        return true
      }
      return true
    })
    await Promise.all(promises)
    console.log('done')
    await sendTelegramLog('End yearlyAnime with Success ', 'yearlyAnimeLogs')
  } catch (error) {
    sendTelegramLog(
      `Something is wrong in yearlyAnime error - ${error.message}`,
      'yearlyAnimeLogs'
    )
  }
}
