import type { SiteStats } from '@/lib/activity'
import { LiveBadge } from './activity-marquee'

/**
 * Static one-line social proof: live badge + the running totals. No looping
 * motion (only the tiny pulse dot) so it doesn't compete with the marquee or
 * the headline for attention.
 */
export function ActivityStatLine({ stats }: { stats: SiteStats }) {
  const parts: Array<[number, string]> = [
    [stats.places, 'places'],
    [stats.videos, 'videos'],
    [stats.creators, 'creators'],
    [stats.countries, 'countries'],
  ]
  return (
    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
      <LiveBadge />
      {parts.map(([n, label], i) => (
        <span key={label} className="inline-flex items-center gap-1">
          {i > 0 && <span className="opacity-40">·</span>}
          <span className="font-semibold text-[var(--foreground-soft)] tabular-nums">
            {n.toLocaleString()}
          </span>
          {label}
        </span>
      ))}
    </div>
  )
}
