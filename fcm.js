const axios = require('axios')
const { google } = require('googleapis') // Import the 'google' namespace from 'googleapis'

// Define the SCOPES required for accessing Google APIs
const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging']

const getAccessToken = async () => {
  try {
    const key = require('./vwatch-firebase.json')
    const jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      SCOPES,
      null
    )
    const tokens = await jwtClient.authorize() // Await the authorization process
    console.log(tokens)
    return tokens.access_token
  } catch (error) {
    console.log(error)
    throw error
  }
}
async function sendNotification(message) {
  try {
    const accessToken = await getAccessToken() // Function to retrieve access token (you need to implement this)

    const config = {
      method: 'post',
      url: 'https://fcm.googleapis.com/v1/projects/vwatch-2024/messages:send', // FCM endpoint
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`, // Include the access token in the Authorization header
      },
      data: message, // Message payload containing notification details
    }

    const response = await axios(config)
    console.log('Notification sent:', response.data)
    return response.data
  } catch (error) {
    console.error(
      'Error sending notification:',
      error.response ? error.response.data : error.message
    )
    throw error
  }
}

const notificationMessage = {
  message: {
    notification: {
      title: 'Title of the notification',
      body: 'Body of the notification',
    },
    token:
      'dnsXdvCbSJuNn1wcc9GhB6:APA91bGExtu_0f6zxYqIaHLxKG6DodGjpDRKAr2Emj5CLSXErUYkWu36tiJbC0ICgcet9wO8SdeqUFtNCVTeZkue5idgHc4hbuYw1R9El0X9B1mDddZASZa0DjVFNFA3TwR0oeR3HH30', // FCM token of the device to receive the notification
  },
}
sendNotification(notificationMessage)
