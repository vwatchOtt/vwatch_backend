// const axios = require('axios')
const { TELEGRAM } = require('../../config')

exports.sendTelegramLog = async (message, send) => {
  try {
    if (!TELEGRAM[send]) {
      console.log(message)
      return
    }
    console.log(message)
    // const token = TELEGRAM[send].token
    // const chatId = TELEGRAM[send].chatId
    // const response = await axios.post(
    //   `https://api.telegram.org/bot${token}/sendMessage`,
    //   {
    //     chat_id: chatId,
    //     text: message,
    //   }
    // )
    // if (response.data.ok) {
    //   console.log('Log sent successfully to Telegram.')
    // } else {
    //   console.log('Error sending log to Telegram:', response.data.description)
    // }
    return
  } catch (error) {
    console.log('Error sending log to Telegram:', error.message)
  }
}
