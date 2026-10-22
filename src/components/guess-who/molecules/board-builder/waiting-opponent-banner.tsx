'use client'

import { AlertTriangle, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/utils'

interface WaitingOpponentBannerProps {
  roomCode: string
}

/** Amber banner shown to the host when no opponent has joined yet. Includes the room-code box (with red border) + "Condividi link" web-share / clipboard. */
export const WaitingOpponentBanner = ({ roomCode }: WaitingOpponentBannerProps) => {
  const copy = async (value: string, message: string) => {
    try {
      await copyToClipboard(value)
      toast.success(message)
    } catch {
      toast.error('Impossibile copiare negli appunti')
    }
  }

  return (
  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
    <AlertTriangle className="h-4 w-4 shrink-0" />
    <span>
      In attesa del Giocatore 2… Condividi il codice{' '}
      <button
        onClick={() => { void copy(roomCode.trim(), 'Codice copiato!') }}
        className="inline-flex items-center gap-1 mx-1 rounded-lg border-2 border-primary px-2 py-0.5 font-mono font-bold text-primary hover:bg-primary/10 transition-colors"
        aria-label="Copia codice"
      >
        {roomCode}
        <Copy className="h-3 w-3" />
      </button>
      <button
        onClick={() => {
          const url = `${window.location.origin}/?room=${roomCode}`
          void copy(url, 'Link copiato!')
        }}
        className="ml-2 inline-flex items-center gap-1 text-blue-600 hover:underline"
        aria-label="Condividi link"
      >
        ↗ Condividi link
      </button>
      . Puoi comunque preparare i personaggi.
    </span>
  </div>
  )
}
