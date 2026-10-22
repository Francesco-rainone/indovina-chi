'use client'

import { LivesRow } from '@/components/guess-who/atoms/feedback'

interface LivesPanelProps {
  useLives: boolean
  startingLives: number
  myLives: number
  phase: 'picking' | 'playing' | 'ended'
  matchWinner: boolean
  iWonMatch: boolean
  winnerId: string | null
  myId: string
}

/** Right-aside "Vite" header — hearts row + status text (or "1 tentativo" when lives are off). */
export const LivesPanel = ({
  useLives,
  startingLives,
  myLives,
  phase,
  matchWinner,
  iWonMatch,
  winnerId,
  myId,
}: LivesPanelProps) => {
  if (useLives) {
    return (
      <div className="mb-3 text-center">
        <h2 className="font-bold text-white text-lg sm:text-xl mb-1" style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.35)' }}>Vite</h2>
        <LivesRow total={startingLives} remaining={myLives} />
        {phase === 'ended' && (
          <p className="text-[11px] text-white/80 mt-1">
            {matchWinner ? (iWonMatch ? 'Hai vinto!' : 'Hai perso.') : (winnerId === myId ? 'Round vinto' : 'Round perso')}
          </p>
        )}
      </div>
    )
  }
  return (
    <div className="mb-3 text-center">
      <h2 className="guess-name guess-name-sm text-lg sm:text-xl mb-1 inline-block">1 tentativo</h2>
      <p className="text-[11px] text-white/80">Sbagli = perdi il round</p>
    </div>
  )
}
