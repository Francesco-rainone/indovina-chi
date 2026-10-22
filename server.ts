import http from 'node:http'
import next from 'next'
import { Server } from 'socket.io'
import { setupGuessWhoServer } from './src/lib/guess-who-server'

process.env.DISABLE_GUESS_WHO_SOCKET = '1'

const port = Number.parseInt(process.env.PORT ?? '3000', 10)

const main = async () => {
  const app = next({ dev: false, hostname: '0.0.0.0', port })
  const handle = app.getRequestHandler()

  await app.prepare()

  const httpServer = http.createServer((req, res) => {
    void handle(req, res)
  })

  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 5 * 1024 * 1024,
  })

  setupGuessWhoServer(io)

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Next.js and guess-who Socket.IO listening on :${port}`)
  })

  const shutdown = () => {
    io.close()
    httpServer.close(() => process.exit(0))
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

void main()
