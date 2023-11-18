const Content = require('../../../src/schema/content')
const { fetchAnimeDetails } = require('./myAnimeListFunc')
const { sendTelegramLog } = require('../telegramlogs')
require('../../../connections/db')

const fetchAndSaveFromMyAnimeList = async (start, limit) => {
  try {
    const contents = await Content.find({
      fetchedFrom: 'gogoanime',
      myAnimeListId: { $exists: false },
    })
      .sort({ _id: 1 })
      .lean(true)
      .skip(start)
      .limit(limit)
    const promises = contents.map(async (content) => {
      if (content.title.length >= 100) {
        await sendTelegramLog(`larger title -${content.title}`)
        throw new Error('title is large')
      }
      const details = await fetchAnimeDetails(content.title, content)
      if (!details) {
        console.log('not found-' + content.title)
        throw new Error('not fetched')
      }
      const success = await Content.findByIdAndUpdate(content._id, details, {
        new: true,
      })
      await new Promise((resolve) => setTimeout(resolve, 1000))
      return success
    })
    const resolvedPromises = await Promise.allSettled(promises)
    const fulfilledPromises = resolvedPromises
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value)
    await sendTelegramLog(
      `start \n target-${contents.length} \n achived-${fulfilledPromises.length}`
    )
  } catch (error) {
    await sendTelegramLog(`catch -${error.message}`)
  }
}
const startScript = async () => {
  const starts = 0
  const totalRecords = 3154
  const limit = 2

  for (let start = starts; start <= totalRecords; start += limit) {
    sendTelegramLog(`start-${start} from ${limit}`)
    await fetchAndSaveFromMyAnimeList(start, limit)
    sendTelegramLog(`end-${start} from ${limit}`)
  }
  process.exit()
  return
}
setTimeout(() => {
  startScript()
}, 5000)
