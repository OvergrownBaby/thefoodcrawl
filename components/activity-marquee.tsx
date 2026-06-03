'use client'

import Link from 'next/link'
import { MapPin, Clapperboard } from 'lucide-react'
import { photoUrl } from '@/lib/photo'
import type { ActivityItem } from '@/lib/activity'

/**
 * Infinite horizontal ticker of recent activity. The track is rendered twice
 * back-to-back and translated -50%, so the loop is seamless. Pauses on hover.
 */
export function ActivityMarquee({
  items,
  durationSec = 44,
  showLiveLabel = true,
}: {
  items: ActivityItem[]
  durationSec?: number
  showLiveLabel?: boolean
}) {
  if (items.length === 0) return null
  const loop = [...items, ...items]

  return (
    <div className="relative overflow-hidden border-y border-[var(--border)] bg-[var(--background-elev)] py-2.5">
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[var(--background-elev)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[var(--background-elev)] to-transparent" />

      {showLiveLabel && (
        <div className="pointer-events-none absolute left-3 top-1/2 z-20 -translate-y-1/2">
          <LiveBadge />
        </div>
      )}

      <div
        className="fm-marquee-track gap-2.5"
        style={{ ['--fm-marquee-dur' as string]: `${durationSec}s`, paddingLeft: showLiveLabel ? 76 : 0 }}
      >
        {loop.map((it, idx) => (
          <ActivityChip key={`${it.kind}-${it.id}-${idx}`} item={it} />
        ))}
      </div>
    </div>
  )
}

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-soft)] ring-1 ring-inset ring-[var(--border)]">
      <span className="relative flex h-1.5 w-1.5">
        <span className="fm-pulse absolute inline-flex h-full w-full rounded-full bg-[var(--accent)]" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
      </span>
      live
    </span>
  )
}

function ActivityChip({ item }: { item: ActivityItem }) {
  if (item.kind === 'place') {
    const photo = photoUrl(item.photoName, 200)
    const where = [item.city, item.country].filter(Boolean)[0]
    return (
      <Link
        href={`/p/${item.id}`}
        className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-white py-1 pl-1 pr-3 shadow-sm transition hover:border-[var(--accent)]/50"
      >
        <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-[var(--muted-soft)] text-[var(--accent)]">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <MapPin className="h-3 w-3" />
          )}
        </span>
        <span className="text-xs font-semibold leading-none">{item.name}</span>
        {where && <span className="text-[11px] text-[var(--muted)] leading-none">· {where}</span>}
      </Link>
    )
  }
  return (
    <Link
      href={`/v/${item.pathSlug}`}
      className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-white py-1 pl-2.5 pr-3 shadow-sm transition hover:border-[var(--accent)]/50"
    >
      <Clapperboard className="h-3.5 w-3.5 text-[var(--muted)]" />
      <span className="max-w-[200px] truncate text-xs font-semibold leading-none">
        {item.title ?? 'Untitled'}
      </span>
      <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-[var(--accent)]">
        {item.placeCount} {item.placeCount === 1 ? 'place' : 'places'}
      </span>
    </Link>
  )
}
