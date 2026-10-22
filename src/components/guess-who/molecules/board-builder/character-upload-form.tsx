'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/guess-who/atoms/buttons/button'
import { Input } from '@/components/guess-who/atoms/forms/input'
import { Label } from '@/components/guess-who/atoms/forms/label'
import { fileToCompressedDataURL } from '@/lib/image-utils'
import { toast } from 'sonner'
import { MAX_CHARACTERS } from '@/lib/guess-who-types'

interface CharacterUploadFormProps {
  onAdd: (name: string, image: string) => void
  disabled?: boolean
  /** how many characters are already on the board */
  count: number
}

/** Single-character upload form: image picker + name + "Aggiungi" button. */
export const CharacterUploadForm = ({ onAdd, disabled, count }: CharacterUploadFormProps) => {
  const [name, setName] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [imageFileName, setImageFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [nameError, setNameError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    if (!name.trim()) {
      setNameError(true)
      return
    }
    if (!image) return
    if (count >= MAX_CHARACTERS) return
    onAdd(name.trim(), image)
    setName('')
    setImage(null)
    setImageFileName('')
    setNameError(false)
  }

  return (
    <div className="flex-1 rounded-lg border p-4 space-y-3">
      <div className="grid sm:grid-cols-[auto_1fr] gap-4">
        <div className="flex flex-col items-center gap-2">
          <label
            htmlFor="character-image"
            className="group relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted hover:border-primary transition-colors"
          >
            {image ? (
              <>
                <img src={image} alt="anteprima" className="h-full w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  Cambia
                </span>
              </>
            ) : loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImagePlus className="h-6 w-6" />
                <span className="text-[10px]">Immagine</span>
              </span>
            )}
            <input
              id="character-image"
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="sr-only"
              aria-label="Carica immagine personaggio"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) {
                  setLoading(true)
                  fileToCompressedDataURL(f, 320, 0.82)
                    .then((d) => { setImage(d); setImageFileName(f.name) })
                    .catch(() => toast.error('Immagine non valida'))
                    .finally(() => setLoading(false))
                }
                e.target.value = ''
              }}
            />
          </label>
          {imageFileName && (
            <span className="text-[10px] text-muted-foreground max-w-[8rem] truncate">{imageFileName}</span>
          )}
        </div>
        <div className="flex flex-col gap-2 justify-center">
          <Label htmlFor="character-name" className="text-xs">Nome personaggio</Label>
          <Input
            id="character-name"
            placeholder="es. Marco il Magnifico"
            value={name}
            maxLength={40}
            required
            aria-invalid={nameError && !name.trim()}
            onChange={(e) => {
              setName(e.target.value)
              if (e.target.value.trim()) setNameError(false)
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            className={nameError && !name.trim() ? 'border-destructive' : ''}
          />
          {nameError && !name.trim() && (
            <p className="text-xs text-destructive">Inserisci il nome del personaggio</p>
          )}
          <div className="flex gap-2">
            <Button onClick={submit} disabled={loading || disabled || !image || count >= MAX_CHARACTERS}>
              <ImagePlus className="h-4 w-4 mr-1" /> Aggiungi
            </Button>
            {(name || image) && (
              <Button variant="ghost" onClick={() => { setName(''); setImage(null); setImageFileName('') }}>
                <X className="h-4 w-4 mr-1" /> Pulisci
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
