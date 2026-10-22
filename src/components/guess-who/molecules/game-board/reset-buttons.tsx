'use client'

import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/guess-who/atoms/buttons/button'

interface ResetButtonsProps {
  /** count of cards excluded during the current turn */
  turnCount: number
  onResetAll: () => void
  onResetTurn: () => void
}

/** Side-by-side "Reset totale" + "Reset turno (N)" buttons. */
export const ResetButtons = ({ turnCount, onResetAll, onResetTurn }: ResetButtonsProps) => (
  <div className="flex gap-2">
    <Button size="sm" variant="secondary" onClick={onResetAll} className="flex-1">
      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset totale
    </Button>
    <Button
      size="sm"
      variant="secondary"
      onClick={onResetTurn}
      className="flex-1"
      disabled={turnCount === 0}
    >
      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset turno ({turnCount})
    </Button>
  </div>
)
