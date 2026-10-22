'use client'

import { useEffect, useState } from 'react'
import { Loader2, ImageIcon } from 'lucide-react'
import { Button } from '@/components/guess-who/atoms/buttons/button'
import { Input } from '@/components/guess-who/atoms/forms/input'
import { Label } from '@/components/guess-who/atoms/forms/label'
import { toast } from 'sonner'
import { emitAck, useGuessWho, saveSession } from '@/hooks/use-guess-who'
import { Character } from '@/lib/guess-who-types'
import { SavedBoardItem, SavedBoardSummary } from './saved-board-item'

interface SavedBoardsTabProps {
  playerName: string
  onNameChange: (v: string) => void
  useLives: boolean
  roundMode: boolean
  connected: boolean
  onError: (e: string | null) => void
  onCreated: (code: string) => void
}

/** "Board salvate" tab: lists every saved board, lets the user start a room from one of them. */
export const SavedBoardsTab = ({
  playerName,
  onNameChange,
  useLives,
  roundMode,
  connected,
  onError,
  onCreated,
}: SavedBoardsTabProps) => {
  const { socket } = useGuessWho()
  const [boards, setBoards] = useState<SavedBoardSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [using, setUsing] = useState<string | null>(null)
  const [error, setErrorLocal] = useState<string | null>(null)
  const [nameError, setNameError] = useState(false)

  const load = async () => {
    setLoading(true)
    setErrorLocal(null)
    try {
      const r = await fetch('/api/boards')
      if (!r.ok) throw new Error('Caricamento fallito')
      const data = await r.json()
      setBoards(data.boards ?? [])
    } catch (e) {
      setErrorLocal((e as Error).message || 'Errore caricamento')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const startWithBoard = async (b: SavedBoardSummary) => {
    if (!playerName.trim()) {
      setNameError(true)
      return
    }
    if (!connected || !socket) {
      toast.error('Connessione al server non ancora pronta.')
      return
    }
    setUsing(b.id)
    try {
      // Client-side board fetch — the server mini-service doesn't have Prisma integrated
      // (caused stability issues in the sandbox cgroup). The client relays characters to the
      // server via the socket event payload. This is the X-3 optimization DEFERRED.
      const r = await fetch(`/api/boards/${b.id}`)
      if (!r.ok) throw new Error('Board non trovata')
      const data = await r.json()
      const characters: Character[] = data.characters ?? []
      if (characters.length < 4) {
        toast.error('Questa board ha troppi pochi personaggi')
        return
      }
      const res = await emitAck(socket, 'create-room-with-board', { name: playerName, characters, useLives, roundMode, savedBoardId: b.id })
      if (!res.ok) {
        toast.error(res.error || 'Errore creazione stanza')
        onError(res.error || null)
        return
      }
      saveSession(res.code!, playerName.trim() || 'Giocatore 1')
      toast.success(`Stanza creata con la board "${b.name}"!`)
      onCreated(res.code!)
    } catch (e) {
      toast.error((e as Error).message || 'Errore')
    } finally {
      setUsing(null)
    }
  }

  const deleteBoard = async (id: string) => {
    if (!confirm('Eliminare questa board salvata?')) return
    // OPTIMISTIC: remove the board from the local list immediately, then DELETE fire-and-forget. Refetch only on error.
    const before = boards
    setBoards((prev) => prev.filter((b) => b.id !== id))
    try {
      const r = await fetch(`/api/boards/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Eliminazione fallita')
      toast.success('Board eliminata')
    } catch {
      setBoards(before)
      toast.error('Errore eliminazione')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Caricamento board salvate…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-red-400 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
        <Button variant="outline" onClick={load}>Riprova</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="saved-name">Il tuo nome</Label>
        <Input
          id="saved-name"
          placeholder="es. Alex"
          value={playerName}
          maxLength={20}
          required
          aria-invalid={nameError && !playerName.trim()}
          onChange={(e) => {
            onNameChange(e.target.value)
            if (e.target.value.trim()) setNameError(false)
          }}
          className={nameError && !playerName.trim() ? 'border-destructive' : ''}
        />
        {nameError && !playerName.trim() && (
          <p className="text-xs text-destructive">Inserisci il tuo nome</p>
        )}
      </div>

      {boards.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
          <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Nessuna board salvata</p>
          <p className="text-xs text-muted-foreground">
            Crea una stanza, aggiungi personaggi e blocca la board: verrà salvata qui automaticamente per i prossimi giochi.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {boards.map((b) => (
            <SavedBoardItem
              key={b.id}
              board={b}
              using={using === b.id}
              disabled={!connected || using !== null}
              onUse={startWithBoard}
              onDelete={deleteBoard}
            />
          ))}
        </div>
      )}

      {!connected && (
        <p className="text-xs text-amber-600 text-center">Connessione al server in corso…</p>
      )}
    </div>
  )
}
