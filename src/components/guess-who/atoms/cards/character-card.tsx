'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Character } from '@/lib/guess-who-types'
import { SecretBadge } from './secret-badge'
import { SelectedCheck } from './selected-check'
import { PickHint } from './pick-hint'
import { GuessableHint } from './guessable-hint'

type PlayerColor = 'p1' | 'p2'

interface CharacterCardProps {
  character: Character
  /** player whose color is used for this card */
  playerColor?: PlayerColor
  /** excluded (down) — strong dark overlay, fully reversible */
  excluded?: boolean
  /** in picking phase: this card is the player's secret selection */
  selected?: boolean
  /** disable interactions */
  disabled?: boolean
  /** show a "secret" badge (your own pick, hidden from opponent) */
  isMySecret?: boolean
  /** highlight as winner reveal */
  winnerReveal?: boolean
  /** wrong-guess flash */
  wrongGuess?: boolean
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  /** guess action — triggered by right-click (desktop) OR long-press (mobile, 500ms). The card abstracts the input modality. */
  onGuess?: () => void
  /** show a small "tap me" hint when pickable */
  pickHint?: boolean
  /** show a "right-click / long-press to guess" hint overlay (when it's your turn and the card is guessable) */
  guessable?: boolean
  /** when true, the card completes a full turn and returns face-up */
  flipReveal?: boolean
  /** turn the card face-down and show the player's colored card back */
  showBack?: boolean
  backImage?: string
}

const sizeMap = {
  sm: { wrap: 'w-[72px] h-[96px] sm:w-20 sm:h-28', img: 'h-[60px] sm:h-[68px]', name: 'text-[10px] sm:text-[11px] py-0.5' },
  md: { wrap: 'w-24 h-32 sm:w-28 sm:h-36', img: 'h-20 sm:h-24', name: 'text-xs sm:text-sm py-1' },
  lg: { wrap: 'w-40 h-52 sm:w-48 sm:h-60', img: 'h-32 sm:h-40', name: 'text-base sm:text-lg py-1.5' },
}

const LONG_PRESS_MS = 500
const LONG_PRESS_MOVE_TOLERANCE_PX = 10

export const CharacterCard = ({
  character,
  playerColor = 'p1',
  excluded = false,
  selected = false,
  disabled = false,
  isMySecret = false,
  winnerReveal = false,
  wrongGuess = false,
  size = 'md',
  onClick,
  onGuess,
  pickHint = false,
  guessable = false,
  flipReveal = false,
  showBack = false,
  backImage,
}: CharacterCardProps) => {
  const s = sizeMap[size]
  const colorVar = playerColor === 'p1' ? 'var(--color-p1)' : 'var(--color-p2)'
  const inkVar = playerColor === 'p1' ? 'var(--color-p1-ink)' : 'var(--color-p2-ink)'

  // ---- Mobile long-press detection (alternative to right-click on touch devices) ----
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onGuess || disabled) return
    longPressFired.current = false
    const t = e.touches[0]
    touchStartPos.current = { x: t.clientX, y: t.clientY }
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      onGuess?.()
      // Haptic feedback if available
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, LONG_PRESS_MS)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return
    const t = e.touches[0]
    const dx = t.clientX - touchStartPos.current.x
    const dy = t.clientY - touchStartPos.current.y
    if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE_PX) {
      cancelLongPress()
    }
  }

  const handleTouchEnd = () => {
    cancelLongPress()
  }

  // Click handler — suppresses the click that fires right after a long-press
  // so the long-press (guess) doesn't also trigger the tap (exclude).
  const handleClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false
      return
    }
    onClick?.()
  }

  // Desktop right-click → guess
  const handleContextMenu = (e: React.MouseEvent) => {
    if (!onGuess) return
    e.preventDefault()
    onGuess()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      disabled={disabled}
      className={cn(
        'group relative block text-left transition-transform',
        s.wrap,
        disabled ? 'cursor-default' : 'cursor-pointer active:translate-y-[1px]',
        !disabled && 'hover:-translate-y-[1px]',
      )}
      aria-label={`Personaggio ${character.name}${excluded ? ' (escluso)' : ''}`}
      style={{
        background: colorVar,
        border: `${size === 'lg' ? '4' : '3'}px solid #ffffff`,
        borderRadius: size === 'lg' ? 10 : 8,
        boxShadow: excluded
          ? '0 0 0 4px rgba(0,0,0,0.55) inset, 4px 4px 0 0 rgba(0, 0, 0, 0.55)'
          : wrongGuess
            ? '0 0 0 4px #dc2626 inset, 4px 4px 0 0 rgba(0,0,0,0.45)'
            : winnerReveal
              ? '0 0 0 4px #f59e0b inset, 4px 4px 0 0 rgba(0,0,0,0.45)'
              : selected
                ? '0 0 0 4px #ffffff inset, 0 0 0 7px var(--color-p1) inset, 4px 4px 0 0 rgba(0,0,0,0.35)'
                : '4px 4px 0 0 rgba(0, 0, 0, 0.32)',
        perspective: 1000,
      }}
    >
      <motion.div
        initial={false}
        animate={{ rotateY: showBack ? 180 : flipReveal ? 360 : 0 }}
        transition={{ duration: 0.75, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d', transformOrigin: 'center center' }}
        className="relative w-full h-full flex flex-col overflow-hidden"
      >
        <div className="absolute inset-0 flex flex-col" style={{ backfaceVisibility: 'hidden' }}>
          <div className="relative w-full overflow-hidden bg-white" style={{ height: '78%' }}>
            <img
              src={character.image}
              alt={character.name}
              className={cn('w-full h-full object-cover', excluded && 'opacity-40')}
              draggable={false}
            />
            {excluded && <span className="absolute inset-0 bg-black/55" aria-hidden />}
            {isMySecret && <SecretBadge inkColor={inkVar} />}
            {selected && <SelectedCheck inkColor={inkVar} />}
            {pickHint && !selected && !isMySecret && !disabled && <PickHint />}
            {guessable && !disabled && !excluded && !isMySecret && <GuessableHint />}
          </div>
          <div className="flex-1 flex items-center justify-center px-1" style={{ background: colorVar }}>
            <span className={cn('font-bold text-center leading-tight line-clamp-2', s.name)} style={{ color: inkVar }}>
              {character.name}
            </span>
          </div>
        </div>
        {backImage && (
          <div
            className="absolute inset-0 overflow-hidden rounded-[5px]"
            style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
          >
            <img src={backImage} alt="" className="w-full h-full object-cover" draggable={false} />
          </div>
        )}
      </motion.div>
    </button>
  )
}
