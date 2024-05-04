const mongoose = require('mongoose')
// mongodb://vwatch.in:27017/vwatch
// mongodb+srv://vwatchT1:lifehope@serverlessvwatcht1.s1ak6wr.mongodb.net/
//mongodb://127.0.0.1:27017/vwatchdev
mongoose
  .connect('mongodb://127.0.0.1:27017/vwatch')
  .then(() => {
    console.log('Connection is set.')
  })
  .catch((err) => {
    console.log('Connection Failed', err)
  })
