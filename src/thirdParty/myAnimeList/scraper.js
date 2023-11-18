const Content = require('../../schema/content')
const { sendTelegramLog } = require('../../utility/sendTeleLogs')
const {
  fetchAnimeDetails,
  fetchItemsByType,
  myAnimeListIdToFetchCompleteDetails,
} = require('./helper')
const {
  checkApproxSimilarity,
  removeDubVariationsFromString,
  successCall,
} = require('../../utility/helperFunc')

exports.searchAnimeByTitleAndFetchData = async (dbContent) => {
  const searchString = removeDubVariationsFromString(dbContent.title)
  const searchUrl = `https://myanimelist.net/search/prefix.json?type=all&keyword=${searchString}&v=1`
  try {
    const response = await successCall(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        Referer: `https://myanimelist.net/search/all?q=${encodeURIComponent(
          searchString
        )}&cat=all`,
        'Sec-Ch-Ua':
          '"Not/A)Brand";v="99", "Brave";v="115", "Chromium";v="115"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': 'Windows',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Gpc': '1',
        'X-Requested-With': 'XMLHttpRequest',
        Cookie:
          'MALHLOGSESSID=41ea704c74d6af10e951537867b4f2da; top_signup_hidden=1; MALSESSIONID=3r76bfighhkke27pisr54hkds6; is_logged_in=1',
      },
    })

    let items = fetchItemsByType(response.data.categories, 'anime')
    items = items[0].items
    let found = null
    for (const item of items) {
      const moreData = await myAnimeListIdToFetchCompleteDetails(
        item.id,
        item.name
      )
      if (
        checkApproxSimilarity(
          searchString,
          item.name,
          moreData.myAnimeListDescription
        )
      ) {
        found = {
          ...{
            myAnimeListId: item.id,
            airedAt: item.payload.aired,
            rating: item.payload.score,
            payload: item.payload,
          },
          ...moreData,
        }
        break // Found a match, no need to continue the loop
      }
    }
    if (!found) {
      return null
    }

    if (
      dbContent.releasedYear == '' ||
      dbContent.releasedYear == undefined ||
      dbContent.releasedYear == '0'
    ) {
      found.releasedYear = found.payload.start_year
    } else if (
      found.payload.start_year &&
      found.payload.start_year.toString() != dbContent.releasedYear
    ) {
      console.log('year not matched')
      return null
    }
    await sendTelegramLog(
      `found-${searchString}-${found.payload.start_year.toString()}, \n my search -${
        dbContent.title
      }-${dbContent.releasedYear}`
    )
    return found
  } catch (error) {
    console.log(error)
    throw error
  }
}
exports.fetchAndSaveFromMyAnimeList = async (start, limit) => {
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
