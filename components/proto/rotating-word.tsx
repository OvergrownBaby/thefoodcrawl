'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/**
 * Generic vertical word-flipper (same spring as the original RotatingText),
 * but driven by an arbitrary list — real creators, dish+city pairs, etc.
 */
export function RotatingWord({
  words,
  intervalMs = 2400,
  className = 'text-[var(--accent)]',
}: {
  words: string[]
  intervalMs?: number
  className?: string
}) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (words.length <= 1) return
    const id = setInterval(() => setI((x) => (x + 1) % words.length), intervalMs)
    return () => clearInterval(id)
  }, [words.length, intervalMs])

  return (
    <span className="relative inline-flex items-center h-[1.4em] overflow-hidden align-baseline">
      <AnimatePresence mode="wait">
        <motion.span
          key={i}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className={`inline-block whitespace-nowrap font-semibold ${className}`}
        >
          {words[i] ?? ''}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
