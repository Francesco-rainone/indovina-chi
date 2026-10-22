'use client'

import { Character } from '@/lib/guess-who-types'
import { CharacterCard } from '@/components/guess-who/atoms/cards'

interface SecretCardPanelProps {
  mySecretChar: Character | null
  playerColor: 'p1' | 'p2'
  phase: 'picking' | 'playing' | 'ended'
  iHavePicked: boolean
}

/** Right-aside panel that shows the player's secret character (large card) or a placeholder. */
export const SecretCardPanel = ({ mySecretChar, playerColor, phase, iHavePicked }: SecretCardPanelProps) => (
  <div className="mb-6 flex flex-col items-center">
    {mySecretChar ? (
      <CharacterCard character={mySecretChar} playerColor={playerColor} size="lg" isMySecret disabled />
    ) : (
      <div className="figma-card-tight bg-white/40 w-40 h-52 flex items-center justify-center text-center text-white/90 text-xs p-3">
        {phase === 'picking' ? (iHavePicked ? 'In attesa…' : 'Scegli una carta dalla board') : 'Nessun segreto'}
      </div>
    )}
  </div>
)
