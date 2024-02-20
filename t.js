const { default: axios } = require('axios')

const triggerNotification = async (expoData) => {
  const data = JSON.stringify(expoData) // Convert the `expoData` object to a JSON string

  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://exp.host/--/api/v2/push/send', // Set the URL for sending push notifications
    headers: {
      'Content-Type': 'application/json', // Set the Content-Type header to indicate JSON data
    },
    data: data, // Set the data to be sent in the request body as the JSON string
  }

  const resp = await axios(config) // Send the request to trigger the notification
  console.log(resp.data)
  return resp.data // Return the response data
}

triggerNotification([
  {
    to: 'ExponentPushToken[0xM-kbAYsZrFffeTlYNEBY]', // Get the device token from the request body
    title: 'hi', // Get the notification title from the request body
    body: 'jaadju?', // Get the notification body from the request body
    data: {}, // Get additional data for the notification from the request body
  },
])
