'use client'

interface RoundScoreBadgeProps {
  currentRound: number
  myRoundWins: number
  oppRoundWins: number
}

/** White pill showing "Round N/3 | myWins : oppWins". Only shown in roundMode. */
export const RoundScoreBadge = ({ currentRound, myRoundWins, oppRoundWins }: RoundScoreBadgeProps) => (
  <span
    className="inline-flex items-center gap-2.5 rounded-lg bg-white px-3 py-1.5 font-bold text-base"
    style={{ boxShadow: '2px 2px 0 rgba(0,0,0,0.3)' }}
  >
    <span className="text-gray-500 text-xs">Round {currentRound}/3</span>
    <span className="text-gray-300">|</span>
    <span className="text-green-600">{myRoundWins}</span>
    <span className="text-gray-400">:</span>
    <span className="text-red-600">{oppRoundWins}</span>
  </span>
)
