'use client'

import { Lock, Unlock } from 'lucide-react'
import { Button } from '@/components/guess-who/atoms/buttons/button'
import { MIN_CHARACTERS } from '@/lib/guess-who-types'

interface LockBoardBarProps {
  count: number
  hasOpponent: boolean
  /** when true, the board is already locked (picking phase) — show "Torna a modificare" instead */
  unlockedView?: boolean
  onLock: () => void
  onUnlock?: () => void
}

/** Bottom bar of the board builder. Either the status + "Blocca board e gioca" button, or the "Torna a modificare" button. */
export const LockBoardBar = ({ count, hasOpponent, unlockedView, onLock, onUnlock }: LockBoardBarProps) => {
  if (unlockedView) {
    return (
      <div className="text-center">
        <Button variant="outline" onClick={onUnlock}>
          <Unlock className="h-4 w-4 mr-1" /> Torna a modificare la board
        </Button>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
      <div className="text-sm">
        {count < MIN_CHARACTERS ? (
          <span className="text-amber-600">Aggiungi almeno {MIN_CHARACTERS - count} personaggi per iniziare.</span>
        ) : !hasOpponent ? (
          <span className="text-amber-600">Personaggi pronti! Aspetta che il Giocatore 2 entri per bloccare la board.</span>
        ) : (
          <span className="text-green-600">Pronto! Il Giocatore 2 è nella stanza.</span>
        )}
      </div>
      <Button onClick={onLock} disabled={count < MIN_CHARACTERS || !hasOpponent} size="lg">
        <Lock className="h-4 w-4 mr-1" /> Blocca board e gioca
      </Button>
    </div>
  )
}
