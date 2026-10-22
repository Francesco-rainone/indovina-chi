'use client'

import { motion } from 'framer-motion'

/** Three bouncing dots — used to indicate the opponent is "thinking / choosing". */
export const ThinkingDots = ({ label = 'sta scegliendo' }: { label?: string }) => (
  <div className="flex items-center justify-center gap-1 mt-1.5">
    <span className="text-[10px] text-white/60 mr-1">{label}</span>
    <motion.span
      animate={{ y: [0, -4, 0], opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 0.9, repeat: Infinity, delay: 0 }}
      className="w-1.5 h-1.5 rounded-full bg-white/70"
    />
    <motion.span
      animate={{ y: [0, -4, 0], opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 0.9, repeat: Infinity, delay: 0.15 }}
      className="w-1.5 h-1.5 rounded-full bg-white/70"
    />
    <motion.span
      animate={{ y: [0, -4, 0], opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 0.9, repeat: Infinity, delay: 0.3 }}
      className="w-1.5 h-1.5 rounded-full bg-white/70"
    />
  </div>
)
