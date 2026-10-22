'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useGuessWho, useGuessWhoStore, clearSession } from '@/hooks/use-guess-who'
import { RoomBadges, ConnectionBadge } from '@/components/guess-who/molecules/header'

export const Header = () => {
  const { room, connected, opponent } = useGuessWho()
  const store = useGuessWhoStore()
  const router = useRouter()

  const leave = () => {
    store.setRoom(null)
    store.setError(null)
    clearSession()
    router.push('/')
    toast.info('Sei uscito dalla stanza.')
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/30 bg-black/45 backdrop-blur supports-[backdrop-filter]:bg-black/40">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="guess-name-title leading-none">
            <span className="ln1 text-base sm:text-lg">INDOVINA</span>
            <span className="ln2 text-base sm:text-lg">CHI?</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {room ? (
            <RoomBadges playersCount={room.players.length} opponent={opponent} onLeave={leave} />
          ) : (
            <ConnectionBadge connected={connected} />
          )}
        </div>
      </div>
    </header>
  )
}
