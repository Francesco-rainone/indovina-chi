// Next.js instrumentation hook — runs ONCE on server startup.
//
// Spawns the guess-who socket.io server IN-PROCESS (inside the Next.js process).
// Why: the sandbox cgroup kills detached `bun` processes after ~30-60s when
// my bash session ends. Running the socket.io server INSIDE the Next.js process
// means ONE process instead of two → less memory → longer survival window.
//
// We tried Option C (separate standalone mini-service) and it was WORSE: both
// processes died immediately with zero test window. The in-process approach
// (Option A) gives ~30-60s of stability after my bash command ends.
//
// Singleton guard via globalThis prevents double-binding on HMR reloads.

export const runtime = 'nodejs'

const MINI_SERVICE_PORT = 3003

type NodeProcess = {
  env: Record<string, string | undefined>
  getBuiltinModule?: (id: string) => unknown
  on: (event: string, listener: () => void) => void
}

const nodeProcess = (globalThis as typeof globalThis & { process?: NodeProcess }).process

const globalForSocket = globalThis as unknown as {
  __guessWhoSocketStarted?: boolean
}

export async function register() {
  if (nodeProcess?.env.DISABLE_GUESS_WHO_SOCKET === '1') return
  // Only run in the Node.js runtime (not Edge)
  if (!nodeProcess) throw new Error('Node.js process is unavailable')
  if (nodeProcess.env.NEXT_RUNTIME && nodeProcess.env.NEXT_RUNTIME !== 'nodejs') return

  // Singleton guard
  if (globalForSocket.__guessWhoSocketStarted) {
    console.log('[instrumentation] guess-who socket server already started, skipping')
    return
  }
  globalForSocket.__guessWhoSocketStarted = true

  try {
    // Dynamic imports of Node-only modules — the runtime guard above prevents
    // execution in the Edge Runtime. The bundler warnings about "Node.js module
    // not supported in Edge Runtime" are non-fatal.
    const http = nodeProcess?.getBuiltinModule?.('node:http') as typeof import('node:http') | undefined
    if (!http) throw new Error('Node.js built-in module "node:http" is unavailable')
    const { createServer } = http
    const { Server } = await import('socket.io')
    const { setupGuessWhoServer } = await import('./lib/guess-who-server')

    const httpServer = createServer()
    const io = new Server(httpServer, {
      path: '/socket.io',
      cors: { origin: '*', methods: ['GET', 'POST'] },
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 5 * 1024 * 1024, // 5MB for base64 images
    })

    setupGuessWhoServer(io)

    httpServer.listen(MINI_SERVICE_PORT, () => {
      console.log(`[instrumentation] guess-who socket.io server listening on :${MINI_SERVICE_PORT} (in-process)`)
    })

    httpServer.on('error', (err) => {
      console.error(`[instrumentation] guess-who HTTP server error on :${MINI_SERVICE_PORT}:`, err)
    })

    // Graceful shutdown — close the socket.io server when the Next.js process exits.
    // (Don't exit the process — let Next.js handle that; we just clean up our resources.)
    nodeProcess.on('SIGTERM', () => {
      console.log('[instrumentation] SIGTERM received, closing guess-who socket.io server...')
      httpServer.close()
    })
    nodeProcess.on('SIGINT', () => {
      console.log('[instrumentation] SIGINT received, closing guess-who socket.io server...')
      httpServer.close()
    })
  } catch (err) {
    console.error('[instrumentation] failed to start guess-who socket server:', err)
  }
}
