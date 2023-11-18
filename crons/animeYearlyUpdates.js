const Content = require('../src/schema/content')
const {
  yearlyAnime,
  structureAnime,
} = require('../src/thirdParty/gogoAnime/scraping')
const { resp } = require('../src/utility/resp')
const { sendTelegramLog } = require('../src/utility/sendTeleLogs')

exports.yearlyAnimeUpdater = async (req, res) => {
  try {
    const { year, limit } = req.body
    resp.success(
      res,
      `yearly anime worker is started ,Year ${year}-Limit ${limit}`
    )
    await sendTelegramLog(
      `yearly anime worker is started ,Year ${year}-Limit ${limit}`,
      'yearlyAnimeLogs'
    )
    const yearlyData = await yearlyAnime(year, limit)
    const promises = yearlyData.map(async (anime) => {
      const isExist = await Content.findOne({ contentId: anime.id }).lean(true)
      if (!isExist) {
        const structuredData = structureAnime(anime)
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
    await sendTelegramLog('End yearlyAnime with Success ', 'yearlyAnimeLogs')
  } catch (error) {
    sendTelegramLog(
      `Something is wrong in yearlyAnime error - ${error.message}`,
      'yearlyAnimeLogs'
    )
  }
}
