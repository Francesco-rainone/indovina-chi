'use client'

import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LivesRowProps {
  /** total slots (starting lives) */
  total: number
  /** remaining lives */
  remaining: number
  /** tailwind size for each heart (e.g. 'h-7 w-7 sm:h-8 sm:w-8' for big, 'h-4 w-4' for small) */
  sizeClass?: string
  /** drop-shadow on filled hearts? (default: true on big) */
  shadow?: boolean
  centered?: boolean
}

/** Row of heart icons representing lives. Filled hearts = remaining. */
export const LivesRow = ({
  total,
  remaining,
  sizeClass = 'h-7 w-7 sm:h-8 sm:w-8',
  shadow = true,
  centered = true,
}: LivesRowProps) => {
  const wrap = centered ? 'flex items-center justify-center gap-1' : 'flex items-center gap-1'
  return (
    <div className={wrap}>
      {Array.from({ length: total }).map((_, i) => (
        <Heart
          key={i}
          className={cn(
            sizeClass,
            'transition-all',
            i < remaining ? 'fill-[var(--color-lives)] text-[var(--color-lives)]' : 'text-white/30 fill-white/10',
          )}
          style={i < remaining && shadow ? { filter: 'drop-shadow(2px 2px 0 rgba(0,0,0,0.35))' } : undefined}
        />
      ))}
    </div>
  )
}
