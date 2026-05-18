'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const WORDS = ['youtubers', 'influencers', 'friends', 'locals', 'critics', 'strangers']

/**
 * Same setup as /qilin landing page:
 *   - fixed-height inline-flex container with overflow:hidden
 *   - h-[1.4em] gives room for descenders + breathing space
 *   - pixel-based y: 30 → 0 → -30 with default mass spring
 *
 * Avoid percentage-y or extra mass tuning — those make it choppy.
 */
export function RotatingText() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % WORDS.length), 2500)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="relative inline-flex items-center h-[1.4em] overflow-hidden align-baseline">
      <AnimatePresence mode="wait">
        <motion.span
          key={i}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className="inline-block text-[var(--accent)]"
        >
          {WORDS[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
