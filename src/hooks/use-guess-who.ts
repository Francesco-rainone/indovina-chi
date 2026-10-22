'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { create } from 'zustand'
import { RoomState, SERVICE_PORT } from '@/lib/guess-who-types'

interface GuessWhoStore {
  socket: Socket | null
  connected: boolean
  room: RoomState | null
  error: string | null
  setSocket: (s: Socket | null) => void
  setConnected: (v: boolean) => void
  setRoom: (r: RoomState | null) => void
  setError: (e: string | null) => void
  // Optimistic UI: instantly update local state before the server confirms.
  applyOptimisticExclude: (charId: string, excluded: boolean) => void
  applyOptimisticResetAll: () => void
  applyOptimisticResetTurn: () => void
  applyOptimisticPick: (charId: string) => void
  applyOptimisticClearPick: () => void
  applyOptimisticPassTurn: () => void
  applyOptimisticAddCharacter: (tempId: string, name: string, image: string) => void
  applyOptimisticSwapCharacterId: (tempId: string, realId: string) => void
  applyOptimisticUpdateCharacter: (id: string, name: string, image: string) => void
  applyOptimisticRemoveCharacter: (id: string) => void
}

export const useGuessWhoStore = create<GuessWhoStore>((set, get) => ({
  socket: null,
  connected: false,
  room: null,
  error: null,
  setSocket: (s) => set({ socket: s }),
  setConnected: (v) => set({ connected: v }),
  setRoom: (r) => set({ room: r }),
  setError: (e) => set({ error: e }),
  applyOptimisticExclude: (charId, excluded) => {
    const room = get().room
    if (!room) return
    const setMy = new Set(room.myExcluded)
    const setTurn = new Set(room.myExcludedThisTurn)
    if (excluded) { setMy.add(charId); setTurn.add(charId) }
    else { setMy.delete(charId); setTurn.delete(charId) }
    set({ room: { ...room, myExcluded: [...setMy], myExcludedThisTurn: [...setTurn] } })
  },
  applyOptimisticResetAll: () => {
    const room = get().room
    if (!room) return
    set({ room: { ...room, myExcluded: [], myExcludedThisTurn: [] } })
  },
  applyOptimisticResetTurn: () => {
    const room = get().room
    if (!room) return
    const turnSet = new Set(room.myExcludedThisTurn)
    const newMy = room.myExcluded.filter((id) => !turnSet.has(id))
    set({ room: { ...room, myExcluded: newMy, myExcludedThisTurn: [] } })
  },
  applyOptimisticPick: (charId) => {
    const room = get().room
    if (!room) return
    set({ room: { ...room, mySecretPick: charId } })
  },
  applyOptimisticClearPick: () => {
    const room = get().room
    if (!room) return
    set({ room: { ...room, mySecretPick: null } })
  },
  applyOptimisticPassTurn: () => {
    const room = get().room
    if (!room || !room.opponent) return
    // turn flips to opponent locally — UI immediately shows "In attesa…"
    set({ room: { ...room, turn: room.opponent.id } })
  },
  applyOptimisticAddCharacter: (tempId, name, image) => {
    const room = get().room
    if (!room) return
    set({ room: { ...room, characters: [...room.characters, { id: tempId, name, image }] } })
  },
  applyOptimisticSwapCharacterId: (tempId, realId) => {
    const room = get().room
    if (!room) return
    set({
      room: {
        ...room,
        characters: room.characters.map((c) => (c.id === tempId ? { ...c, id: realId } : c)),
      },
    })
  },
  applyOptimisticUpdateCharacter: (id, name, image) => {
    const room = get().room
    if (!room) return
    set({
      room: {
        ...room,
        characters: room.characters.map((c) => (c.id === id ? { ...c, name, image } : c)),
      },
    })
  },
  applyOptimisticRemoveCharacter: (id) => {
    const room = get().room
    if (!room) return
    set({
      room: {
        ...room,
        characters: room.characters.filter((c) => c.id !== id),
        myExcluded: room.myExcluded.filter((x) => x !== id),
        myExcludedThisTurn: room.myExcludedThisTurn.filter((x) => x !== id),
      },
    })
  },
}))

// Module-level singleton: ensures we only ever create ONE socket connection,
// even though useGuessWho() is called from many components.
let socketSingleton: Socket | null = null
let socketInitialized = false

const SESSION_KEY = 'guess-who-session'

export function saveSession(code: string, name: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ code, name }))
  } catch {}
}

export function clearSession() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(SESSION_KEY)
  } catch {}
}

function readSession(): { code: string; name: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.code === 'string' && typeof parsed.name === 'string') return parsed
  } catch {}
  return null
}

function ensureSocket(): Socket {
  if (socketSingleton) return socketSingleton
  if (typeof window === 'undefined') {
    // Should not happen (hook is 'use client'), but guard for SSR safety.
    throw new Error('Socket can only be created in the browser')
  }
  const socketMode = process.env.NEXT_PUBLIC_SOCKET_MODE
  const isDirectNextServer = window.location.port === '3000'
  const socketUrl = socketMode === 'same-origin'
    ? window.location.origin
    : isDirectNextServer
    ? `${window.location.protocol}//${window.location.hostname}:${SERVICE_PORT}`
    : '/?XTransformPort=' + SERVICE_PORT
  const s = io(socketUrl, {
    path: '/socket.io',
    transports: ['polling', 'websocket'], // polling first → upgrade to ws once the gateway confirms it can handle it
    // forceNew removed — the module-level socketSingleton already guarantees one connection.
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 10000,
  })

  s.on('connect', () => {
    useGuessWhoStore.getState().setConnected(true)
    // attempt auto-rejoin if a session is stored and we have no room yet
    const state = useGuessWhoStore.getState()
    if (!state.room) {
      const session = readSession()
      if (session) {
        s.emit('rejoin-room', session, (res: any) => {
          if (!res?.ok) {
            // session expired; clear it so lobby shows
            clearSession()
          }
        })
      }
    }
  })
  s.on('disconnect', () => useGuessWhoStore.getState().setConnected(false))
  s.on('connect_error', (err: unknown) => {
    console.error('[guess-who] connect_error', err)
    useGuessWhoStore.getState().setError('Impossibile connettersi al server di gioco.')
  })
  s.on('room-state', (r: RoomState) => {
    useGuessWhoStore.getState().setRoom(r)
    useGuessWhoStore.getState().setError(null)
  })

  // PATCH event (X-1 static/dynamic state split): receives everything EXCEPT `characters`
  // (the ~2MB base64 array). Merges the patch into the existing room state, preserving
  // the existing characters array. Avoids resending 24 images on every toggle-exclude / pass-turn.
  s.on('room-state-patch', (patch: Omit<RoomState, 'characters'>) => {
    const current = useGuessWhoStore.getState().room
    if (!current) return // ignore patches if we have no room yet — full state will arrive via 'room-state'
    useGuessWhoStore.getState().setRoom({ ...current, ...patch, characters: current.characters })
    useGuessWhoStore.getState().setError(null)
  })

  socketSingleton = s
  socketInitialized = true
  return s
}

export function useGuessWho() {
  const socket = useGuessWhoStore((s) => s.socket)
  const connected = useGuessWhoStore((s) => s.connected)
  const room = useGuessWhoStore((s) => s.room)
  const error = useGuessWhoStore((s) => s.error)
  const setError = useGuessWhoStore((s) => s.setError)

  const didInitRef = useRef(false)

  useEffect(() => {
    if (didInitRef.current) return
    didInitRef.current = true
    if (typeof window === 'undefined') return
    try {
      const s = ensureSocket()
      useGuessWhoStore.getState().setSocket(s)
    } catch (e) {
      console.error('[guess-who] init error', e)
    }
  }, [])

  // Convenience: derive helpful booleans
  const me = room?.players.find((p) => p.id === room.myId) ?? null
  const isHost = me?.isHost ?? false
  const opponent = room?.opponent ?? null
  const iHavePicked = !!room?.mySecretPick
  const iWon = room?.winner === room?.myId
  const iLost = !!room?.winner && room?.winner !== room?.myId
  const myLives = room?.myLives ?? 0
  const opponentLives = room?.opponent?.lives ?? 0
  const playerColor: 'p1' | 'p2' = isHost ? 'p1' : 'p2'
  const opponentColor: 'p1' | 'p2' = !opponent ? 'p2' : (opponent.isHost ? 'p1' : 'p2')
  const myExcluded = room?.myExcluded ?? []
  const myExcludedThisTurn = room?.myExcludedThisTurn ?? []
  const opponentExcluded = room?.opponentExcluded ?? []
  const myTurn = !!room && room.phase === 'playing' && room.turn === room.myId
  const matchWinner = room?.matchWinner ?? null
  const iWonMatch = matchWinner === room?.myId
  const iLostMatch = !!matchWinner && matchWinner !== room?.myId
  const roundDoneButMatchNotOver = !!room && room.phase === 'ended' && !room.matchWinner

  return {
    socket,
    connected,
    room,
    error,
    setError,
    me,
    isHost,
    opponent,
    iHavePicked,
    iWon,
    iLost,
    myLives,
    opponentLives,
    playerColor,
    opponentColor,
    myExcluded,
    myExcludedThisTurn,
    opponentExcluded,
    myTurn,
    matchWinner,
    iWonMatch,
    iLostMatch,
    roundDoneButMatchNotOver,
  }
}

// Helpers to emit events with ack callback → Promise (with timeout to prevent UI freeze on flaky networks)
export function emitAck<T = unknown>(socket: Socket | null, event: string, data?: unknown): Promise<{ ok: boolean; error?: string } & T> {
  return new Promise((resolve) => {
    if (!socket) {
      resolve({ ok: false, error: 'Socket non connesso' })
      return
    }
    // 6s timeout — prevents callers from hanging forever if the socket is in a reconnecting state
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        resolve({ ok: false, error: 'Timeout: il server non ha risposto in tempo.' } as any)
      }
    }, 6000)
    socket.emit(event, data ?? {}, (res: any) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(res ?? { ok: false })
    })
  })
}
