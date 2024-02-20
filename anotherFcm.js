const { default: axios } = require('axios')

const triggerNotification = async (
  deviceToken,
  title = 'hi',
  body = 'text',
  extraData = {}
) => {
  try {
    const FIREBASE_SERVER_KEY =
      'AAAAoCnqUBQ:APA91bF5irGM2C7F6d5b2EDngIk149wr4nn6naoxIG5cdXmHVfQZfMkq2TFtzo61ZHyuRrOVixfWSRe5PlAUO5AN7IP3VFKQ3AvHZn5FUXHB-_M_rqwpnzBzEnRunvL6eL7EblttcqK4'

    const url = 'https://fcm.googleapis.com/fcm/send'
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `key=${FIREBASE_SERVER_KEY}`,
    }

    const notifyData = {
      to: 'e64-B1qZTieskL32qsmUVq:APA91bEvG3QAxelyro7gORlwOCWpajTP0XFDdYPpwup-iMhH6IuokkeftHpEKRRj-Bkx_8VwNxZKGeEK34qTvGLSk5pUXMqRm3zGaXFDLm-H-rzdgv3fKyg9c96T4yGempIOe1HNuoS6',
      notification: {
        title: title,
        body: body,
      },
      data: {
        extraData: extraData,
      },
    }

    const response = await axios.post(url, notifyData, { headers })
    console.log('Successfully sent with response: ', response.data)
    return true
  } catch (error) {
    console.error('Something went wrong!', error.response.data)
    return false
  }
}
triggerNotification()
