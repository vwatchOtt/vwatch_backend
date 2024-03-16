const screenNames = {
  AUTH_SCREEN: 'Auth',
  CONTENT_DETAILED_SCREEN: 'DetailedScreen',
  SEARCH_SCREEN: 'Search',
  CONVERSATION_SCREEN: 'Conversation',
  SPLASH_SCREEN: 'Splash',
  DASHBOARD_SCREENS: 'Dashboard',
  FRIEND_LISTING_SCREEN: 'CHAT',
  CONTENT_LISTING_SCREEN: 'CONTENT',
  MUSIC_LISTING_SCREEN: 'MUSIC',
  PROFILE_LISTING_SCREEN: 'PROFILE',
  VPLAYER_SCREEN: 'Vplayer',
  CREATE_ROOM: 'CreateRoom',
}
const connectedUsers = new Map()
const currentScreens = new Map()
const roomsData = {}
module.exports = {
  connectedUsers,
  currentScreens,
  screenNames,
  roomsData,
}
