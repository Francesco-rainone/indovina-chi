'use client'

import { useState } from 'react'
import { Check, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/guess-who/atoms/buttons/button'
import { Input } from '@/components/guess-who/atoms/forms/input'
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
  onRename: (id: string, name: string) => Promise<void>
}

/** A single row of the saved-boards list: count badge, name/meta, "Usa" + delete buttons. */
export const SavedBoardItem = ({ board: b, using, disabled, onUse, onDelete, onRename }: SavedBoardItemProps) => {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(b.name)
  const [saving, setSaving] = useState(false)

  const saveName = async () => {
    if (!name.trim() || name.trim() === b.name) {
      setName(b.name)
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onRename(b.id, name)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg border p-3 transition-colors',
      using ? 'border-primary bg-primary/5' : 'hover:border-primary/50',
    )}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-sm">
        {b.charCount}
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <Input value={name} maxLength={80} autoFocus onChange={(event) => setName(event.target.value)} onKeyDown={(event) => {
            if (event.key === 'Enter') void saveName()
            if (event.key === 'Escape') { setName(b.name); setEditing(false) }
          }} />
        ) : (
          <p className="text-sm font-medium truncate">{b.name}</p>
        )}
        <p className="text-[11px] text-muted-foreground">
          {b.charCount} personaggi
          {b.creatorName ? ` · creata da ${b.creatorName}` : ''}
          {' · '}{new Date(b.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
        </p>
      </div>
      {editing ? (
        <>
          <Button size="icon" variant="ghost" onClick={() => void saveName()} disabled={disabled || saving || !name.trim()} aria-label="Salva nome">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { setName(b.name); setEditing(false) }} disabled={saving} aria-label="Annulla rinomina">
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <Button size="icon" variant="ghost" onClick={() => setEditing(true)} disabled={disabled} aria-label="Rinomina board">
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <Button size="sm" onClick={() => onUse(b)} disabled={disabled || editing}>
        {using ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Usa'}
      </Button>
      <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => onDelete(b.id)} disabled={disabled || editing} aria-label="Elimina board">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
