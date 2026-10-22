// ============================================================================
// Guess-Who socket.io server logic — shared module.
// Used by:
//   1. `server.ts` — production entrypoint for Render, serving Next.js and
//      Socket.IO on the same HTTP server.
//   2. `src/instrumentation.ts` — local fallback on port 3003 when the custom
//      server is disabled.
//
// All state (rooms Map, helpers) is captured in the function's closure, so
// multiple calls to `setupGuessWhoServer(io)` would create separate state
// spaces — don't call it more than once per process.
// ============================================================================

import type { Server } from 'socket.io'

// Function that sets up all the socket.io event handlers on a given Server instance.
// Each entrypoint calls this with its own `io` instance.
export function setupGuessWhoServer(io: Server) {
interface Character {
  id: string
  name: string
  image: string // base64 data URL
}

interface ChatMessage {
  id: string
  type: 'question' | 'answer' | 'guess' | 'system' | 'reveal' | 'flip'
  playerId: string
  playerName: string
  content: string
  answer?: 'yes' | 'no' | 'maybe' | 'incorrect'
  guessCorrect?: boolean
  timestamp: number
}

interface Player {
  id: string // socket id
  name: string
  isHost: boolean
  connected: boolean
}

type Phase = 'building' | 'picking' | 'playing' | 'ended'

interface Room {
  code: string
  hostId: string
  players: Map<string, Player> // socketId -> Player
  characters: Character[]
  phase: Phase
  secretPicks: Record<string, string> // socketId -> charId (private per-player)
  lives: Record<string, number> // socketId -> remaining guess attempts
  excluded: Record<string, Record<string, boolean>> // socketId -> charId -> excluded (synced, public)
  excludedThisTurn: Record<string, Record<string, boolean>> // socketId -> charId -> excluded THIS turn (for "reset del turno")
  turn: string | null // socketId whose turn it is (anti-cheat: only turn-holder can guess/pass)
  chatLog: ChatMessage[]
  winner: string | null // socketId of round winner
  matchWinner: string | null // socketId of MATCH winner (set when 2 rounds won in roundMode)
  roundWins: Record<string, number>
  currentRound: number
  useLives: boolean
  roundMode: boolean
  createdAt: number
  savedBoardId: string | null // DB id of the board, if this room was created from a saved board OR has been auto-saved on lock. Null = brand new board, not yet saved.
}

// ============================================================================
// In-memory store
// ============================================================================
const rooms = new Map<string, Room>()

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const generateRoomCode = (): string => {
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = ''
    for (let i = 0; i < 5; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    }
    if (!rooms.has(code)) return code
  }
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

const generateId = () => Math.random().toString(36).slice(2, 10)

const MIN_CHARACTERS = 24
const MAX_CHARACTERS = 24
const STARTING_LIVES = 3
const ROUNDS_TO_WIN = 2 // best of 3

// ============================================================================
// Serialization (for sending room state to clients)
// ============================================================================
const serializeRoom = (room: Room) => ({
  code: room.code,
  phase: room.phase,
  characters: room.characters,
  players: Array.from(room.players.values()).map((p) => ({
    ...p,
    lives: room.lives[p.id] ?? STARTING_LIVES,
  })),
  turn: room.turn,
  chatLog: room.chatLog,
  winner: room.winner,
  matchWinner: room.matchWinner,
  roundWins: room.roundWins,
  currentRound: room.currentRound,
  useLives: room.useLives,
  roundMode: room.roundMode,
  hasHost: !!room.hostId,
  startingLives: STARTING_LIVES,
  roundsToWin: ROUNDS_TO_WIN,
  savedBoardId: room.savedBoardId,
  // do NOT send secretPicks of others — client picks privately
  mySecretPick: null, // filled per-client below
})

// PATCH serialization — everything EXCEPT `characters` (the ~2MB base64 array).
// Used for events that don't change characters (toggle-exclude, pass-turn, pick, etc.)
// to avoid resending 24 base64 images on every interaction.
const serializeRoomPatch = (room: Room) => {
  const full = serializeRoom(room)
  // strip characters — client keeps its existing copy via the merge in the patch handler
  const { characters: _omit, ...patch } = full
  return patch
}

const excludedFor = (room: Room, socketId: string): string[] => {
  const map = room.excluded[socketId]
  if (!map) return []
  return Object.keys(map).filter((k) => map[k])
}

const excludedThisTurnFor = (room: Room, socketId: string): string[] => {
  const map = room.excludedThisTurn[socketId]
  if (!map) return []
  return Object.keys(map).filter((k) => map[k])
}

// Reset the "this turn" exclusion tracker for the player whose turn just started.
const resetTurnFor = (room: Room, socketId: string) => {
  room.excludedThisTurn[socketId] = {}
}

// Send the full room state to a single socket. Includes that player's own secret pick + exclusion sets (own + opponent).
const sendRoomState = (io: Server, room: Room, socketId: string) => {
  const player = room.players.get(socketId)
  if (!player) return
  const payload = buildRoomStatePayload(room, socketId)
  io.to(socketId).emit('room-state', payload)
}

// Build the per-client room-state payload (used by both single-send and broadcast loops).
const buildRoomStatePayload = (room: Room, socketId: string) => {
  const base = serializeRoom(room)
  const opponentRaw = Array.from(room.players.values()).find((p) => p.id !== socketId) ?? null
  const opponent = opponentRaw
    ? { ...opponentRaw, lives: room.lives[opponentRaw.id] ?? STARTING_LIVES }
    : null
  return {
    ...base,
    mySecretPick: room.secretPicks[socketId] ?? null,
    opponentSecretPick:
      room.phase === 'ended' && opponentRaw
        ? room.secretPicks[opponentRaw.id] ?? null
        : null,
    myLives: room.lives[socketId] ?? STARTING_LIVES,
    myExcluded: excludedFor(room, socketId),
    myExcludedThisTurn: excludedThisTurnFor(room, socketId),
    opponentExcluded: opponentRaw ? excludedFor(room, opponentRaw.id) : [],
    myId: socketId,
    opponent,
    bothPicked:
      Object.keys(room.secretPicks).length >= 2 &&
      room.players.size >= 2 &&
      Array.from(room.players.values()).every((p) => !!room.secretPicks[p.id]),
  }
}

// Build the per-client PATCH payload — same as buildRoomStatePayload but without `characters`.
const buildRoomPatchPayload = (room: Room, socketId: string) => {
  const full = buildRoomStatePayload(room, socketId)
  // strip characters — client merges the patch into its existing state, keeping its characters
  const { characters: _omit, ...patch } = full
  return patch
}

// Broadcast room state to ALL players EXCEPT the initiator (used for events that are already optimistically updated
// on the initiator's side — saves a redundant round-trip + payload for them).
const broadcastRoomStateExcept = (io: Server, room: Room, exceptSocketId: string) => {
  for (const socketId of room.players.keys()) {
    if (socketId === exceptSocketId) continue
    sendRoomState(io, room, socketId)
  }
}

const broadcastRoomState = (io: Server, room: Room) => {
  for (const socketId of room.players.keys()) {
    sendRoomState(io, room, socketId)
  }
}

// ---- PATCH broadcast (X-1 static/dynamic state split) ----
// Used by events that DON'T change `characters` (toggle-exclude, pass-turn, pick, etc.)
// to avoid resending the ~2MB base64 characters array on every interaction.
// The client merges the patch into its existing room state, preserving the existing `characters`.
const sendRoomPatch = (io: Server, room: Room, socketId: string) => {
  const player = room.players.get(socketId)
  if (!player) return
  const payload = buildRoomPatchPayload(room, socketId)
  io.to(socketId).emit('room-state-patch', payload)
}

const broadcastRoomPatch = (io: Server, room: Room) => {
  for (const socketId of room.players.keys()) {
    sendRoomPatch(io, room, socketId)
  }
}

const broadcastRoomPatchExcept = (io: Server, room: Room, exceptSocketId: string) => {
  for (const socketId of room.players.keys()) {
    if (socketId === exceptSocketId) continue
    sendRoomPatch(io, room, socketId)
  }
}

const findRoomBySocket = (socketId: string): Room | undefined => {
  for (const room of rooms.values()) {
    if (room.players.has(socketId)) return room
  }
  return undefined
}

const pushSystemMessage = (room: Room, content: string): ChatMessage => {
  const msg: ChatMessage = {
    id: generateId(),
    type: 'system',
    playerId: 'system',
    playerName: 'Sistema',
    content,
    timestamp: Date.now(),
  }
  room.chatLog.push(msg)
  return msg
}

io.on('connection', (socket) => {
  console.log(`[guess-who] connected: ${socket.id}`)

  // ---------------------------------------------------------------- create room
  socket.on('create-room', (data: { name?: string; useLives?: boolean; roundMode?: boolean }, ack?: (res: { ok: boolean; code?: string; error?: string }) => void) => {
    try {
      // Leave any previous room
      const prev = findRoomBySocket(socket.id)
      if (prev) {
        prev.players.delete(socket.id)
        if (prev.players.size === 0) rooms.delete(prev.code)
        else broadcastRoomPatch(io, prev)
      }

      const code = generateRoomCode()
      const playerName = (data?.name?.trim() || 'Giocatore 1').slice(0, 24)
      const room: Room = {
        code,
        hostId: socket.id,
        players: new Map([[socket.id, { id: socket.id, name: playerName, isHost: true, connected: true }]]),
        characters: [],
        phase: 'building',
        secretPicks: {},
        lives: {},
        excluded: {},
        excludedThisTurn: {},
        turn: null,
        chatLog: [],
        winner: null,
        matchWinner: null,
        roundWins: {},
        currentRound: 1,
        useLives: data?.useLives !== false,
        roundMode: data?.roundMode === true,
        createdAt: Date.now(),
        savedBoardId: null, // brand new board — client will POST /api/boards on lock and pass the resulting ID back via lock-board
      }
      rooms.set(code, room)
      socket.join(code)
      pushSystemMessage(room, `${playerName} ha creato la stanza${room.useLives ? ' (con vite)' : ' (senza vite)'}${room.roundMode ? ' · 3 round' : ''}.`)
      broadcastRoomState(io, room)
      console.log(`[guess-who] room created: ${code} by ${playerName} (lives=${room.useLives} rounds=${room.roundMode})`)
      ack?.({ ok: true, code })
    } catch (err) {
      console.error('[guess-who] create-room error', err)
      ack?.({ ok: false, error: 'Errore creazione stanza' })
    }
  })

  // ---------------------------------------------------------------- create room from a saved board
  socket.on('create-room-with-board', (
    data: { name?: string; characters?: Character[]; useLives?: boolean; roundMode?: boolean; savedBoardId?: string | null },
    ack?: (res: { ok: boolean; code?: string; error?: string }) => void,
  ) => {
    void (async () => {
      try {
        // Leave any previous room
        const prev = findRoomBySocket(socket.id)
        if (prev) {
          prev.players.delete(socket.id)
          if (prev.players.size === 0) rooms.delete(prev.code)
          else broadcastRoomPatch(io, prev)
        }

        // Source characters: client-side fetch of /api/boards/[id] provides the characters.
        // The X-3 optimization (server-side Prisma) was deferred — caused stability issues in the sandbox cgroup.
        let incoming: Character[] = []
        let resolvedSavedBoardId: string | null = data?.savedBoardId ?? null
        if (Array.isArray(data?.characters)) {
          incoming = data.characters
        }

        if (incoming.length < MIN_CHARACTERS) {
          ack?.({ ok: false, error: `La board deve avere almeno ${MIN_CHARACTERS} personaggi` })
          return
        }
        if (incoming.length > MAX_CHARACTERS) {
          ack?.({ ok: false, error: `La board ha troppi personaggi (max ${MAX_CHARACTERS})` })
          return
        }
        // Sanitize + re-id characters to avoid id collisions
        const characters: Character[] = incoming.map((c, i) => ({
          id: generateId(),
          name: String(c?.name ?? `Personaggio ${i + 1}`).slice(0, 40),
          image: typeof c?.image === 'string' ? c.image : '',
        })).filter((c) => c.name && c.image)
        if (characters.length < MIN_CHARACTERS) {
          ack?.({ ok: false, error: 'Personaggi non validi' })
          return
        }

        const code = generateRoomCode()
        const playerName = (data?.name?.trim() || 'Giocatore 1').slice(0, 24)
        const room: Room = {
          code,
          hostId: socket.id,
          players: new Map([[socket.id, { id: socket.id, name: playerName, isHost: true, connected: true }]]),
          characters,
          phase: 'building', // host can still tweak, then lock
          secretPicks: {},
          lives: {},
          excluded: {},
          excludedThisTurn: {},
          turn: null,
          chatLog: [],
          winner: null,
          matchWinner: null,
          roundWins: {},
          currentRound: 1,
          useLives: data?.useLives !== false,
          roundMode: data?.roundMode === true,
          createdAt: Date.now(),
          savedBoardId: resolvedSavedBoardId, // existing board already in DB → client must skip the auto-save on lock
        }
        rooms.set(code, room)
        socket.join(code)
        pushSystemMessage(room, `${playerName} ha creato la stanza con una board salvata (${characters.length} personaggi)${room.useLives ? ' (con vite)' : ' (senza vite)'}${room.roundMode ? ' · 3 round' : ''}.`)
        broadcastRoomState(io, room)
        console.log(`[guess-who] room created with board: ${code} by ${playerName} (${characters.length} chars, source=${data?.savedBoardId ? 'db' : 'client'})`)
        ack?.({ ok: true, code })
      } catch (err) {
        console.error('[guess-who] create-room-with-board error', err)
        ack?.({ ok: false, error: 'Errore creazione stanza' })
      }
    })()
  })

  // ---------------------------------------------------------------- join room
  socket.on('join-room', (data: { code?: string; name?: string }, ack?: (res: { ok: boolean; error?: string; code?: string }) => void) => {
    try {
      const code = (data?.code || '').trim().toUpperCase()
      const playerName = (data?.name?.trim() || 'Giocatore 2').slice(0, 24)
      const room = rooms.get(code)
      if (!room) {
        ack?.({ ok: false, error: 'Stanza non trovata. Controlla il codice.' })
        return
      }
      if (room.players.size >= 2) {
        // If a player reconnected with same id... unlikely. Reject otherwise.
        ack?.({ ok: false, error: 'La stanza è piena.' })
        return
      }

      // Leave any previous room
      const prev = findRoomBySocket(socket.id)
      if (prev && prev.code !== code) {
        prev.players.delete(socket.id)
        if (prev.players.size === 0) rooms.delete(prev.code)
        else broadcastRoomPatch(io, prev)
      }

      room.players.set(socket.id, { id: socket.id, name: playerName, isHost: false, connected: true })
      socket.join(code)
      pushSystemMessage(room, `${playerName} è entrato nella stanza.`)
      broadcastRoomState(io, room)
      console.log(`[guess-who] ${playerName} joined room ${code}`)
      ack?.({ ok: true, code })
    } catch (err) {
      console.error('[guess-who] join-room error', err)
      ack?.({ ok: false, error: 'Errore ingresso stanza' })
    }
  })

  // ---------------------------------------------------------------- rejoin (refresh support)
  socket.on('rejoin-room', (data: { code?: string; name?: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      const code = (data?.code || '').trim().toUpperCase()
      const playerName = (data?.name || 'Giocatore').slice(0, 24)
      const room = rooms.get(code)
      if (!room) {
        ack?.({ ok: false, error: 'Stanza non più attiva (scaduta).' })
        return
      }
      // Try to rejoin as the disconnected host or guest slot.
      // We allow rejoin only if there's a free slot OR the previous slot is marked disconnected.
      const disconnectedSlot = Array.from(room.players.entries()).find(([, p]) => !p.connected)
      if (disconnectedSlot) {
        const [oldId] = disconnectedSlot
        // migrate
        const oldPlayer = room.players.get(oldId)!
        room.players.delete(oldId)
        const wasHost = oldPlayer.isHost
        room.players.set(socket.id, { id: socket.id, name: playerName, isHost: wasHost, connected: true })
        if (room.hostId === oldId) room.hostId = socket.id
        if (room.secretPicks[oldId]) {
          room.secretPicks[socket.id] = room.secretPicks[oldId]
          delete room.secretPicks[oldId]
        }
        if (room.winner === oldId) room.winner = socket.id
        socket.join(code)
        pushSystemMessage(room, `${playerName} si è riconnesso.`)
        broadcastRoomState(io, room)
        ack?.({ ok: true })
        return
      }
      ack?.({ ok: false, error: 'Nessuno slot libero per riconnettersi.' })
    } catch (err) {
      console.error('[guess-who] rejoin error', err)
      ack?.({ ok: false, error: 'Errore riconnessione' })
    }
  })

  // ---------------------------------------------------------------- add character
  socket.on('add-character', (data: { code?: string; character?: { name?: string; image?: string } }, ack?: (res: { ok: boolean; error?: string; character?: Character }) => void) => {
    try {
      const code = (data?.code || '').trim().toUpperCase()
      const room = rooms.get(code)
      if (!room) return ack?.({ ok: false, error: 'Stanza non trovata' })
      if (socket.id !== room.hostId) return ack?.({ ok: false, error: 'Solo l\'host può aggiungere personaggi' })
      if (room.phase !== 'building') return ack?.({ ok: false, error: 'Board già bloccata' })
      if (room.characters.length >= MAX_CHARACTERS) return ack?.({ ok: false, error: `Massimo ${MAX_CHARACTERS} personaggi` })

      const name = (data?.character?.name || '').trim().slice(0, 40)
      const image = data?.character?.image || ''
      if (!name) return ack?.({ ok: false, error: 'Nome obbligatorio' })
      if (!image) return ack?.({ ok: false, error: 'Immagine obbligatoria' })

      const character: Character = { id: generateId(), name, image }
      room.characters.push(character)
      broadcastRoomState(io, room)
      ack?.({ ok: true, character })
    } catch (err) {
      console.error('[guess-who] add-character error', err)
      ack?.({ ok: false, error: 'Errore aggiunta personaggio' })
    }
  })

  // ---------------------------------------------------------------- update character
  socket.on('update-character', (data: { code?: string; id?: string; name?: string; image?: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      const code = (data?.code || '').trim().toUpperCase()
      const room = rooms.get(code)
      if (!room) return ack?.({ ok: false, error: 'Stanza non trovata' })
      if (socket.id !== room.hostId) return ack?.({ ok: false, error: 'Solo l\'host può modificare' })
      if (room.phase !== 'building') return ack?.({ ok: false, error: 'Board già bloccata' })
      const ch = room.characters.find((c) => c.id === data.id)
      if (!ch) return ack?.({ ok: false, error: 'Personaggio non trovato' })
      if (typeof data.name === 'string') ch.name = data.name.trim().slice(0, 40)
      if (typeof data.image === 'string') ch.image = data.image
      broadcastRoomState(io, room)
      ack?.({ ok: true })
    } catch (err) {
      console.error('[guess-who] update-character error', err)
      ack?.({ ok: false, error: 'Errore modifica' })
    }
  })

  // ---------------------------------------------------------------- remove character
  socket.on('remove-character', (data: { code?: string; id?: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      const code = (data?.code || '').trim().toUpperCase()
      const room = rooms.get(code)
      if (!room) return ack?.({ ok: false, error: 'Stanza non trovata' })
      if (socket.id !== room.hostId) return ack?.({ ok: false, error: 'Solo l\'host può rimuovere' })
      if (room.phase !== 'building') return ack?.({ ok: false, error: 'Board già bloccata' })
      room.characters = room.characters.filter((c) => c.id !== data.id)
      broadcastRoomState(io, room)
      ack?.({ ok: true })
    } catch (err) {
      console.error('[guess-who] remove-character error', err)
      ack?.({ ok: false, error: 'Errore rimozione' })
    }
  })

  // ---------------------------------------------------------------- lock board (start picking)
  socket.on('lock-board', (data: { code?: string; savedBoardId?: string | null }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      const code = (data?.code || '').trim().toUpperCase()
      const room = rooms.get(code)
      if (!room) return ack?.({ ok: false, error: 'Stanza non trovata' })
      if (socket.id !== room.hostId) return ack?.({ ok: false, error: 'Solo l\'host può bloccare la board' })
      if (room.phase !== 'building') return ack?.({ ok: false, error: 'Board già bloccata' })
      if (room.characters.length < MIN_CHARACTERS) return ack?.({ ok: false, error: `Servono almeno ${MIN_CHARACTERS} personaggi` })
      if (room.players.size < 2) return ack?.({ ok: false, error: 'Aspetta che il Giocatore 2 entri nella stanza' })
      // If the client just auto-saved the board (new board case), persist the DB id on the room
      // so that future unlock→re-lock cycles in the same room skip the auto-save (no duplicate DB entries).
      if (data?.savedBoardId && !room.savedBoardId) {
        room.savedBoardId = data.savedBoardId
      }
      room.phase = 'picking'
      pushSystemMessage(room, 'Board bloccata! Ogni giocatore sceglie in segreto il proprio personaggio.')
      broadcastRoomPatch(io, room)
      ack?.({ ok: true })
    } catch (err) {
      console.error('[guess-who] lock-board error', err)
      ack?.({ ok: false, error: 'Errore blocco board' })
    }
  })

  // ---------------------------------------------------------------- unlock board (back to building, only host, only if in picking)
  socket.on('unlock-board', (data: { code?: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      const code = (data?.code || '').trim().toUpperCase()
      const room = rooms.get(code)
      if (!room) return ack?.({ ok: false, error: 'Stanza non trovata' })
      if (socket.id !== room.hostId) return ack?.({ ok: false, error: 'Solo l\'host' })
      if (room.phase !== 'picking') return ack?.({ ok: false, error: 'Non disponibile ora' })
      room.phase = 'building'
      room.secretPicks = {}
      room.lives = {}
      room.excluded = {}
      room.excludedThisTurn = {}
      room.turn = null
      room.winner = null
      room.matchWinner = null
      room.roundWins = {}
      room.currentRound = 1
      room.chatLog = []
      pushSystemMessage(room, 'Board sbloccata per modifiche.')
      broadcastRoomPatch(io, room)
      ack?.({ ok: true })
    } catch (err) {
      ack?.({ ok: false, error: 'Errore' })
    }
  })

  // ---------------------------------------------------------------- pick secret character
  socket.on('pick-character', (data: { code?: string; charId?: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      const code = (data?.code || '').trim().toUpperCase()
      const room = rooms.get(code)
      if (!room) return ack?.({ ok: false, error: 'Stanza non trovata' })
      if (room.phase !== 'picking') return ack?.({ ok: false, error: 'Fase non valida' })
      const charId = data.charId
      if (!charId || !room.characters.find((c) => c.id === charId)) return ack?.({ ok: false, error: 'Personaggio non valido' })
      room.secretPicks[socket.id] = charId

      const allPicked =
        Array.from(room.players.values()).every((p) => !!room.secretPicks[p.id]) && room.players.size >= 2

      if (allPicked) {
        room.phase = 'playing'
        // Alternate who starts each round in roundMode (host starts odd rounds, guest starts even rounds).
        // In non-round mode, host always starts (only one round anyway).
        const playerIds = Array.from(room.players.keys())
        const guestId = playerIds.find((id) => id !== room.hostId) ?? room.hostId
        const starter =
          room.roundMode && room.currentRound % 2 === 0
            ? guestId       // round 2 (and any even round) → guest starts
            : room.hostId   // round 1 (and any odd round) → host starts
        room.turn = starter
        resetTurnFor(room, starter) // start fresh "this turn" tracker for the starter
        if (room.useLives) {
          for (const pid of room.players.keys()) room.lives[pid] = STARTING_LIVES
        }
        const starterName = room.players.get(starter)?.name ?? 'P1'
        const modeTxt = room.useLives ? ` (${STARTING_LIVES} vite ciascuno)` : ' (1 solo tentativo)'
        pushSystemMessage(room, `Tutti hanno scelto! Inizia ${starterName}${modeTxt}. Click destro (o long-press su mobile) su una carta per indovinare.`)
      } else {
        pushSystemMessage(room, `${room.players.get(socket.id)?.name} ha scelto il proprio personaggio.`)
      }
      broadcastRoomPatch(io, room)
      ack?.({ ok: true })
    } catch (err) {
      console.error('[guess-who] pick-character error', err)
      ack?.({ ok: false, error: 'Errore scelta' })
    }
  })

  // ---------------------------------------------------------------- guess character (turn-based, with lives + round logic)
  socket.on('guess-character', (data: { code?: string; charId?: string }, ack?: (res: { ok: boolean; error?: string; correct?: boolean; livesLeft?: number }) => void) => {
    try {
      const code = (data?.code || '').trim().toUpperCase()
      const room = rooms.get(code)
      if (!room) return ack?.({ ok: false, error: 'Stanza non trovata' })
      if (room.phase !== 'playing') return ack?.({ ok: false, error: 'Partita non in corso' })
      if (room.turn !== socket.id) return ack?.({ ok: false, error: 'Non è il tuo turno. Passa il turno o aspetta la mossa dell\'avversario.' })
      const charId = data.charId
      if (!charId) return ack?.({ ok: false, error: 'Seleziona un personaggio' })

      // find opponent
      const opponentId = Array.from(room.players.keys()).find((id) => id !== socket.id)
      if (!opponentId) return ack?.({ ok: false, error: 'Nessun avversario' })
      const opponentSecret = room.secretPicks[opponentId]
      const correct = opponentSecret === charId

      const player = room.players.get(socket.id)!
      const guessedChar = room.characters.find((c) => c.id === charId)
      const msg: ChatMessage = {
        id: generateId(),
        type: 'guess',
        playerId: socket.id,
        playerName: player.name,
        content: `Tenta di indovinare: ${guessedChar?.name ?? '?'}`,
        guessCorrect: correct,
        timestamp: Date.now(),
      }
      room.chatLog.push(msg)

      const revealSecrets = () => {
        for (const [pid, cid] of Object.entries(room.secretPicks)) {
          const ch = room.characters.find((c) => c.id === cid)
          const pName = room.players.get(pid)?.name ?? 'Giocatore'
          room.chatLog.push({
            id: generateId(),
            type: 'reveal',
            playerId: pid,
            playerName: pName,
            content: `Personaggio segreto di ${pName}: ${ch?.name ?? '?'}`,
            timestamp: Date.now(),
          })
        }
      }

      const finishRound = (roundWinnerId: string, reason: string) => {
        room.phase = 'ended'
        room.winner = roundWinnerId
        room.turn = null
        room.roundWins[roundWinnerId] = (room.roundWins[roundWinnerId] ?? 0) + 1
        pushSystemMessage(room, reason)
        revealSecrets()
        if (!room.roundMode) {
          // Single-round mode: the round winner is the match winner
          room.matchWinner = roundWinnerId
          pushSystemMessage(room, `🏆 ${room.players.get(roundWinnerId)?.name ?? 'Giocatore'} vince la partita!`)
        } else if (room.roundWins[roundWinnerId] >= ROUNDS_TO_WIN) {
          room.matchWinner = roundWinnerId
          pushSystemMessage(room, `🏆 ${room.players.get(roundWinnerId)?.name ?? 'Giocatore'} Vince la partita (${room.roundWins[roundWinnerId]}-${room.roundWins[opponentId] ?? 0})!`)
        }
      }

      if (correct) {
        finishRound(socket.id, `${player.name} ha indovinato! 🎉 Round ${room.currentRound} vinto.`)
      } else {
        // Wrong guess
        let lostRound = false
        if (room.useLives) {
          const cur = room.lives[socket.id] ?? STARTING_LIVES
          const next = Math.max(0, cur - 1)
          room.lives[socket.id] = next
          if (next <= 0) {
            lostRound = true
            finishRound(opponentId, `${player.name} ha esaurito le vite! Round ${room.currentRound} vinto da ${room.players.get(opponentId)?.name ?? 'avversario'}.`)
          } else {
            pushSystemMessage(room, `${player.name} ha sbagliato! Vita persa (${next}/${STARTING_LIVES}). Turno passato a ${room.players.get(opponentId)?.name ?? 'avversario'}.`)
            room.turn = opponentId // pass turn
            resetTurnFor(room, opponentId) // opponent starts a fresh "this turn" tracker
          }
        } else {
          // No lives mode: one wrong guess = lose round
          lostRound = true
          finishRound(opponentId, `${player.name} ha sbagliato! Round ${room.currentRound} vinto da ${room.players.get(opponentId)?.name ?? 'avversario'}.`)
        }
        void lostRound
      }
      broadcastRoomPatch(io, room)
      ack?.({ ok: true, correct, livesLeft: room.useLives ? (room.lives[socket.id] ?? STARTING_LIVES) : 0 })
    } catch (err) {
      console.error('[guess-who] guess-character error', err)
      ack?.({ ok: false, error: 'Errore tentativo' })
    }
  })

  // ---------------------------------------------------------------- toggle exclude (synced — both players see each other's excluded cards)
  socket.on('toggle-exclude', (data: { code?: string; charId?: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      const code = (data?.code || '').trim().toUpperCase()
      const room = rooms.get(code)
      if (!room) return ack?.({ ok: false, error: 'Stanza non trovata' })
      if (room.phase !== 'playing') return ack?.({ ok: false, error: 'Partita non in corso' })
      const charId = data.charId
      if (!charId) return ack?.({ ok: false, error: 'Personaggio non valido' })
      room.excluded[socket.id] = room.excluded[socket.id] ?? {}
      room.excluded[socket.id][charId] = !room.excluded[socket.id][charId]
      // Track "this turn" exclusions — only when the player is the current turn-holder
      if (room.turn === socket.id) {
        room.excludedThisTurn[socket.id] = room.excludedThisTurn[socket.id] ?? {}
        // mirror the new exclusion state for this turn tracker
        room.excludedThisTurn[socket.id][charId] = !!room.excluded[socket.id][charId]
      }
      // Skip broadcasting back to the initiator — the optimistic UI already updated their local state.
      // Only the opponent needs to see the new exclusion.
      broadcastRoomPatchExcept(io, room, socket.id)
      ack?.({ ok: true })
    } catch (err) {
      console.error('[guess-who] toggle-exclude error', err)
      ack?.({ ok: false, error: 'Errore' })
    }
  })

  // ---------------------------------------------------------------- reset turn excludes (only the exclusions made during the current turn)
  socket.on('reset-turn-excludes', (data: { code?: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      const code = (data?.code || '').trim().toUpperCase()
      const room = rooms.get(code)
      if (!room) return ack?.({ ok: false, error: 'Stanza non trovata' })
      if (room.phase !== 'playing') return ack?.({ ok: false, error: 'Partita non in corso' })
      // Un-exclude every card that was excluded during this turn (and is still excluded)
      const thisTurn = room.excludedThisTurn[socket.id] ?? {}
      room.excluded[socket.id] = room.excluded[socket.id] ?? {}
      for (const charId of Object.keys(thisTurn)) {
        if (thisTurn[charId] && room.excluded[socket.id][charId]) {
          room.excluded[socket.id][charId] = false
        }
      }
      room.excludedThisTurn[socket.id] = {}
      // Optimistic on the initiator — only the opponent needs the update.
      broadcastRoomPatchExcept(io, room, socket.id)
      ack?.({ ok: true })
    } catch (err) {
      console.error('[guess-who] reset-turn-excludes error', err)
      ack?.({ ok: false, error: 'Errore' })
    }
  })

  // ---------------------------------------------------------------- reset ALL excludes (batch — 1 round-trip instead of N)
  socket.on('reset-all-excludes', (data: { code?: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      const code = (data?.code || '').trim().toUpperCase()
      const room = rooms.get(code)
      if (!room) return ack?.({ ok: false, error: 'Stanza non trovata' })
      if (room.phase !== 'playing') return ack?.({ ok: false, error: 'Partita non in corso' })
      // Clear every exclusion for this player in one operation
      room.excluded[socket.id] = {}
      room.excludedThisTurn[socket.id] = {}
      // Optimistic on the initiator — only the opponent needs the update.
      broadcastRoomPatchExcept(io, room, socket.id)
      ack?.({ ok: true })
    } catch (err) {
      console.error('[guess-who] reset-all-excludes error', err)
      ack?.({ ok: false, error: 'Errore' })
    }
  })

  // ---------------------------------------------------------------- pass turn (no guess)
  socket.on('pass-turn', (data: { code?: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      const code = (data?.code || '').trim().toUpperCase()
      const room = rooms.get(code)
      if (!room) return ack?.({ ok: false, error: 'Stanza non trovata' })
      if (room.phase !== 'playing') return ack?.({ ok: false, error: 'Partita non in corso' })
      if (room.turn !== socket.id) return ack?.({ ok: false, error: 'Non è il tuo turno' })
      const opponentId = Array.from(room.players.keys()).find((id) => id !== socket.id)
      if (!opponentId) return ack?.({ ok: false, error: 'Nessun avversario' })
      room.turn = opponentId
      resetTurnFor(room, opponentId) // opponent starts a fresh "this turn" tracker
      const me = room.players.get(socket.id)!
      pushSystemMessage(room, `${me.name} ha passato il turno. Tocca a ${room.players.get(opponentId)?.name ?? 'avversario'}.`)
      broadcastRoomPatch(io, room)
      ack?.({ ok: true })
    } catch (err) {
      console.error('[guess-who] pass-turn error', err)
      ack?.({ ok: false, error: 'Errore' })
    }
  })

  // ---------------------------------------------------------------- next round (round mode only, after a round ended without match end)
  socket.on('next-round', (data: { code?: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      const code = (data?.code || '').trim().toUpperCase()
      const room = rooms.get(code)
      if (!room) return ack?.({ ok: false, error: 'Stanza non trovata' })
      if (room.phase !== 'ended') return ack?.({ ok: false, error: 'Round non concluso' })
      if (!room.roundMode) return ack?.({ ok: false, error: 'Non in modalità round' })
      if (room.matchWinner) return ack?.({ ok: false, error: 'Partita già conclusa' })
      // Reset for next round, keep roundWins
      room.phase = 'picking'
      room.secretPicks = {}
      room.lives = {}
      room.excluded = {}
      room.excludedThisTurn = {}
      room.turn = null
      room.winner = null
      room.currentRound += 1
      room.chatLog = []
      pushSystemMessage(room, `Round ${room.currentRound}! Scegliete di nuovo il vostro personaggio segreto.`)
      broadcastRoomPatch(io, room)
      ack?.({ ok: true })
    } catch (err) {
      console.error('[guess-who] next-round error', err)
      ack?.({ ok: false, error: 'Errore' })
    }
  })

  // ---------------------------------------------------------------- play again (back to picking)
  socket.on('play-again', (data: { code?: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      const code = (data?.code || '').trim().toUpperCase()
      const room = rooms.get(code)
      if (!room) return ack?.({ ok: false, error: 'Stanza non trovata' })
      if (room.phase !== 'ended') return ack?.({ ok: false, error: 'Partita non conclusa' })
      room.phase = 'picking'
      room.secretPicks = {}
      room.lives = {}
      room.excluded = {}
      room.excludedThisTurn = {}
      room.turn = null
      room.winner = null
      room.matchWinner = null
      room.roundWins = {}
      room.currentRound = 1
      room.chatLog = []
      pushSystemMessage(room, 'Nuova partita! Scegliete di nuovo il vostro personaggio segreto.')
      broadcastRoomPatch(io, room)
      ack?.({ ok: true })
    } catch (err) {
      ack?.({ ok: false, error: 'Errore' })
    }
  })

  // ---------------------------------------------------------------- back to builder (host only)
  socket.on('restart-builder', (data: { code?: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      const code = (data?.code || '').trim().toUpperCase()
      const room = rooms.get(code)
      if (!room) return ack?.({ ok: false, error: 'Stanza non trovata' })
      if (socket.id !== room.hostId) return ack?.({ ok: false, error: 'Solo l\'host' })
      room.phase = 'building'
      room.secretPicks = {}
      room.lives = {}
      room.excluded = {}
      room.excludedThisTurn = {}
      room.turn = null
      room.winner = null
      room.matchWinner = null
      room.roundWins = {}
      room.currentRound = 1
      room.chatLog = []
      pushSystemMessage(room, 'L\'host è tornato alla creazione della board.')
      broadcastRoomState(io, room)
      ack?.({ ok: true })
    } catch (err) {
      ack?.({ ok: false, error: 'Errore' })
    }
  })

  // ---------------------------------------------------------------- disconnect
  socket.on('disconnect', () => {
    const room = findRoomBySocket(socket.id)
    if (!room) return
    const player = room.players.get(socket.id)
    if (player) {
      player.connected = false
      pushSystemMessage(room, `${player.name} si è disconnesso. La stanza resta attiva per riconnessione.`)
      // Do NOT delete player slot immediately — allow rejoin. But if host leaves, keep host id so rejoin can reclaim.
      broadcastRoomPatch(io, room)
    }
    // Auto-cleanup empty rooms after a while handled lazily; here we keep room for reconnect.
    // Cleanup truly empty:
    const anyConnected = Array.from(room.players.values()).some((p) => p.connected)
    if (!anyConnected) {
      rooms.delete(room.code)
      console.log(`[guess-who] room deleted (empty): ${room.code}`)
    }
  })

  socket.on('error', (err) => console.error(`[guess-who] socket error ${socket.id}`, err))
})

// Lazy cleanup of stale rooms (no connected players and older than 30 min)
setInterval(() => {
  const now = Date.now()
  for (const [code, room] of rooms.entries()) {
    const anyConnected = Array.from(room.players.values()).some((p) => p.connected)
    if (!anyConnected && now - room.createdAt > 30 * 60 * 1000) {
      rooms.delete(code)
      console.log(`[guess-who] cleaned up stale room ${code}`)
    }
  }
}, 60 * 1000)

}
