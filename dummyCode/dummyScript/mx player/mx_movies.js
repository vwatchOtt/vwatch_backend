const { successCall } = require('../common')
const userId = '6bcadbf9-0c1b-4860-a2df-3ae85a119e83'
const { structureDataMxMovies } = require('./structureData')
const Bhws = require('../../../src/schema/bhws')
require('../../../connections/db')

const ListScraper = async () => {
  try {
    let i = 0
    let isStop = 1
    while (isStop != null) {
      const listingUrl = `https://api.mxplayer.in/v1/web/detail/browseItem?&pageSize=20&isCustomized=true&pageNum=${i}&type=1&device-density=2&userid=${userId}&platform=com.mxplay.desktop&content-languages=hi,en&kids-mode-enabled=false`
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
        `start $$-Current-page:${i}||Total-pages:${(
          totalPages / 20
        ).toString()}||Total-items:${contents.length}`
      )
      const contentsPromise = contents.map((item) => {
        try {
          const forReturn = structureDataMxMovies(item)
          return forReturn
        } catch (error) {
          console.log(error.message)
        }
      })
      for (const iterator of contentsPromise) {
        try {
          require('../../../connections/db')
          await Bhws.create(iterator)
          console.log('created-' + iterator.title)
        } catch (error) {
          console.log('failed-' + iterator.title)
          console.log(error.message)
        }
      }
      console.log(
        `end $$-Current-page:${i}||Total-pages:${(
          totalPages / 20
        ).toString()}||Total-items:${contents.length}`
      )
      isStop = isNextPage
      i = i + 1
    }
    console.log('end***********************')
  } catch (error) {
    console.log(error)
  }
}

ListScraper()
