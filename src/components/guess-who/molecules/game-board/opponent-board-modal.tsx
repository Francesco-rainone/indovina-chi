'use client'

import { Eye, X } from 'lucide-react'
import { Button } from '@/components/guess-who/atoms/buttons/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/guess-who/atoms/dialogs/dialog'
import { Character } from '@/lib/guess-who-types'
import { CharacterCard } from '@/components/guess-who/atoms/cards'

interface OpponentBoardModalProps {
  open: boolean
  onClose: () => void
  opponentName: string
  characters: Character[]
  opponentExcluded: string[]
  opponentColor: 'p1' | 'p2'
}

/** Modal showing the opponent's board with their excluded cards flipped down. */
export const OpponentBoardModal = ({
  open,
  onClose,
  opponentName,
  characters,
  opponentExcluded,
  opponentColor,
}: OpponentBoardModalProps) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent showCloseButton={false} className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Eye className="h-5 w-5" style={{ color: 'var(--color-p1)' }} />
            Board di {opponentName}
          </span>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="chiudi">
            <X className="h-4 w-4" />
          </Button>
        </DialogTitle>
      </DialogHeader>
      <p className="text-xs text-muted-foreground mb-3">
        Carte escluse dall&apos;avversario ({opponentExcluded.length}/{characters.length}):
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {characters.map((c) => (
          <CharacterCard
            key={c.id}
            character={c}
            playerColor={opponentColor}
            size="sm"
            excluded={opponentExcluded.includes(c.id)}
            disabled
          />
        ))}
      </div>
    </DialogContent>
  </Dialog>
)
