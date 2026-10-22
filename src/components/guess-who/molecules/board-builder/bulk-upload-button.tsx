'use client'

import { useRef } from 'react'
import { FolderOpen, Loader2 } from 'lucide-react'
import { Button } from '@/components/guess-who/atoms/buttons/button'

interface BulkUploadButtonProps {
  onFiles: (files: FileList) => void
  loading: boolean
  progress: { current: number; total: number }
  disabled?: boolean
}

/** Hidden multi-file input + outline button. Shows "N/M" while uploading. */
export const BulkUploadButton = ({ onFiles, loading, progress, disabled }: BulkUploadButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="Seleziona più immagini"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) onFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <Button
        variant="outline"
        className="h-full"
        onClick={() => inputRef.current?.click()}
        disabled={loading || disabled}
        aria-label="Seleziona più immagini"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" /> {progress.current}/{progress.total}
          </>
        ) : (
          <>
            <FolderOpen className="h-4 w-4 mr-1" /> Più immagini
          </>
        )}
      </Button>
    </>
  )
}
