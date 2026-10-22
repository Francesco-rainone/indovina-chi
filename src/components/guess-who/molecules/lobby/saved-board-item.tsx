'use client'

import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/guess-who/atoms/buttons/button'
import { cn } from '@/lib/utils'

export interface SavedBoardSummary {
  id: string
  name: string
  charCount: number
  creatorName?: string | null
  createdAt: string
}

interface SavedBoardItemProps {
  board: SavedBoardSummary
  using: boolean
  disabled: boolean
  onUse: (b: SavedBoardSummary) => void
  onDelete: (id: string) => void
}

/** A single row of the saved-boards list: count badge, name/meta, "Usa" + delete buttons. */
export const SavedBoardItem = ({ board: b, using, disabled, onUse, onDelete }: SavedBoardItemProps) => (
  <div
    className={cn(
      'flex items-center gap-3 rounded-lg border p-3 transition-colors',
      using ? 'border-primary bg-primary/5' : 'hover:border-primary/50',
    )}
  >
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-sm">
      {b.charCount}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{b.name}</p>
      <p className="text-[11px] text-muted-foreground">
        {b.charCount} personaggi
        {b.creatorName ? ` · creata da ${b.creatorName}` : ''}
        {' · '}{new Date(b.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
      </p>
    </div>
    <Button size="sm" onClick={() => onUse(b)} disabled={disabled}>
      {using ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Usa'}
    </Button>
    <Button
      size="icon"
      variant="ghost"
      className="text-muted-foreground hover:text-destructive"
      onClick={() => onDelete(b.id)}
      disabled={disabled}
      aria-label="Elimina board"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
)
