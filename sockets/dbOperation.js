const Friends = require('../src/schema/friends')
/**
 * Retrieves the friends of a given user based on the provided user ID.
 * Only returns friends with a status of 'accepted'.
 * Uses the lean() function to optimize performance by returning plain JavaScript objects.
 */
const myFriends = async (myUserId) => {
  const friends = await Friends.find(
    {
      user: myUserId,
      status: 'accepted',
    },
    {
      friend: 1,
    }
  ).lean(true)
  return friends
}
module.exports = { myFriends }
