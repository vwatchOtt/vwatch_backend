const { successCall } = require('../../utility/helperFunc')
const cheerio = require('cheerio')

exports.fetchItemsByType = (data, type) => {
  return data.filter((item) => item.type === type)
}
exports.myAnimeListIdToFetchCompleteDetails = async (id) => {
  try {
    const animeUrl = `https://myanimelist.net/anime/${id}/${'h'}/video`

    const animeResponse = await successCall(animeUrl, {
      headers: {
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.6',
        'Cache-Control': 'max-age=0',
        Cookie:
          'MALHLOGSESSID=41ea704c74d6af10e951537867b4f2da; top_signup_hidden=1; MALSESSIONID=3r76bfighhkke27pisr54hkds6; is_logged_in=1',
        'Sec-Ch-Ua':
          '"Not/A)Brand";v="99", "Brave";v="115", "Chromium";v="115"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': 'Windows',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Sec-Gpc': '1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      },
    })
    const animeHtml = animeResponse.data
    const $ = cheerio.load(animeHtml)
    const trailers = []
    $('.video-block.promotional-video a.iframe[href*="youtube.com"]').each(
      (index, element) => {
        const href = $(element).attr('href')
        trailers.push(href)
      }
    )
    const animeDetailsText = $('.leftside ').text()
    const regex = {
      broadcast: /Broadcast:\n\s+(.*)\n/,
      popularity: /Popularity:\n\s+#(\d+)/,
      members: /Members:\n\s+([\d,]+)/,
      ranked: /Ranked:\n\s+#(\d+)\d\b/,
      duration: /Duration:\n\s+(.*)\n/,
      theme: /Theme:\n\s+([^]*?)\n/,
      source: /Source:\n\s+(.*)\n/,
      studios: /Studios:\n\s+(.*)\n/,
      licensors: /Licensors:\n\s+(.*)\n/,
      producer: /Producers:\n\s+(.*)\n/,
      premiered: /Premiered:\n\s+(.*)\n/,
      myAnimeListDescription: /English:\s+(.*)\n/,
    }
    const data = {}
    data.trailers = trailers
    Object.keys(regex).forEach((key) => {
      const match = animeDetailsText.match(regex[key])
      if (match) {
        if (key === 'theme') {
          match[1] = match[1].replace(/(\w+)\1/g, '$1') //using this regex we can remove duplicate word from a string
        }
        data[key] = match[1].trim().replace(/\s+/g, ' ')
      }
    })

    return data
  } catch (error) {
    return false
  }
}
