'use client'

/** Hover overlay shown on pickable cards: "Scegli". */
export const PickHint = () => (
  <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
    <span className="text-white text-[10px] font-bold uppercase">Scegli</span>
  </span>
)
