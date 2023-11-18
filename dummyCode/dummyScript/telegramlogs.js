const axios = require('axios')

const BOT_TOKEN = '5871783855:AAHB0Q8NuUn_IRRls67J5u6P228bQ04EZxM' // Replace with your Telegram bot token
const CHAT_ID = '1120121505' // Replace with the chat or channel ID where you want to send logs

// Function to send log messages to Telegram
exports.sendTelegramLog = async (message, send) => {
  try {
    if (send == 'true') {
      const response = await axios.post(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          chat_id: CHAT_ID,
          text: message,
        }
      )
      if (response.data.ok) {
        console.log('Log sent successfully to Telegram.')
      } else {
        console.error(
          'Error sending log to Telegram:',
          response.data.description
        )
      }
    } else console.log(message)
    return
  } catch (error) {
    console.error('Error sending log to Telegram:', error.message)
  }
}
