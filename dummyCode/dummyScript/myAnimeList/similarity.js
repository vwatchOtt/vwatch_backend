// const natural = require('natural')
const sendTelegramLog = require('../telegramlogs')

// Function to calculate Levenshtein distance
exports.checkApproxSimilarity = (str1, str2, str3) => {
  const data = natural.LevenshteinDistance(
    str1.toLowerCase(),
    str2.toLowerCase()
  )
  const data2 = natural.LevenshteinDistance(
    str1.toLowerCase(),
    str3.toLowerCase()
  )
  console.log(`matching results ${data}-${data2}`)

  if (data < 2 || data2 < 2) {
    sendTelegramLog(
      `Matching results => \n ${str1} \n ${str2} \n ${str3} \n percentage->${data}-${data2}`,
      'true'
    )
    return true
  } else return false
}

exports.removeDubVariations = (inputString) => {
  // Use regular expression to remove variations of the word "Dub" and parentheses
  const result = inputString.replace(/(\s?dub\s?|\(.*?\))/gi, '')

  return result
}
