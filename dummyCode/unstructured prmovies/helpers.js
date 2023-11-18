const axios = require('axios')
const config = require('../../config')
const cheerio = require('cheerio')
const Constants = require('./constants')
const { chromium } = require('playwright')
const path = require('path')
const splitStringToArray = (s) => {
  if (typeof s !== 'string') {
    return []
  }
  return s.split(',').filter((item) => item.trim() !== '')
}

const MAX_RETRIES = 50 // Set the maximum number of retries
const RETRY_INTERVAL_MS = 1000 // Set the interval (in milliseconds) between retries

const getProxyUrlData = async (url) => {
  let retries = 0
  while (retries < MAX_RETRIES) {
    try {
      // url = await bindProxy(url);
      const res = await axios.get(url, {
        headers: { 'User-Agent': config.USER_AGENT },
      })
      return res // Return only the response data instead of the entire response object
    } catch (error) {
      if (error?.response?.status == 404) {
        throw 'not found'
      }
      retries++
      console.error(`Attempt ${retries} failed: ${error.message} url-${url}`)
      if (retries < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS))
      } else {
        process.exit()
      }
    }
  }
}

// runParallelRequests(50);
const getContentByCategory = async (category = 'home', page = 1) => {
  try {
    let endPoint = ''
    if (Constants.categories.includes(category)) {
      endPoint =
        Constants.getContentByCategoryEndPoint + category + '/page/' + page
    } else if (Constants.director.includes(category)) {
      endPoint =
        Constants.getContentByDirectorEndPoint + category + '/page/' + page
    } else if (Constants.adultCategory == category) {
      endPoint = Constants.getAdultContentEndpoint + category + '&wpas=' + page
    } else if (Constants.searchKeyword.includes(category)) {
      endPoint =
        '/page/' + page + Constants.getContentBySearchEndPoint + category
    } else {
      endPoint = ''
    }

    console.log(endPoint)

    const resp = await getProxyUrlData(config.BHWS_BASE_URL + endPoint)
    const $ = cheerio.load(resp.data)
    const lists = []
    $('.movies-list-full > div').each((i, el) => {
      let id = $(el).find('a').attr('href')?.trim()
      if (!id) {
        return
      }
      const title = $(el).find('a').attr('oldtitle')?.trim()
      const language = $(el).find('.mli-quality').text()?.trim()
      const img = $(el).find('a > img').attr('data-original')?.trim()
      let rating = $(el).find('div > .jt-imdb').text().trim()
      const releasedYear = $(el).find('.jt-info > a').text().trim()
      const duration = $(el).find('.jt-info:nth-child(3)').text().trim()
      if (rating) {
        rating = rating.split(':')[1].trim()
      }
      id = path.basename(id)

      lists.push({
        id,
        title,
        language,
        img,
        rating,
        duration,
        releasedYear,
      })
    })

    return lists
  } catch (error) {
    console.log(error.message)
    throw error
  }
}
const getContentDetails = async (contentId) => {
  try {
    const resp = await getProxyUrlData(`${config.BHWS_BASE_URL}${contentId}`)

    const $ = cheerio.load(resp.data)
    const list = {}
    let img = $('#mv-info > a').attr('style')?.trim()
    if (img) {
      img = img.split('(')
      img = img[img.length - 1].replace(')', '')
    }
    list.otherImage = img
    const title = $('.mvic-desc > h3').text()
    list.title = title
    const description = $('.mvic-desc > div > p').text()
    list.description = description
    let categories = $('.mvici-left > p:nth-child(1)').text()
    categories = categories?.split(':')[1]?.trim()
    const director = $('.mvici-left > p:nth-child(2)').text()
    list.director = director?.split(':')[1]?.trim()
    let actors = $('.mvici-left > p:nth-child(3)').text()
    actors = actors?.trim()
    actors = actors[0] != 'C' ? actors?.split(':')[1] : []
    const duration = $('.mvici-right > p:nth-child(1)').text()
    list.duration = duration?.split(':')[1]?.trim()
    let quality = $('.mvici-right > p:nth-child(2)').text()
    quality = quality?.split(':')[1]?.trim()
    const releasedYear = $('.mvici-right > p:nth-child(3)').text()
    list.releasedYear = releasedYear.split(':')[1]?.trim()
    const rating = $('.imdb-r').text()
    list.rating = rating?.trim()
    list.categories = splitStringToArray(categories)
    list.actors = splitStringToArray(actors)

    if (quality) {
      list.currectLanguage = quality.toLowerCase()
    }
    return list
  } catch (error) {
    if (error == 'not found') {
      return error
    }
    throw error
  }
}

const scrapeStreamUrl = async (contentId) => {
  let url = ''
  try {
    const browser = await chromium.launch({
      headless: false,
    })
    const context = await browser.newContext({
      viewport: { width: 400, height: 600 },
    })
    const page = await context.newPage()
    page.route('**/*', (route) => {
      const request = route.request()
      if (
        request.resourceType() == 'stylesheet' ||
        request.resourceType() == 'image' ||
        request.resourceType() == 'font'
      ) {
        route.abort()
      } else {
        if (request.url().search('m3u8') != -1) {
          console.log(request.url())

          url = request.url()
          browser.close()
          return
        }
        return route.continue()
      }
    })
    await page.goto(contentId)
    return url
  } catch (error) {
    return url
  }
}

const SearchContent = async (keyword, page = 1) => {
  try {
    const endPoint =
      '/page/' + page + Constants.getContentBySearchEndPoint + keyword
    const resp = await getProxyUrlData(config.BHWS_BASE_URL + endPoint)
    const $ = cheerio.load(resp.data)
    const lists = []
    $('.movies-list-full > div').each((i, el) => {
      const id = $(el).find('a').attr('href')?.trim()
      if (!id) {
        return
      }
      const title = $(el).find('a').attr('oldtitle')?.trim()
      const language = $(el).find('.mli-quality').text()?.trim()
      const img = $(el).find('a > img').attr('data-original')?.trim()
      let rating = $(el).find('div > .jt-imdb').text().trim()
      const releasedYear = $(el).find('.jt-info > a').text().trim()
      const duration = $(el).find('.jt-info:nth-child(3)').text().trim()
      if (rating) {
        rating = rating.split(':')[1].trim()
      }
      lists.push({ id, title, language, img, rating, duration, releasedYear })
    })

    return {
      success: true,
      data: lists,
    }
  } catch (error) {
    console.log(error)
    return {
      success: false,
      data: [],
    }
  }
}

module.exports = {
  getContentByCategory,
  getContentDetails,
  scrapeStreamUrl,
  SearchContent,
  getProxyUrlData,
}
