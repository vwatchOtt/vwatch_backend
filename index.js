require('./connections/db')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { errors } = require('celebrate')
const swaggerUi = require('swagger-ui-express')
const swaggerDocument = require('./docs/swagger.json')
const socketIO = require('socket.io')

const fs = require('fs')

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

app.get('/', async (req, res) => {
  return res.json({ status: true, message: 'Welcome to server' })
})
const server = app.listen(port, () => {
  console.log('app listening on port:', port)
})
const io = socketIO(server)

io.on('connection', (socket) => {
  console.log('User connected:')
  socket.on('disconnect', () => {
    console.log('User disconnected')
  })
})
