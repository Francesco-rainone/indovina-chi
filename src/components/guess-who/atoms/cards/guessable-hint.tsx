'use client'

/** Amber "⊕ Indovina" pill shown on top-right when a card is guessable (my turn, not excluded).
 *  Trigger: right-click (desktop) OR long-press 500ms (mobile). */
export const GuessableHint = () => (
  <span className="absolute top-1 right-1 inline-flex items-center gap-1 rounded-full bg-amber-400 text-black px-1.5 py-0.5 text-[9px] font-bold uppercase shadow">
    ⊕ Indovina
  </span>
)
