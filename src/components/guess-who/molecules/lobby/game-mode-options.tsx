'use client'

import { Label } from '@/components/guess-who/atoms/forms/label'
import { Switch } from '@/components/guess-who/atoms/forms/switch'

interface GameModeOptionsProps {
  useLives: boolean
  roundMode: boolean
  onUseLivesChange: (v: boolean) => void
  onRoundModeChange: (v: boolean) => void
}

/** Two switches (Gioca con le vite / Modalità round 3 round) — visible ONLY when creating a room. */
export const GameModeOptions = ({
  useLives,
  roundMode,
  onUseLivesChange,
  onRoundModeChange,
}: GameModeOptionsProps) => (
  <div className="rounded-lg border bg-muted/30 p-3 space-y-3 mt-4">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Opzioni partita</p>
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1">
        <Label htmlFor="opt-lives" className="text-sm font-medium cursor-pointer">Gioca con le vite</Label>
        <p className="text-[11px] text-muted-foreground">3 tentativi di indovinare; chi li esaurisce perde.</p>
      </div>
      <Switch id="opt-lives" checked={useLives} onCheckedChange={onUseLivesChange} />
    </div>
    <div className="h-px bg-border" />
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1">
        <Label htmlFor="opt-round" className="text-sm font-medium cursor-pointer">Modalità round (3 round)</Label>
        <p className="text-[11px] text-muted-foreground">Vince chi prende 2 round su 3.</p>
      </div>
      <Switch id="opt-round" checked={roundMode} onCheckedChange={onRoundModeChange} />
    </div>
  </div>
)
