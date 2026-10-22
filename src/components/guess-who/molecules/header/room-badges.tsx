'use client'

import { LogOut, Users } from 'lucide-react'
import { Button } from '@/components/guess-who/atoms/buttons/button'
import { Badge } from '@/components/guess-who/atoms/badges/badge'
import { RoomState } from '@/lib/guess-who-types'

interface RoomBadgesProps {
  playersCount: number
  opponent: RoomState['opponent']
  onLeave: () => void
}

/** Sticky-header room badges: players count, "In attesa P2" pill, Esci button. */
export const RoomBadges = ({ playersCount, opponent, onLeave }: RoomBadgesProps) => (
  <>
    <Badge className="gap-1 bg-white/95 text-black border-0">
      <Users className="h-3 w-3" />
      {playersCount}/2
    </Badge>
    {!opponent && (
      <Badge className="hidden md:inline-flex border-0 bg-amber-400 text-black">
        In attesa P2
      </Badge>
    )}
    <Button
      size="sm"
      variant="ghost"
      onClick={onLeave}
      aria-label="Esci dalla stanza"
      className="text-white hover:bg-white/15 hover:text-white"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Esci</span>
    </Button>
  </>
)
