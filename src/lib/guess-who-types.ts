// Shared types between the Next.js client and (conceptually) the socket.io server.

export type Phase = 'building' | 'picking' | 'playing' | 'ended'

export interface Character {
  id: string
  name: string
  image: string // base64 data URL
}

export interface Player {
  id: string // socket id
  name: string
  isHost: boolean
  connected: boolean
  lives?: number // remaining guess attempts (public — visible to opponent too)
}

export type ChatType = 'question' | 'answer' | 'guess' | 'system' | 'reveal' | 'flip'
export type Answer = 'yes' | 'no' | 'maybe' | 'incorrect'

export interface ChatMessage {
  id: string
  type: ChatType
  playerId: string
  playerName: string
  content: string
  answer?: Answer
  guessCorrect?: boolean
  timestamp: number
}

export interface RoomState {
  code: string
  phase: Phase
  characters: Character[]
  players: Player[]
  turn: string | null
  chatLog: ChatMessage[]
  winner: string | null       // round winner (socketId)
  matchWinner: string | null  // match winner (socketId) — set when 2 rounds won in roundMode
  roundWins: Record<string, number>
  currentRound: number
  useLives: boolean
  roundMode: boolean
  hasHost: boolean
  startingLives: number
  roundsToWin: number
  mySecretPick: string | null
  myLives: number
  myExcluded: string[]
  myExcludedThisTurn: string[]
  opponentExcluded: string[]
  myId: string
  opponent: (Player & { lives: number }) | null
  bothPicked: boolean
  /** ID of the board saved in the DB, if this room was created from a saved board
   *  OR has been auto-saved on lock. Null when the board is brand new and not yet saved.
   *  Used by the client to decide whether to POST /api/boards on lock
   *  (skip the auto-save when the board is already in the DB → avoid duplicates). */
  savedBoardId: string | null
}

export const MIN_CHARACTERS = 24
export const MAX_CHARACTERS = 24
export const SERVICE_PORT = 3003
