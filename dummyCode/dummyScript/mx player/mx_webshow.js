const { successCall } = require('../common')
const userId = '6bcadbf9-0c1b-4860-a2df-3ae85a119e83'
const type = 'tvshow'
const { structureDataMxSeason } = require('./structureData')
const Bhws = require('../../../src/schema/bhws')
require('../../../connections/db')
const ListScraper = async () => {
  try {
    let i = 0
    let isStop = 1
    while (isStop != null) {
      const listingUrl = `https://api.mxplayer.in/v1/web/detail/browseItem?&pageNum=${i}&pageSize=20&isCustomized=true&type=2&device-density=2&userid=${userId}&platform=com.mxplay.desktop&content-languages=hi,en&kids-mode-enabled=false`
      const listingHeaders = {
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.6',
        Referer: 'https://www.mxplayer.in/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      }
      const listingResponse = await successCall(listingUrl, listingHeaders)
      const structureData = listingResponse.data
      const totalPages = structureData.totalCount
      const isNextPage = structureData.next
      const contents = structureData.items
      console.log(
        `start $$-Current-page:${i}||Total-pages:${totalPages}||Total-items:${contents.length}`
      )
      const contentsPromise = contents.map(async (item) => {
        try {
          let forReturn = { basicDetails: item }
          const detailedHeaders = {
            Accept: 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.6',
            Cookie: `platform=com.mxplay.desktop; UserID=${userId}; Content-Languages=hi,en; scrnDPI=1.25; isWebpSupported=1; scrnWdth=842; clevertapReset=true; WZRK_S_449-R44-Z55Z=%7B%22p%22%3A1%7D`,
            Origin: 'https://www.mxplayer.in',
            Referer: 'https://www.mxplayer.in/',
            'Sec-Ch-Ua':
              '"Not/A)Brand";v="99", "Brave";v="115", "Chromium";v="115"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site',
            'Sec-Gpc': '1',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          }
          const contentId = item.id
          const detailsContentUrl = `https://api.mxplayer.in/v1/web/detail/collection?type=${type}&id=${contentId}&device-density=2&userid=${userId}&platform=com.mxplay.desktop&content-languages=hi,en&kids-mode-enabled=false`
          const detailOfseason = await successCall(
            detailsContentUrl,
            detailedHeaders
          )
          const itemDetailed = detailOfseason.data
          forReturn.itemDetailed = itemDetailed
          const seasons = itemDetailed.tabs[0].containers
          const seasonsPromise = seasons.map(async (season) => {
            let episodes = []
            try {
              let finalId = false
              while (finalId != '&null') {
                const seasonHeaders = {
                  Accept: 'application/json, text/plain, */*',
                  'Accept-Encoding': 'gzip, deflate, br',
                  'Accept-Language': 'en-US,en;q=0.6',
                  Cookie: `platform=com.mxplay.desktop; UserID=${userId}; Content-Languages=hi,en; scrnDPI=1.25; isWebpSupported=1; scrnWdth=842; clevertapReset=true`,
                  Origin: 'https://www.mxplayer.in',
                  Referer: 'https://www.mxplayer.in/',
                  'Sec-Ch-Ua':
                    '"Not/A)Brand";v="99", "Brave";v="115", "Chromium";v="115"',
                  'Sec-Ch-Ua-Mobile': '?0',
                  'Sec-Ch-Ua-Platform': '"Windows"',
                  'Sec-Fetch-Dest': 'empty',
                  'Sec-Fetch-Mode': 'cors',
                  'Sec-Fetch-Site': 'same-site',
                  'Sec-Gpc': '1',
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                }
                const seasonDetailsUrl = `https://api.mxplayer.in/v1/web/detail/tab/tvshowepisodes?type=season&id=${
                  season.id
                }&sortOrder=0&device-density=2&userid=${userId}${
                  finalId || ''
                }&platform=com.mxplay.desktop&content-languages=hi,en&kids-mode-enabled=false`
                const allEpisodes = await successCall(
                  seasonDetailsUrl,
                  seasonHeaders
                )
                finalId = `&${allEpisodes.data.next}`
                episodes = episodes.concat(allEpisodes.data.items)
                console.log(
                  `found episode-${season.episodesCount}||fetched${episodes.length}`
                )
              }
              return { s: episodes }
            } catch (error) {
              console.log(error.message)
            }
          })
          let resolved = await Promise.allSettled(seasonsPromise)
          resolved = resolved
            .filter((result) => result.status === 'fulfilled')
            .map((result) => result.value)
          forReturn.seasons = resolved

          forReturn = structureDataMxSeason(forReturn)

          return forReturn
        } catch (error) {
          console.log(error.message)
        }
      })
      let resolved = await Promise.allSettled(contentsPromise)
      resolved = resolved
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value)
      console.log(
        `end $$-Current-page:${i}||Total-pages:${totalPages}||Total-items:${contents.length}`
      )
      for (const iterator of resolved) {
        try {
          require('../../../connections/db')
          await Bhws.create(iterator)
          console.log('created-' + iterator.title)
        } catch (error) {
          console.log('failed-' + iterator.title)
          console.log(error.message)
        }
      }

      isStop = isNextPage
      i = i + 1
      //each season
    }
    console.log('end***********************')
  } catch (error) {
    console.log(error)
  }
}

ListScraper()
