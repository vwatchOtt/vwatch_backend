require('./connections/db')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { errors } = require('celebrate')
const swaggerUi = require('swagger-ui-express')
const swaggerDocument = require('./docs/swagger.json')
const { Server } = require('socket.io')
const { createServer } = require('http')
const fs = require('fs')
const path = require('path')
const { socketMiddlewere } = require('./src/utility/middleware')
const { circuitListener } = require('./sockets/handler')
const customCss = fs.readFileSync(process.cwd() + '/docs/swagger.css', 'utf8')
const port = process.env.PORT || 80
const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
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

io.use(socketMiddlewere)

io.on('connection', (socket) => {
  circuitListener(socket, io)
})
server.listen(port, () => {
  console.log('app listening on port:', port)
})
