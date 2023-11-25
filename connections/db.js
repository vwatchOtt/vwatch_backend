const mongoose = require('mongoose')
// mongodb://vwatch.in:27017/vwatch
// mongodb://127.0.0.1:27017/vwatch
mongoose
  .connect('mongodb://vwatch.in:27017/vwatch')
  .then(() => {
    console.log('Connection is set.')
  })
  .catch((err) => {
    console.log('Connection Failed', err)
  })
