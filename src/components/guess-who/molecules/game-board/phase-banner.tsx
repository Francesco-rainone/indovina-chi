'use client'

interface PhaseBannerProps {
  phase: 'picking' | 'playing' | 'ended'
  iHavePicked: boolean
  myTurn: boolean
  matchWinner: boolean
  iWonMatch: boolean
  winnerId: string | null
  myId: string
  opponentName?: string
  currentRound: number
}

/** Black status banner above the board grid. Tells the player what to do / what happened. */
export const PhaseBanner = ({
  phase,
  iHavePicked,
  myTurn,
  matchWinner,
  iWonMatch,
  winnerId,
  myId,
  opponentName,
  currentRound,
}: PhaseBannerProps) => {
  let text = ''
  if (phase === 'picking') {
    text = iHavePicked ? 'Scelta bloccata. In attesa dell\'avversario…' : 'Clicca sul personaggio che l\'avversario dovrà indovinare.'
  } else if (phase === 'playing') {
    text = myTurn
      ? '🔒 Tuo turno: click destro su una carta per indovinare, oppure passa il turno.'
      : 'In attesa della mossa dell\'avversario…'
  } else if (phase === 'ended') {
    text = matchWinner
      ? (iWonMatch ? '🏆 Hai vinto la partita!' : `🏆 Vince la partita ${opponentName ?? 'l\'avversario'}.`)
      : (winnerId === myId ? `Round ${currentRound} vinto da te!` : `Round ${currentRound} vinto da ${opponentName ?? 'avversario'}.`)
  }
  return (
    <div className="rounded-md bg-black/35 px-3 py-2 mb-3 text-white text-xs sm:text-sm text-center font-medium">
      {text}
    </div>
  )
}
