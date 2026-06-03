'use client'

import { useEffect, useRef, useState } from 'react'
import type { SiteStats, ActivityItem } from '@/lib/activity'
import { LiveBadge } from '@/components/activity-marquee'

/** Animated count-up that runs once when scrolled into view. */
function useCountUp(target: number, durationMs = 1100): number {
  const [value, setValue] = useState(0)
  const ref = useRef(0)
  useEffect(() => {
    let raf = 0
    let start: number | null = null
    const from = ref.current
    const step = (t: number) => {
      if (start == null) start = t
      const p = Math.min(1, (t - start) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      const next = Math.round(from + (target - from) * eased)
      setValue(next)
      ref.current = next
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])
  return value
}

function Stat({ value, label }: { value: number; label: string }) {
  const n = useCountUp(value)
  return (
    <div className="flex flex-col">
      <span className="fm-display text-2xl sm:text-3xl font-semibold tabular-nums leading-none">
        {n.toLocaleString()}
      </span>
      <span className="mt-1 text-[11px] uppercase tracking-wider text-[var(--muted)] font-semibold">
        {label}
      </span>
    </div>
  )
}

function relTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function ActivityStats({
  stats,
  latest,
}: {
  stats: SiteStats
  latest?: ActivityItem | null
}) {
  const latestLabel =
    latest?.kind === 'place'
      ? `${latest.name}${latest.city ? `, ${latest.city}` : ''}`
      : latest?.kind === 'video'
        ? `${latest.title ?? 'a video'} · ${latest.placeCount} places`
        : null

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background-elev)] px-5 py-4">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <Stat value={stats.places} label="places" />
        <Stat value={stats.videos} label="videos" />
        <Stat value={stats.creators} label="creators" />
        <Stat value={stats.countries} label="countries" />
      </div>
      {latestLabel && (
        <div className="mt-3.5 flex items-center gap-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
          <LiveBadge />
          <span>
            just added <span className="font-semibold text-[var(--foreground-soft)]">{latestLabel}</span>
            {latest && <span className="text-[var(--muted)]"> · {relTime(latest.at)}</span>}
          </span>
        </div>
      )}
    </div>
  )
}
