'use client'

import { Users, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/utils'

interface CodePillProps {
  code: string
}

/** Room code pill in the board header row — click to copy. */
export const CodePill = ({ code }: CodePillProps) => (
  <div className="flex items-center gap-2 text-white">
    <Users className="h-4 w-4" />
    <button
      onClick={() => {
        void copyToClipboard(code.trim())
          .then(() => toast.success('Codice copiato!'))
          .catch(() => toast.error('Impossibile copiare negli appunti'))
      }}
      className="flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-2 py-0.5 transition-colors"
      aria-label="Copia codice stanza"
    >
      <span className="font-bold text-sm sm:text-base">{code}</span>
      <Copy className="h-3 w-3 text-white/70" />
    </button>
  </div>
)
