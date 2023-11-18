const axios = require('axios')
const cheerio = require('cheerio')
const { successCall, USER_AGENT } = require('../common')
const CryptoJS = require('crypto-js')
const config = require('../../../config')
const BASE_URL = config.ANIME_BASE_URL
const ajax_url = 'https://ajax.gogo-load.com/'
const list_episodes_url = `${ajax_url}ajax/load-list-episode`
const BASE_URL2 = 'https://gogoanime.gg/'
const keys = {
  key: CryptoJS.enc.Utf8.parse('37911490979715163134003223491201'),
  second_key: CryptoJS.enc.Utf8.parse('54674138327930866480207815084989'),
  iv: CryptoJS.enc.Utf8.parse('3134003223491201'),
}

/**
 * Parses the embedded video URL to encrypt-ajax.php parameters
 * @param {cheerio} $ Cheerio object of the embedded video page
 * @param {string} id Id of the embedded video URL
 */
const generateEncryptAjaxParameters = async ($, id) => {
  // encrypt the key
  const encrypted_key = CryptoJS.AES['encrypt'](id, keys.key, {
    iv: keys.iv,
  })
  const script = $('script[data-name="episode"]').data().value
  const token = CryptoJS.AES['decrypt'](script, keys.key, {
    iv: keys.iv,
  }).toString(CryptoJS.enc.Utf8)

  return 'id=' + encrypted_key + '&alias=' + id + '&' + token
}
/**
 * Decrypts the encrypted-ajax.php response
 * @param {object} obj Response from the server
 */
const decryptEncryptAjaxResponse = (obj) => {
  const decrypted = CryptoJS.enc.Utf8.stringify(
    CryptoJS.AES.decrypt(obj.data, keys.second_key, {
      iv: keys.iv,
    })
  )
  return JSON.parse(decrypted)
}
exports.scrapeAnimeDetails = async ({ id }) => {
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

exports.scrapeMP4 = async ({ id }) => {
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

exports.scrapeAnimeDetailsForCron = async (id) => {
  try {
    const epList = []
    const animePageTest = await successCall(
      `https://gogoanime.gg/category/${id}`
    )

    const $ = cheerio.load(animePageTest.data)

    const ep_end = $('#episode_page > li').last().find('a').attr('ep_end')
    const ep_start = $('#episode_page > li').first().find('a').attr('ep_start')
    const movie_id = $('#movie_id').attr('value')
    const alias = $('#alias_anime').attr('value')
    const status = $('div.anime_info_body_bg > p:nth-child(8) > a').text()
    const html = await successCall(
      `${list_episodes_url}?ep_start=${ep_start}&ep_end=${ep_end}&id=${movie_id}&default_ep=${0}&alias=${alias}`
    )
    const $$ = cheerio.load(html.data)
    $$('#episode_related > li').each((i, el) => {
      epList.push({
        episodeId: $(el).find('a').attr('href').split('/')[1],
        episodeNum: $(el).find('div.name').text().replace('EP ', ''),
        url: BASE_URL + $(el).find('a').attr('href').trim(),
      })
    })
    return {
      status: status,
      latestEpisode: ep_end,
      episodesList: epList,
      success: true,
    }
  } catch (err) {
    return {
      error: err,
      success: false,
    }
  }
}
