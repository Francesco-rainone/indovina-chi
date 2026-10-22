'use client'

import { Wifi, WifiOff } from 'lucide-react'
import { Badge } from '@/components/guess-who/atoms/badges/badge'
import { cn } from '@/lib/utils'

interface ConnectionBadgeProps {
  connected: boolean
}

/** Sticky-header online/offline pill shown when no room is active. */
export const ConnectionBadge = ({ connected }: ConnectionBadgeProps) => (
  <Badge className={cn('border-0 bg-white/95 text-black')}>
    {connected ? <Wifi className="h-3 w-3 mr-1 text-green-600" /> : <WifiOff className="h-3 w-3 mr-1 text-amber-600" />}
    {connected ? 'Online' : 'Offline'}
  </Badge>
)
