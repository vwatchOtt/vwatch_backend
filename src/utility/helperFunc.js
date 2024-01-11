const axios = require('axios')
const { sendTelegramLog } = require('./sendTeleLogs')
const natural = require('natural')

exports.generateRandomString = (length) => {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('')
}
exports.successCall = async (
  url,
  header = {
    headers: { 'User-Agent': this.USER_AGENT },
  }
) => {
  const MAX_RETRIES = 50
  const RETRY_INTERVAL_MS = 1000
  let retries = 0
  while (retries < MAX_RETRIES) {
    try {
      // url = await bindProxy(url);
      const res = await axios.get(url, header)
      if (res.status != 200) {
        throw new Error('try block error')
      }
      return res // Return only the response data instead of the entire response object
    } catch (error) {
      if (error?.response?.status == 404) {
        return false
      }
      retries++
      if (retries == 3) {
        console.error(`Attempt ${retries} failed: ${error.message} url-${url}`)
      }
      if (retries > 15) {
        console.error(`Attempt ${retries} failed: ${error.message} url-${url}`)
        await new Promise((resolve) => setTimeout(resolve, 120000))
      }
      if (retries < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS))
      } else {
        await sendTelegramLog(`Failed after ${MAX_RETRIES} attempts.${url}`)
        process.exit()
      }
    }
  }
}

// Function to calculate Levenshtein distance
exports.checkApproxSimilarity = (str1, str2, str3) => {
  const similarityApprox = 1
  const data = natural.LevenshteinDistance(
    str1.toLowerCase(),
    str2.toLowerCase()
  )
  const data2 = natural.LevenshteinDistance(
    str1.toLowerCase(),
    str3.toLowerCase()
  )
  console.log(`matching results ${data}-${data2}`)

  if (data < similarityApprox || data2 < similarityApprox) {
    sendTelegramLog(
      `Matching results => \n ${str1} \n ${str2} \n ${str3} \n percentage->${data}-${data2}`,
      'myAnimeListUpdates'
    )
    return true
  } else return false
}

exports.removeDubVariationsFromString = (inputString) => {
  const result = inputString.replace(/(\s?-dub\s?|\(.*?\))/gi, '')
  return result
}
exports.processPromisesInChunks = async (promises, chunkSize) => {
  const resolvedPromises = []

  for (let i = 0; i < promises.length; i += chunkSize) {
    const chunk = promises.slice(i, i + chunkSize)
    const chunkResults = await Promise.allSettled(chunk)
    resolvedPromises.push(...chunkResults)
  }

  return resolvedPromises
}
exports.generateConversationId = () => {
  // Get the current timestamp
  const timestamp = new Date().getTime()

  // Generate a random number (you can customize the range if needed)
  const randomNum = Math.floor(Math.random() * 1000)

  // Concatenate the timestamp and random number to create a unique ID
  const conversationId = `${timestamp}-${randomNum}`

  return conversationId
}

exports.formatTimestamp = (timestamp) => {
  console.log(timestamp)
  if (timestamp) {
    const date = timestamp.toDate()
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'pm' : 'am'
    const formattedHours = hours % 12 || 12
    return `${formattedHours}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`
  }
  return ''
}
