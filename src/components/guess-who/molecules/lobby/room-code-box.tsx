'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/guess-who/atoms/buttons/button'
import { copyToClipboard } from '@/lib/utils'

interface RoomCodeBoxProps {
  code: string
}

/** Box that shows the created room code with a copy button. */
export const RoomCodeBox = ({ code }: RoomCodeBoxProps) => {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await copyToClipboard(code.trim())
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="rounded-lg border bg-muted/50 p-4 text-center space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">Codice stanza</p>
      <div className="flex items-center justify-center gap-2">
        <span className="text-3xl font-mono font-bold tracking-widest text-primary">{code}</span>
        <Button size="icon" variant="ghost" onClick={copy} aria-label="Copia codice">
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Condividi questo codice con il Giocatore 2.</p>
    </div>
  )
}
