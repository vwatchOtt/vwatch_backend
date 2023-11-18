const { default: axios } = require('axios')
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
require('../../../connections/db')
const Content = require('../../../src/schema/content')
const { scrapeAnimeDetails } = require('./gogoAnimeFunc')
//year bases scrape
const scrape = async ({ year, page }) => {
  try {
    const popularPage = await axios.get(
      `https://gogoanime3.net/filter.html?year%5B%5D=${year}&sort=title_az&page=${page}`
    )
    //
    const $ = cheerio.load(popularPage.data)
    const allAnimeBoxes = $('div.last_episodes > ul > li')
    let allAnimeBoxesPromises = allAnimeBoxes.map(async (i, el) => {
      const basicDetatils = {
        id: $(el).find('p.name > a').attr('href').split('/')[2],
        title: $(el).find('p.name > a').attr('title'),
        img: $(el).find('div > a > img').attr('src'),
        releasedYear: $(el)
          .find('p.released')
          .text()
          .replace('Released: ', '')
          .trim(),
      }
      try {
        const advanceData = await scrapeAnimeDetails({ id: basicDetatils.id })
        advanceData.episodesList = advanceData.episodesList.reverse()
        const content = { ...basicDetatils, ...advanceData }
        return content
      } catch (error) {
        const errorData = {
          scrapeParameter: { year, page },
          contentId: basicDetatils.id,
          errorMessage: error.message,
        }
        fs.appendFileSync(
          path.join(__dirname, 'rejected_logs.json'),
          JSON.contentify(errorData) + '\n'
        )
        throw error.message
      }
    })
    allAnimeBoxesPromises = await Promise.allSettled(allAnimeBoxesPromises)
    const rejectedPromises = allAnimeBoxesPromises
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason)

    const fulfilledPromises = allAnimeBoxesPromises
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value)
    if (rejectedPromises.length > 0) {
      fs.appendFileSync(
        path.join(__dirname, 'rejected_logs.json'),
        JSON.stringify(rejectedPromises, null, 2) + '\n'
      )
    }
    return fulfilledPromises
  } catch (error) {
    console.log(error, 'scrape function')
  }
}

const updateDb = async ({ year, page }) => {
  const fetchData = await scrape({ year: year, page: page })
  const dbAddPromises = fetchData.map(async (content) => {
    try {
      let isMovie = false
      if (content.type == 'Movie') {
        isMovie = true
      }
      const structuredData = {
        contentId: content.id,
        title: content.title,
        type: content.type,
        releasedYear: content.releasedYear,
        status: content.status.toLowerCase(),
        categories: content.categories,
        otherTitle: content.otherNames,
        description: content.description,
        image: content.img,
        latestEpisode: content.totalEpisodes,
        isMovie: isMovie,
        defaultStreamingUrl: '',
        episodes: content.episodesList,
        currentLang: content.currectLanguage,
      }
      const created = await Content.create(structuredData)
      if (!created) {
        console.log('something went weong --> ', content.id)
      }
      return created
    } catch (error) {
      fs.appendFileSync(
        path.join(__dirname, 'rejected_logs.json'),
        JSON.stringify(content.id) +
          `->${year}-${page}` +
          '->' +
          error.message +
          '<-' +
          '\n'
      )
      console.log(error.message, 'update db function')
      throw error
    }
  })
  const resolved = await Promise.allSettled(dbAddPromises)
  const fulfilledPromises = resolved
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value)
  console.log(`${fulfilledPromises.length}-added >fetched ${fetchData.length}`)
  return
}

async function startScript() {
  //need to check 2013 to 2015
  // const year = 2013;
  // const startPage = 4;
  // const endPage = 23;
  // console.log(await Content.count({ status: 'upcoming' }));
  // console.log(await Content.count({ status: 'ongoing' }));
  // console.log(await Content.count({ status: 'completed' }));
  // console.log(await Content.count({ type: 'ONA' }));

  const startYear = 1800
  const endYear = 1900
  const startPage = 1
  for (let year = startYear; year <= endYear; year++) {
    const getPages = await axios.get(
      `https://gogoanime3.net/filter.html?year%5B%5D=${year}&sort=title_az&page=${999}`
    )
    const $ = cheerio.load(getPages.data)
    let lastLiText = $('.pagination-list > li').last().text()
    if (!lastLiText) {
      lastLiText = '1'
    }
    const endPage = parseInt(lastLiText)
    console.log('found pages-' + lastLiText)
    for (let page = startPage; page <= endPage; page++) {
      await updateDb({ year, page })
      console.log(page + '-scraped-' + year)
    }
  }

  process.exit()
}
startScript()
