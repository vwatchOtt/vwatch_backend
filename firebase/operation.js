const admin = require('firebase-admin')
const serviceAccount = require('../vwatch-firebase.json') // Replace with your own service account key
const {
  chattingCollection,
  userCollection,
} = require('../src/utility/firestoreCollections')
const { CHATTING_hISTORY_LIMIT } = require('../config')
const { formatTimestamp } = require('../src/utility/helperFunc')
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://your-project-id.firebaseio.com', // Replace with your own Firebase project URL
  })
}

// Reference to the Firestore collection
const messagesCollection = admin.firestore().collection(chattingCollection)
const usersCollectionRef = admin.firestore().collection(userCollection)
// Fetch data from Firestore
const fetchConversationMessages = async (conversationId) => {
  try {
    const conversationMessagesQuery = messagesCollection
      .where('conversationId', '==', conversationId)
      .orderBy('timestamp', 'desc') // Adjust the sorting as needed
      .limit(CHATTING_hISTORY_LIMIT)
    const querySnapshot = await conversationMessagesQuery.get()
    const conversationMessagesData = querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        timestamp: formatTimestamp(data.timestamp),
      }
    })
    return conversationMessagesData
  } catch (error) {
    console.error('Error fetching conversation messages:', error)
  }
}
const createFireUser = async (userData) => {
  try {
    const userDocRef = await usersCollectionRef.add(userData)
    return userDocRef.id
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}
module.exports = {
  fetchConversationMessages,
  createFireUser,
}
