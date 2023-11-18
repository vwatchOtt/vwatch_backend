const axios = require('axios')
const cheerio = require('cheerio')

const {
  generateEncryptAjaxParameters,
  decryptEncryptAjaxResponse,
} = require('./helpers/extractors/goload.js')
const { USER_AGENT } = require('./utils.js')
const { animeCategories } = require('../bhws/constants.js')
const config = require('../../config.js')
const BASE_URL = config.ANIME_BASE_URL
const BASE_URL2 = 'https://gogoanime.gg/'
const ajax_url = 'https://ajax.gogo-load.com/'
const anime_movies_path = '/anime-movies.html'
const popular_path = '/popular.html'
const new_season_path = '/new-season.html'
const search_path = '/search.html'
const popular_ongoing_url = `${ajax_url}ajax/page-recent-release-ongoing.html`
const recent_release_url = `${ajax_url}ajax/page-recent-release.html`
const list_episodes_url = `${ajax_url}ajax/load-list-episode`

const DownloadReferer = 'https://goload.pro/'

const disqus_iframe = (episodeId) =>
  `https://disqus.com/embed/comments/?base=default&f=gogoanimetv&t_u=https%3A%2F%2Fgogoanime.vc%2F${episodeId}&s_o=default#version=cfefa856cbcd7efb87102e7242c9a829`
const disqus_api = (threadId, page) =>
  `https://disqus.com/api/3.0/threads/listPostsThreaded?limit=100&thread=${threadId}&forum=gogoanimetv&order=popular&cursor=${page}:0:0&api_key=E8Uh5l5fHZ6gD8U3KycjAIAk46f68Zw7C6eW8WSjZvCLXebZ7p0r1yrYDrLilk2F`

const Categories = animeCategories

const isSubDub = async (data) => {
  const upgradeData = await Promise.all(
    data.map(async (anime) => {
      anime.isDub = null
      try {
        if (anime.subOrDub == 'DUB') {
          return anime
        }
        if (!anime.subOrDub) {
          anime.subOrDub = 'SUB'
          const isDubAvailable = anime.id.includes('-dub')
          if (isDubAvailable) {
            anime.subOrDub = 'DUB'
            anime.isDub = anime.id
            anime.id = anime.id.replace(/-dub/, '')
            return anime
          }
        }
        const searchPage = await axios.get(
          BASE_URL2 + 'category/' + anime.id + '-dub'
        )
        const $ = cheerio.load(searchPage.data)
        const status = $('div.anime_info_body_bg > p:nth-child(8) > a').text()
        if (status) {
          anime.isDub = anime.id + '-dub'
        }
        return anime
      } catch (error) {
        // Handle error here if needed
      }
      return anime
    })
  )
  const uniqueAnimeMap = {}
  const uniqueAnimeList = []

  upgradeData.forEach((anime) => {
    if (!uniqueAnimeMap[anime.id]) {
      uniqueAnimeMap[anime.id] = true
      uniqueAnimeList.push(anime)
    }
  })

  console.log(uniqueAnimeList)
  return uniqueAnimeList
}

const scrapeMP4 = async ({ id }) => {
  const sources = []
  const sources_bk = []
  try {
    let epPage, server, $, serverUrl

    if (id) {
      epPage = await axios.get(BASE_URL2 + id)
      $ = cheerio.load(epPage.data)

      server = $('#load_anime > div > div > iframe').attr('src')
      serverUrl = new URL(server)
    } else throw Error('Episode id not found')

    const goGoServerPage = await axios.get(serverUrl.href, {
      headers: { 'User-Agent': USER_AGENT },
    })
    const $$ = cheerio.load(goGoServerPage.data)

    const params = await generateEncryptAjaxParameters(
      $$,
      serverUrl.searchParams.get('id')
    )

    const fetchRes = await axios.get(
      `
      ${serverUrl.protocol}//${serverUrl.hostname}/encrypt-ajax.php?${params}`,
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

    res.source.forEach((source) => sources.push(source))
    res.source_bk.forEach((source) => sources_bk.push(source))

    return {
      Referer: serverUrl.href,
      sources: sources,
      sources_bk: sources_bk,
    }
  } catch (err) {
    return { error: err }
  }
}
const scrapeSearch = async ({ list = [], keyw, page = 1 }) => {
  try {
    const searchPage = await axios.get(
      `${BASE_URL + search_path}?keyword=${keyw}&page=${page}`
    )
    const $ = cheerio.load(searchPage.data)

    $('div.last_episodes > ul > li').each((i, el) => {
      list.push({
        id: $(el).find('p.name > a').attr('href').split('/')[2],
        title: $(el).find('p.name > a').attr('title'),
        url: BASE_URL + '/' + $(el).find('p.name > a').attr('href'),
        img: $(el).find('div > a > img').attr('src'),
        releasedYear: $(el).find('p.released').text().trim().slice(-4),
      })
    })

    return list
  } catch (err) {
    console.log(err)
    return { error: err }
  }
}

const scrapeRecentRelease = async ({ list = [], page = 1, type = 1 }) => {
  try {
    const mainPage = await axios.get(`
        ${recent_release_url}?page=${page}&type=${type}
        `)
    const $ = cheerio.load(mainPage.data)

    $('div.last_episodes.loaddub > ul > li').each((i, el) => {
      list.push({
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
      })
    })
    return list
  } catch (err) {
    console.log(err)
    return { error: err }
  }
}

const scrapeNewSeason = async ({ list = [], page = 1 }) => {
  try {
    const popularPage = await axios.get(`
        ${BASE_URL + new_season_path}?page=${page}
        `)
    const $ = cheerio.load(popularPage.data)

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
    return list
  } catch (err) {
    console.log(err)
    return { error: err }
  }
}

const scrapePopularAnime = async ({ list = [], page = 1 }) => {
  try {
    const popularPage = await axios.get(`
        ${BASE_URL + popular_path}?page=${page}
       `)
    const $ = cheerio.load(popularPage.data)

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
    return list
  } catch (err) {
    console.log(err)
    return { error: err }
  }
}

const scrapeAnimeMovies = async ({ list = [], aph = '', page = 1 }) => {
  try {
    const popularPage = await axios.get(`
        ${BASE_URL + anime_movies_path}?aph=${aph
          .trim()
          .toUpperCase()}&page=${page}
        `)
    const $ = cheerio.load(popularPage.data)

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
    return list
  } catch (err) {
    console.log(err)
    return { error: err }
  }
}

const scrapeTopAiringAnime = async ({ list = [], page = 1 }) => {
  try {
    if (page == -1) {
      let pageNum = 1
      let hasMore = true
      while (hasMore) {
        const popular_page = await axios.get(`
                ${popular_ongoing_url}?page=${pageNum}
                `)
        const $ = cheerio.load(popular_page.data)

        if ($('div.added_series_body.popular > ul > li').length == 0) {
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
    }

    const popular_page = await axios.get(`
        ${popular_ongoing_url}?page=${page}
        `)
    const $ = cheerio.load(popular_page.data)

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

    return list
  } catch (err) {
    console.log(err)
    return { error: err }
  }
}

const scrapeGenre = async ({ list = [], genre, page = 1 }) => {
  try {
    genre = genre.trim().replace(/ /g, '-').toLowerCase()

    if (Categories.indexOf(genre) > -1) {
      const genrePage = await axios.get(
        `${BASE_URL}genre/${genre}?page=${page}`
      )
      const $ = cheerio.load(genrePage.data)

      $('div.last_episodes > ul > li').each((i, elem) => {
        list.push({
          id: $(elem).find('p.name > a').attr('href').split('/')[2],
          title: $(elem).find('p.name > a').attr('title'),
          img: $(elem).find('div > a > img').attr('src'),
          releasedYear: $(elem)
            .find('p.released')
            .text()
            .replace('Released: ', '')
            .trim(),
          url: BASE_URL + '/' + $(elem).find('p.name > a').attr('href'),
        })
      })
      return list
    }
    return { error: 'Genre Not Found' }
  } catch (err) {
    console.log(err)
    return { error: err }
  }
}

// scrapeGenre({ genre: "cars", page: 1 }).then((res) => console.log(res))

/**
 * @param {string} id anime id.
 * @returns Resolves when the scraping is complete.
 * @example
 * scrapeGoGoAnimeInfo({id: "naruto"})
 * .then((res) => console.log(res)) // => The anime information is returned in an Object.
 * .catch((err) => console.log(err))
 *
 */

const scrapeAnimeDetails = async ({ id }) => {
  try {
    const categories = []
    const epList = []
    const langModifyr = {
      sub: 'eng-sub',
      dub: 'eng-dub',
      hindi: 'hindi-dub',
    }
    const animePageTest = await axios.get(`https://gogoanime.gg/category/${id}`)

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

    const html = await axios.get(
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
    // let firstEpisodeUrl = '';
    // if (epList.length > 0) {
    //   let scrap = await scrapeMP4({
    //     id: epList[epList.length - 1].episodeId,
    //   });
    //   firstEpisodeUrl = scrap.sources[0].file;
    // }
    return {
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
    console.log(err)
    return { error: err }
  }
}
const scrapeThread = async ({ episodeId, page = 0 }) => {
  try {
    let threadId = null

    const thread_page = await axios.get(
      disqus_iframe(decodeURIComponent(episodeId))
    )
    const $ = cheerio.load(thread_page.data, { xmlMode: true })

    const thread = JSON.parse($('#disqus-threadData')[0].children[0].data)

    if (thread.code === 0 && thread.cursor.total > 0) {
      threadId = thread.response.thread.id
    }

    const thread_api_res = (await axios.get(disqus_api(threadId, page))).data

    return {
      threadId: threadId,
      currentPage: page,
      hasNextPage: thread_api_res.cursor.hasNext,
      comments: thread_api_res.response,
    }
  } catch (err) {
    if (err.response.status === 400) {
      return { error: 'Invalid page. Try again.' }
    }
    return { error: err }
  }
}

module.exports = {
  scrapeGenre,
  scrapeTopAiringAnime,
  scrapeAnimeMovies,
  scrapePopularAnime,
  scrapeNewSeason,
  scrapeRecentRelease,
  scrapeSearch,
  scrapeAnimeDetails,
  scrapeMP4,
  scrapeThread,
  isSubDub,
  DownloadReferer,
}

// scrapeSearch({ keyw: "attack on titan" }).then(async (resp) => {
//     console.log(await isSubDub(resp))

// })
