'use client'

import { Eye, Send, Trophy, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/guess-who/atoms/buttons/button'

interface ActionButtonsProps {
  phase: 'picking' | 'playing' | 'ended'
  myTurn: boolean
  submitting: boolean
  roundDoneButMatchNotOver: boolean
  matchWinner: boolean
  isHost: boolean
  onShowOpponent: () => void
  onPassTurn: () => void
  onNextRound: () => void
  onPlayAgain: () => void
  onRestartBuilder: () => void
}

/** Right-aside action buttons. Behaviour depends on phase. */
export const ActionButtons = ({
  phase,
  myTurn,
  submitting,
  roundDoneButMatchNotOver,
  matchWinner,
  isHost,
  onShowOpponent,
  onPassTurn,
  onNextRound,
  onPlayAgain,
  onRestartBuilder,
}: ActionButtonsProps) => {
  if (phase === 'playing') {
    return (
      <>
        <Button
          className="w-full text-sm font-bold h-10 mb-2 hover:brightness-95"
          size="lg"
          style={{ background: '#D4A017', color: '#1a1a1a' }}
          onClick={onShowOpponent}
        >
          <Eye className="h-4 w-4 mr-1" /> Vedi board avversario
        </Button>
        {myTurn ? (
          <Button
            className="w-full text-sm font-bold h-11 bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
            onClick={onPassTurn}
            disabled={submitting}
          >
            <Send className="h-4 w-4 mr-1" /> Passa il turno
          </Button>
        ) : (
          <div className="w-full text-center text-xs text-white/80 bg-black/25 rounded-md py-2.5">
            In attesa della mossa dell&apos;avversario…
          </div>
        )}
      </>
    )
  }
  if (phase === 'ended' && roundDoneButMatchNotOver) {
    return (
      <Button className="w-full text-sm font-bold h-11" size="lg" onClick={onNextRound} disabled={submitting}>
        <Trophy className="h-4 w-4 mr-1" /> Prossimo round
      </Button>
    )
  }
  if (phase === 'ended' && matchWinner) {
    return (
      <>
        <Button className="w-full text-sm font-bold h-11" size="lg" onClick={onPlayAgain} disabled={submitting}>
          <Trophy className="h-4 w-4 mr-1" /> Gioca ancora
        </Button>
        {isHost && (
          <Button className="w-full text-sm font-bold h-11 mt-2" size="lg" variant="secondary" onClick={onRestartBuilder} disabled={submitting}>
            <LayoutGrid className="h-4 w-4 mr-1" /> Cambia board
          </Button>
        )}
      </>
    )
  }
  return null
}
