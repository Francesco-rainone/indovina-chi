'use client'

import { Check } from 'lucide-react'

interface SelectedCheckProps {
  inkColor: string
}

/** White round check shown on top-right when a card is selected (picking phase). */
export const SelectedCheck = ({ inkColor }: SelectedCheckProps) => (
  <span className="absolute top-1 right-1 inline-flex items-center justify-center rounded-full bg-white p-0.5 shadow">
    <Check className="w-3 h-3" style={{ color: inkColor }} />
  </span>
)
