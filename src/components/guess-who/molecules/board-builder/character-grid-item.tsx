'use client'

import { useState } from 'react'
import { Trash2, Pencil, X, Check, ImagePlus } from 'lucide-react'
import { Button } from '@/components/guess-who/atoms/buttons/button'
import { Input } from '@/components/guess-who/atoms/forms/input'
import { Character } from '@/lib/guess-who-types'
import { fileToCompressedDataURL } from '@/lib/image-utils'
import { toast } from 'sonner'
import { CharacterCard } from '@/components/guess-who/atoms/cards'

interface CharacterGridItemProps {
  character: Character
  /** when this id matches, the item shows the edit overlay */
  editingId: string | null
  onStartEdit: (c: Character) => void
  onCancelEdit: () => void
  onSaveEdit: (id: string, name: string, image: string) => void
  onRemove: (id: string) => void
}

/** A single character cell in the builder grid: shows the card; on hover reveals edit/remove buttons; in edit mode shows the inline edit controls BELOW the card. */
export const CharacterGridItem = ({
  character,
  editingId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRemove,
}: CharacterGridItemProps) => {
  const [editName, setEditName] = useState(character.name)
  const [editImage, setEditImage] = useState<string | null>(character.image)

  // keep editName/editImage in sync when entering edit mode for this character
  // (driven by parent so the parent can also reset on cancel)
  const isEditing = editingId === character.id

  const onPickFile = async (file: File) => {
    try {
      const dataUrl = await fileToCompressedDataURL(file, 320, 0.82)
      setEditImage(dataUrl)
    } catch (e) {
      toast.error((e as Error).message || 'Immagine non valida')
    }
  }

  return (
    <div className="relative group flex flex-col items-center">
      <CharacterCard
        character={isEditing ? { ...character, name: editName || character.name, image: editImage || character.image } : character}
        size="sm"
        disabled={!isEditing}
      />
      {!isEditing && (
        <div className="absolute -top-2 -right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="secondary" className="h-6 w-6" onClick={() => { setEditName(character.name); setEditImage(character.image); onStartEdit(character) }} aria-label="modifica">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="destructive" className="h-6 w-6" onClick={() => onRemove(character.id)} aria-label="rimuovi">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
      {isEditing && (
        <div className="w-full space-y-1.5 mt-1">
          <Input
            className="h-7 text-xs"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && editName.trim() && editImage) onSaveEdit(character.id, editName.trim(), editImage) }}
            placeholder="Nome"
          />
          <label className="flex h-7 cursor-pointer items-center justify-center rounded border border-dashed text-[10px] text-muted-foreground hover:border-primary">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Cambia immagine"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onPickFile(f)
                e.target.value = ''
              }}
            />
            <ImagePlus className="h-3 w-3 mr-1" /> Cambia img
          </label>
          <div className="flex gap-1">
            <Button
              size="sm"
              className="h-7 flex-1"
              onClick={() => { if (editName.trim() && editImage) onSaveEdit(character.id, editName.trim(), editImage) }}
              disabled={!editName.trim() || !editImage}
              aria-label="salva"
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Salva
            </Button>
            <Button size="sm" variant="ghost" className="h-7" onClick={onCancelEdit} aria-label="annulla">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
