const mongoose = require('mongoose')
// ;('mongodb://127.0.0.1:27017/vwatch')
// ;('mongodb+srv://funtogetherhope:togetherHope@cluster0.tlbh4qf.mongodb.net/funTogether')
mongoose
  .connect('mongodb://127.0.0.1:27017/vwatch')
  .then(() => {
    console.log('Connection is set.')
  })
  .catch((err) => {
    console.log('Connection Failed', err)
  })
