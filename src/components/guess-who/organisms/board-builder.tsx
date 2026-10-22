'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/guess-who/atoms/cards/card'
import { Character, MAX_CHARACTERS, MIN_CHARACTERS } from '@/lib/guess-who-types'
import { emitAck, useGuessWho, useGuessWhoStore } from '@/hooks/use-guess-who'
import { fileToCompressedDataURL } from '@/lib/image-utils'
import { toast } from 'sonner'
import { CharacterCard } from '@/components/guess-who/atoms/cards'
import {
  CharacterUploadForm,
  BulkUploadButton,
  CharacterGridItem,
  WaitingOpponentBanner,
  LockBoardBar,
} from '@/components/guess-who/molecules/board-builder'

interface BoardBuilderProps {
  isHost: boolean
}

export const BoardBuilder = ({ isHost }: BoardBuilderProps) => {
  const { socket, room, opponent, me } = useGuessWho()
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)

  const characters = room?.characters ?? []

  // ----- Add single character (optimistic) -----
  const handleAdd = (name: string, image: string) => {
    if (!socket || !room) return
    if (characters.length >= MAX_CHARACTERS) return
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    useGuessWhoStore.getState().applyOptimisticAddCharacter(tempId, name, image)
    emitAck(socket, 'add-character', { code: room.code, character: { name, image } }).then((res: any) => {
      if (!res.ok) useGuessWhoStore.getState().applyOptimisticRemoveCharacter(tempId)
      else if (res.character?.id) useGuessWhoStore.getState().applyOptimisticSwapCharacterId(tempId, res.character.id)
    })
  }

  // ----- Bulk upload (optimistic, sequential) -----
  const handleBulkUpload = async (files: FileList) => {
    if (!socket || !room) return
    const availableSlots = MAX_CHARACTERS - characters.length
    if (availableSlots <= 0) return
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, availableSlots)
    if (imageFiles.length === 0) return
    setBulkLoading(true)
    setBulkProgress({ current: 0, total: imageFiles.length })
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]
      try {
        const dataUrl = await fileToCompressedDataURL(file, 320, 0.82)
        const charName =
          file.name.replace(/\.[^.]+$/, '').replace(/^\d+[-_]?/, '').trim() ||
          `Personaggio ${characters.length + i + 1}`
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        useGuessWhoStore.getState().applyOptimisticAddCharacter(tempId, charName, dataUrl)
        emitAck(socket, 'add-character', { code: room.code, character: { name: charName, image: dataUrl } }).then((res: any) => {
          if (!res.ok) useGuessWhoStore.getState().applyOptimisticRemoveCharacter(tempId)
          else if (res.character?.id) useGuessWhoStore.getState().applyOptimisticSwapCharacterId(tempId, res.character.id)
        })
      } catch (e) {
        console.error('[bulk-upload] failed', file.name)
      }
      setBulkProgress({ current: i + 1, total: imageFiles.length })
    }
    setBulkLoading(false)
  }

  // ----- Edit / remove / lock / unlock (optimistic) -----
  const handleSaveEdit = (id: string, name: string, image: string) => {
    if (!socket || !room) return
    useGuessWhoStore.getState().applyOptimisticUpdateCharacter(id, name, image)
    setEditingId(null)
    emitAck(socket, 'update-character', { code: room.code, id, name, image }).then((res) => {
      if (!res.ok) toast.error(res.error || 'Errore')
    })
  }

  const handleRemove = (id: string) => {
    if (!socket || !room) return
    useGuessWhoStore.getState().applyOptimisticRemoveCharacter(id)
    emitAck(socket, 'remove-character', { code: room.code, id }).then((res) => {
      if (!res.ok) toast.error(res.error || 'Errore')
    })
  }

  const lockBoard = async () => {
    if (!socket || !room) return
    if (characters.length < MIN_CHARACTERS || !opponent) return

    // AUTO-SAVE: only when this room was NOT created from an existing saved board.
    // When room.savedBoardId is null, the board is brand new → POST it to /api/boards
    // so it lands in the library for future games. Boards selected from the library
    // already have savedBoardId set → skip the POST (no duplicate DB entries).
    let newSavedBoardId: string | null = room.savedBoardId ?? null
    if (!room.savedBoardId) {
      try {
        // Build a friendly name from the first 3 character names + ellipsis (matches the existing board naming convention).
        const boardName =
          characters.slice(0, 3).map((c) => c.name).join(', ') +
          (characters.length > 3 ? '…' : '')
        const r = await fetch('/api/boards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: boardName,
            characters,
            creatorName: me?.name ?? null,
          }),
        })
        if (r.ok) {
          const data = await r.json()
          if (data?.id) {
            newSavedBoardId = data.id
            // Optimistic: persist the new savedBoardId in local room state so a re-lock
            // (after unlock→edit) doesn't trigger a duplicate POST.
            useGuessWhoStore.getState().setRoom({ ...room, savedBoardId: data.id })
          }
        } else {
          console.error('[lockBoard] auto-save failed: HTTP', r.status)
        }
      } catch (e) {
        // Don't block the lock if the auto-save fails — the game can still proceed.
        console.error('[lockBoard] auto-save error', e)
      }
    }

    const res = await emitAck(socket, 'lock-board', {
      code: room.code,
      savedBoardId: newSavedBoardId,
    })
    if (!res.ok) toast.error(res.error || 'Errore')
  }

  const unlockBoard = async () => {
    if (!socket || !room) return
    const res = await emitAck(socket, 'unlock-board', { code: room.code })
    if (!res.ok) toast.error(res.error || 'Errore')
  }

  // ----- View for Guest -----
  if (!isHost) {
    return (
      <Card className="max-w-5xl mx-auto w-full figma-card bg-white border-0 shadow-none">
        <CardHeader>
          <CardTitle>Stanza {room?.code}</CardTitle>
          <CardDescription>
            Il Giocatore 1 (host) sta costruendo la board con i personaggi. Attendi che abbia finito.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed p-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> In attesa che l&apos;host blocchi la board…
          </div>
          {characters.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Anteprima board ({characters.length}):</p>
              <div className="flex flex-wrap gap-3 justify-center">
                {characters.map((c) => (
                  <CharacterCard key={c.id} character={c} size="sm" disabled />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // ----- View for Host -----
  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      <Card className="figma-card bg-white border-0 shadow-none">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>Crea la tua board</span>
          </CardTitle>
          <CardDescription>
            Carica un&apos;immagine per ogni personaggio e dagli un nome. Aggiungi almeno {MIN_CHARACTERS} personaggi
            (max {MAX_CHARACTERS}). La board sarà condivisa in tempo reale con il Giocatore 2.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!opponent && room?.code && <WaitingOpponentBanner roomCode={room.code} />}

          <div className="flex gap-2">
            <CharacterUploadForm onAdd={handleAdd} count={characters.length} disabled={bulkLoading} />
            <BulkUploadButton
              onFiles={handleBulkUpload}
              loading={bulkLoading}
              progress={bulkProgress}
              disabled={characters.length >= MAX_CHARACTERS}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Personaggi ({characters.length}/{MAX_CHARACTERS})</p>
            </div>
            {characters.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Nessun personaggio ancora. Aggiungi il primo qui sopra.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 justify-items-center">
                {characters.map((c) => (
                  <CharacterGridItem
                    key={c.id}
                    character={c}
                    editingId={editingId}
                    onStartEdit={(_c) => setEditingId(_c.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSaveEdit={handleSaveEdit}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            )}
          </div>

          <LockBoardBar
            count={characters.length}
            hasOpponent={!!opponent}
            unlockedView={room?.phase === 'picking'}
            onLock={lockBoard}
            onUnlock={unlockBoard}
          />
        </CardContent>
      </Card>
    </div>
  )
}
