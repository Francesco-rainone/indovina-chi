'use client'

import { LivesRow, ThinkingDots } from '@/components/guess-who/atoms/feedback'
import { RoomState } from '@/lib/guess-who-types'

interface OpponentInfoProps {
  opponent: NonNullable<RoomState['opponent']>
  startingLives: number
  opponentLives: number
  useLives: boolean
  phase: 'picking' | 'playing' | 'ended'
  /** true when it's the opponent's turn right now (picking or playing) */
  isOpponentTurn: boolean
  /** true during picking while opponent hasn't picked yet */
  bothPicked: boolean
}

/** Right-aside block: AVVERSARIO label + name + lives row + (optional) thinking dots. */
export const OpponentInfo = ({
  opponent,
  startingLives,
  opponentLives,
  useLives,
  phase,
  isOpponentTurn,
  bothPicked,
}: OpponentInfoProps) => {
  const showThinking = (phase === 'picking' && !bothPicked) || (phase === 'playing' && isOpponentTurn)
  return (
    <div className="rounded-md bg-black/30 px-3 py-2.5 mb-3 text-center text-white">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/70 mb-0.5">Avversario</p>
      <p className="font-bold text-base sm:text-lg leading-tight truncate">{opponent.name}</p>
      <div className="flex items-center justify-center gap-1 mt-1">
        {useLives ? (
          <LivesRow total={startingLives} remaining={opponentLives} sizeClass="h-4 w-4" shadow={false} />
        ) : (
          <span className="text-xs text-white/80">1 tentativo</span>
        )}
      </div>
      {showThinking ? <ThinkingDots /> : null}
    </div>
  )
}
