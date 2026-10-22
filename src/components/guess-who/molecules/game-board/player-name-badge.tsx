'use client'

interface PlayerNameBadgeProps {
  name: string
}

/** Player name shown ON the top-left CORNER of the board (overlapping the border), tilted oblique, NO badge box. */
export const PlayerNameBadge = ({ name }: PlayerNameBadgeProps) => (
  <span
    className="absolute z-30 guess-name guess-name-lg text-2xl sm:text-3xl leading-none whitespace-nowrap block"
    style={{
      top: '0px',
      left: '-25px',
      transform: 'rotate(-10deg)',
      transformOrigin: 'left top',
    }}
    aria-label={`Giocatore ${name}`}
  >
    {name.toUpperCase()}
  </span>
)
