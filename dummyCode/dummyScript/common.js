const MAX_RETRIES = 5000 // Set the maximum number of retries
const RETRY_INTERVAL_MS = 1000
const axios = require('axios')
const sendTelegramLog = require('./telegramlogs')
exports.successCall = async (
  url,
  header = {
    headers: { 'User-Agent': this.USER_AGENT },
  }
) => {
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
        throw 'not found'
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
