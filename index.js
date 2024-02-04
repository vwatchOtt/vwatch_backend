require('./connections/db')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { errors } = require('celebrate')
const swaggerUi = require('swagger-ui-express')
const swaggerDocument = require('./docs/swagger.json')

const fs = require('fs')
const path = require('path')

const customCss = fs.readFileSync(process.cwd() + '/docs/swagger.css', 'utf8')

const port = process.env.PORT || 3000
const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json())
app.use(cors())
app.options('*', cors())

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss,
  })
)

app.use('/api', require('./src/indexRoute'))

app.use(errors())
app.get('/default-room-image', (req, res) => {
  const imagePath = path.join(__dirname, 'assests/theater.jpg')
  res.sendFile(imagePath)
})
app.get('/', async (req, res) => {
  return res.json({ status: true, message: 'Welcome to server' })
})
app.listen(port, () => {
  console.log('app listening on port:', port)
})
