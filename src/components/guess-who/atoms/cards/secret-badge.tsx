'use client'

import { Eye } from 'lucide-react'

interface SecretBadgeProps {
  inkColor: string
}

/** Small "Segreto" pill shown on top-left of the player's own secret card. */
export const SecretBadge = ({ inkColor }: SecretBadgeProps) => (
  <span
    className="absolute top-1 left-1 inline-flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
    style={{ color: inkColor }}
  >
    <Eye className="w-3 h-3" /> Segreto
  </span>
)
