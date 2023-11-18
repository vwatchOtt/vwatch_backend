const express = require('express')
const router = express.Router()
router.use('/user', require('./routes/userRoute'))
router.use('/bhws', require('./routes/bhwsRoute'))
router.use('/anime', require('./routes/AnimeRoute'))
router.use('/scripts', require('./routes/projectScripts'))
router.use('/app', require('./routes/appStatics'))



module.exports = router
