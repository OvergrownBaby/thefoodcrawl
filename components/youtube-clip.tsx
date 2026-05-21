'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import { formatTimestamp } from '@/lib/utils'

/**
 * Lazy YouTube IFrame embed. Renders a thumbnail + play button until clicked
 * (saves ~500kB of player JS until the user actually wants it), then swaps in
 * the real iframe jumping to `startSec`.
 *
 * youtu.be/{id}?start=N works — autoplay attribute kicks in on user click.
 */
export function YouTubeClip({
  videoId,
  startSec,
  title,
  className,
  active: activeProp,
  onActivate,
}: {
  videoId: string
  startSec?: number
  title?: string
  className?: string
  // Optional controlled state. If omitted, the component manages its own
  // active flag (back-compat with old callers). Pass these from a parent
  // that wants to force the iframe to mount externally (e.g. chapter-rail
  // click on the watch page).
  active?: boolean
  onActivate?: () => void
}) {
  const [internalActive, setInternalActive] = useState(false)
  const active = activeProp ?? internalActive
  const handleActivate = () => {
    if (onActivate) onActivate()
    else setInternalActive(true)
  }
  const thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  const start = startSec != null ? Math.max(0, Math.floor(startSec)) : 0
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?start=${start}&autoplay=1&rel=0&modestbranding=1`

  return (
    <div
      className={
        'relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-[var(--border)] ' +
        (className ?? '')
      }
    >
      {active ? (
        <iframe
          src={src}
          title={title ?? 'YouTube clip'}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={handleActivate}
          className="absolute inset-0 group"
          aria-label={`Play ${title ?? 'video'}${startSec != null ? ` at ${formatTimestamp(startSec)}` : ''}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/95 group-hover:bg-white text-[var(--accent)] shadow-2xl transition group-hover:scale-105">
              <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
            </span>
          </span>
          {startSec != null && (
            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-white text-xs font-mono">
              {formatTimestamp(startSec)}
            </span>
          )}
        </button>
      )}
    </div>
  )
}

