'use client'

import { Loader2, WifiOff } from 'lucide-react'
import { useGuessWho } from '@/hooks/use-guess-who'
import { Header, Lobby, BoardBuilder, GameBoard } from '@/components/guess-who/organisms'

/**
 * Top-level page template: handles the connection overlay, route switching between
 * Lobby / BoardBuilder / GameBoard, and the reconnection toast pill.
 * The page.tsx simply renders <GameShell />.
 */
export const GameShell = () => {
  const { room, connected, isHost, opponent } = useGuessWho()

  const showConnectingOverlay = !connected && !room

  return (
    <div className="min-h-screen flex flex-col game-shell-bg">
      <Header />

      <main className="flex-1 w-full px-3 sm:px-6 py-8 sm:py-12">
        {showConnectingOverlay ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-24 text-white">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-p1)' }} />
            <p className="text-sm">Connessione al server di gioco…</p>
          </div>
        ) : !room ? (
          <Lobby />
        ) : room.phase === 'building' ? (
          <BoardBuilder isHost={isHost} />
        ) : room.phase === 'picking' ? (
          <div className="w-full max-w-6xl mx-auto space-y-4">
            <GameBoard phase="picking" />
            {!opponent && (
              <div className="text-center text-sm text-white/90 bg-black/30 inline-block mx-auto px-4 py-1.5 rounded-full">
                In attesa del Giocatore 2… Condividi il codice <strong className="font-mono">{room.code}</strong>.
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-6xl mx-auto">
            <GameBoard phase={room.phase} />
          </div>
        )}

        {room && !connected && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-destructive text-white px-4 py-2 text-sm shadow-lg">
            <WifiOff className="h-4 w-4" /> Riconnessione…
          </div>
        )}
      </main>
    </div>
  )
}
