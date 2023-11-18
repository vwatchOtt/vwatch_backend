const cheerio = require('cheerio')

const { USER_AGENT } = require('../../../config')
const { successCall } = require('../../utility/helperFunc')
const {
  generateEncryptAjaxParameters,
  decryptEncryptAjaxResponse,
} = require('./helpers')
const ajax_url = 'https://ajax.gogo-load.com/'
const list_episodes_url = `${ajax_url}ajax/load-list-episode`
const BASE_URL2 = 'https://gogoanime.gg/'
const defaultLimit = 9999999999
const Content = require('../../schema/content')
const { sendTelegramLog } = require('../../utility/sendTeleLogs')
const config = require('../../../config')
const BASE_URL = config.ANIME_BASE_URL

exports.structureAnime = (content, filter = []) => {
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
    episodes: [],
    currentLang: content.currectLanguage,
    filters: filter,
  }
  return structuredData
}
exports.scrapeStreamingUrl = async ({ id }) => {
  try {
    if (!id) {
      throw Error('Episode id not found')
    }
    const epPage = await successCall(BASE_URL2 + id)
    const $ = cheerio.load(epPage.data)

    const server = $('#load_anime > div > div > iframe').attr('src')
    const serverUrl = new URL(server)

    const goGoServerPage = await successCall(serverUrl.href)
    const $$ = cheerio.load(goGoServerPage.data)

    const params = await generateEncryptAjaxParameters(
      $$,
      serverUrl.searchParams.get('id')
    )
    const fetchRes = await successCall(
      `${serverUrl.protocol}//${serverUrl.hostname}/encrypt-ajax.php?${params}`,
      {
        headers: {
          'User-Agent': USER_AGENT,
          'X-Requested-With': 'XMLHttpRequest',
        },
      }
    )

    const res = decryptEncryptAjaxResponse(fetchRes.data)

    if (!res.source)
      return { error: 'No sources found!! Try different source.' }

    return {
      defaultStreamingUrl: server,
      permanentStreamingUrl: res['source'][0].file,
      temporaryStreamingUrl: res['source_bk'][0].file,
    }
  } catch (err) {
    return false
  }
}
exports.scrapeAnimeDetails = async (id) => {
  try {
    const categories = []
    const epList = []
    const langModifyr = {
      sub: 'eng-sub',
      dub: 'eng-dub',
      hindi: 'hindi-dub',
    }
    const animePageTest = await successCall(
      `https://gogoanime.gg/category/${id}`
    )
    if (!animePageTest) {
      return false
    }
    const $ = cheerio.load(animePageTest.data)

    const title = $('div.anime_info_body_bg > h1').text()
    const animeImage = $('div.anime_info_body_bg > img').attr('src')
    const type = $('div.anime_info_body_bg > p:nth-child(4) > a').text()
    const desc = $('div.anime_info_body_bg > p:nth-child(5)')
      .text()
      .replace('Plot Summary: ', '')
    const releasedYear = $('div.anime_info_body_bg > p:nth-child(7)')
      .text()
      .replace('Released: ', '')
    const status = $('div.anime_info_body_bg > p:nth-child(8) > a').text()
    const otherName = $('div.anime_info_body_bg > p:nth-child(9)')
      .text()
      .replace('Other name: ', '')
      .replace(/;/g, ',')

    $('div.anime_info_body_bg > p:nth-child(6) > a').each((i, elem) => {
      categories.push($(elem).attr('title').trim())
    })

    const ep_start = $('#episode_page > li').first().find('a').attr('ep_start')
    const ep_end = $('#episode_page > li').last().find('a').attr('ep_end')
    const movie_id = $('#movie_id').attr('value')
    const alias = $('#alias_anime').attr('value')

    const html = await successCall(
      `${list_episodes_url}?ep_start=${ep_start}&ep_end=${ep_end}&id=${movie_id}&default_ep=${0}&alias=${alias}`
    )

    const $$ = cheerio.load(html.data)
    let currectLanguage = ''
    $$('#episode_related > li').each((i, el) => {
      const lang = $(el).find('div.cate').text().trim()
      if (!currectLanguage && lang) {
        currectLanguage = langModifyr[lang.toLowerCase()]
      }
      epList.push({
        episodeId: $(el).find('a').attr('href').split('/')[1],
        episodeNum: $(el).find('div.name').text().replace('EP ', ''),
        url: BASE_URL + $(el).find('a').attr('href').trim(),
      })
    })
    return {
      id: id,
      title: title.toString(),
      type: type.toString(),
      releasedYear: releasedYear.toString(),
      status: status.toString(),
      categories: categories,
      otherNames: otherName,
      description: desc.toString(),
      img: animeImage.toString(),
      totalEpisodes: ep_end,
      episodesList: epList,
      ...(currectLanguage && { currectLanguage: currectLanguage }),
    }
  } catch (err) {
    return false
  }
}

exports.animeContentIdTodb = async (contentId, filter = []) => {
  try {
    await sendTelegramLog(
      `Anime found trying to add in db...-${contentId}`,
      'animeFilter'
    )
    const content = await this.scrapeAnimeDetails(contentId)
    if (!content) {
      await sendTelegramLog(
        `Anime not able to fetch-${contentId}`,
        'animeFilter'
      )
    }
    const structuredData = this.structureAnime(content, filter)

    await Content.create(structuredData)

    await sendTelegramLog(
      `Anime added-${structuredData.contentId}`,
      'animeFilter'
    )
  } catch (error) {
    await sendTelegramLog(
      `error-${error.message}\ncontentId:${contentId}`,
      'animeFilter'
    )
  }
}
const filters = {
  ['recent-episodes-updates']: `${ajax_url}ajax/page-recent-release.html`,
  ['popular-anime']: `${BASE_URL}/popular.html`,
  ['new-movies']: `${BASE_URL}/anime-movies.html`,
  ['new-seasons']: `${BASE_URL}/new-season.html`,
  ['top-airing']: `${ajax_url}ajax/page-recent-release-ongoing.html`,
}
exports.latestEpisodes = async (limit = defaultLimit) => {
  try {
    const list = []
    let hasMore = true
    let pageNum = 1
    while (hasMore) {
      if (list.length >= limit) {
        break
      }
      const url = `${filters['recent-episodes-updates']}?page=${pageNum}&type=1`
      const mainPage = await successCall(url)
      if (!mainPage) {
        hasMore = false
        continue
      }
      const $ = cheerio.load(mainPage.data)
      const isValidPage = $('li.selected>a').attr('href')
      if (!isValidPage) {
        hasMore = false
        continue
      }
      $('div.last_episodes.loaddub > ul > li').each(async (i, el) => {
        const object = {
          id: $(el)
            .find('p.name > a')
            .attr('href')
            .split('/')[1]
            .split('-episode-')[0],
          episodeId: $(el).find('p.name > a').attr('href').split('/')[1],
          title: $(el).find('p.name > a').attr('title'),
          episodeNum: $(el)
            .find('p.episode')
            .text()
            .replace('Episode ', '')
            .trim(),
          subOrDub: $(el)
            .find('div > a > div')
            .attr('class')
            .replace('type ic-', ''),
          img: $(el).find('div > a > img').attr('src'),
          url: BASE_URL + '/' + $(el).find('p.name > a').attr('href'),
        }

        list.push(object)
      })
      pageNum++
    }
    for (let i = 0; i < list.length; i++) {
      const detailedData = await successCall(list[i].url)
      if (detailedData) {
        const $ = cheerio.load(detailedData.data)
        const idInfo = $('div.anime-info > a').attr('href')
        const desiredPart = idInfo.replaceAll('category', '')
        list[i].id = desiredPart.replaceAll('/', '')
      }
    }
    return list
  } catch (err) {
    await sendTelegramLog(
      `error-${err.message}\n function -> latestEpisodes`,
      'animeFilter'
    )
  }
}

exports.popularAnime = async (limit = defaultLimit) => {
  try {
    const list = []
    let hasMore = true
    let pageNum = 1
    while (hasMore) {
      if (list.length >= limit) {
        break
      }
      const url = `${filters['popular-anime']}?page=${pageNum}`
      const popularPage = await successCall(url)
      const page = await successCall(url)
      if (!page) {
        hasMore = false
        continue
      }
      const $ = cheerio.load(popularPage.data)
      const isValidPage = $('li.selected>a').attr('href')
      if (!isValidPage) {
        hasMore = false
        continue
      }
      $('div.last_episodes > ul > li').each((i, el) => {
        list.push({
          id: $(el).find('p.name > a').attr('href').split('/')[2],
          title: $(el).find('p.name > a').attr('title'),
          img: $(el).find('div > a > img').attr('src'),
          releasedYear: $(el)
            .find('p.released')
            .text()
            .replace('Released: ', '')
            .trim(),
          url: BASE_URL + '/' + $(el).find('p.name > a').attr('href'),
        })
      })
      pageNum++
    }
    return list
  } catch (err) {
    await sendTelegramLog(
      `error-${err.message}\n function -> popularAnime`,
      'animeFilter'
    )
  }
}

exports.newMovies = async (limit = defaultLimit) => {
  try {
    let pageNum = 1
    let hasMore = true
    const list = []
    while (hasMore) {
      if (list.length >= limit) {
        break
      }
      const url = `${filters['new-movies']}?page=${pageNum}`
      const page = await successCall(url)
      if (!page) {
        hasMore = false
        continue
      }
      const $ = cheerio.load(page.data)
      const isValidPage = $('li.selected>a').attr('href')
      if (!isValidPage) {
        hasMore = false
        continue
      }
      $('div.last_episodes > ul > li').each((i, el) => {
        list.push({
          id: $(el).find('p.name > a').attr('href').split('/')[2],
          title: $(el).find('p.name > a').attr('title'),
          img: $(el).find('div > a > img').attr('src'),
          releasedYear: $(el)
            .find('p.released')
            .text()
            .replace('Released: ', '')
            .trim(),
          url: BASE_URL + '/' + $(el).find('p.name > a').attr('href'),
        })
      })
      pageNum++
    }
    return list
  } catch (err) {
    await sendTelegramLog(
      `error-${err.message}\n function -> newMovies`,
      'animeFilter'
    )
  }
}
exports.newSeason = async (limit = defaultLimit) => {
  try {
    let pageNum = 1
    let hasMore = true
    const list = []
    while (hasMore) {
      if (list.length >= limit) {
        break
      }
      const url = `${filters['new-seasons']}?page=${pageNum}`
      const popularPage = await successCall(url)
      if (!popularPage) {
        hasMore = false
        continue
      }
      const $ = cheerio.load(popularPage.data)
      const isValidPage = $('li.selected>a').attr('href')
      if (!isValidPage) {
        hasMore = false
        continue
      }
      $('div.last_episodes > ul > li').each((i, el) => {
        list.push({
          id: $(el).find('p.name > a').attr('href').split('/')[2],
          title: $(el).find('p.name > a').attr('title'),
          img: $(el).find('div > a > img').attr('src'),
          releasedYear: $(el)
            .find('p.released')
            .text()
            .replace('Released: ', '')
            .trim(),
          url: BASE_URL + '/' + $(el).find('p.name > a').attr('href'),
        })
      })
      pageNum++
    }
    return list
  } catch (err) {
    await sendTelegramLog(
      `error-${err.message}\n function -> newSeason`,
      'animeFilter'
    )
  }
}
exports.topAiring = async (limit = defaultLimit) => {
  try {
    const list = []
    let pageNum = 1
    let hasMore = true

    while (hasMore) {
      if (list.length >= limit) {
        break
      }
      const url = `${filters['top-airing']}?page=${pageNum}`

      const popular_page = await successCall(url)
      if (!popular_page) {
        hasMore = false
        continue
      }
      const $ = cheerio.load(popular_page.data)

      const isValidPage = $('li.selected>a').attr('href')
      if (!isValidPage) {
        hasMore = false
        continue
      }
      $('div.added_series_body.popular > ul > li').each((i, el) => {
        const categories = []
        $(el)
          .find('p.genres > a')
          .each((i, el) => {
            categories.push($(el).attr('title'))
          })
        list.push({
          id: $(el).find('a:nth-child(1)').attr('href').split('/')[2],
          title: $(el).find('a:nth-child(1)').attr('title'),
          img: $(el)
            .find('a:nth-child(1) > div')
            .attr('style')
            .match('(https?://.*.(?:png|jpg))')[0],
          latestEp: $(el).find('p:nth-child(4) > a').text().trim(),
          url: BASE_URL + '/' + $(el).find('a:nth-child(1)').attr('href'),
          categories: categories,
        })
      })
      pageNum++
    }
    return list
  } catch (err) {
    await sendTelegramLog(
      `error-${err.message}\n function -> topAiring`,
      'animeFilter'
    )
  }
}

//year bases scrape
exports.yearlyAnime = async (year, limit = defaultLimit) => {
  try {
    let pageNum = 1
    let hasMore = true
    let allDataOfThisYear = []
    while (hasMore) {
      if (allDataOfThisYear.length >= limit) {
        break
      }
      const popularPage = await successCall(
        `https://gogoanime3.net/filter.html?year%5B%5D=${year}&sort=title_az&page=${pageNum}`
      )
      if (!popularPage) {
        hasMore = false
        continue
      }
      const $ = cheerio.load(popularPage.data)
      const isValidPage = $('li.selected>a').attr('href')
      if (!isValidPage) {
        hasMore = false
        continue
      }
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
        const advanceData = await this.scrapeAnimeDetails(basicDetatils.id)
        if (!advanceData) {
          await sendTelegramLog(
            `not able to fecth -${basicDetatils.id}`,
            'animeFilter'
          )
        }
        advanceData.episodesList = advanceData.episodesList.reverse()
        const content = { ...basicDetatils, ...advanceData }
        return content
      })
      allAnimeBoxesPromises = await Promise.allSettled(allAnimeBoxesPromises)
      const fulfilledPromises = allAnimeBoxesPromises
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value)
      if (fulfilledPromises.length != allAnimeBoxes.length) {
        await sendTelegramLog(
          'one of any promise is rejected during fetch yearly data',
          'animeFilter'
        )
      }
      allDataOfThisYear = allDataOfThisYear.concat(fulfilledPromises)
      pageNum++
    }
    return allDataOfThisYear
  } catch (error) {
    await sendTelegramLog(
      `Something is wrong during fetch yearly data, error - ${error.message}`,
      'animeFilter'
    )
  }
}
