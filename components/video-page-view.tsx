'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AtlasMap } from './atlas-map'
import { CreatorAvatar } from './creator-avatar'
import { SourceBadge } from './source-badge'
import { YouTubeClip } from './youtube-clip'
import { photoUrl } from '@/lib/photo'
import { formatTimestamp, cn } from '@/lib/utils'
import type { Restaurant, SourceKind, Platform } from '@/lib/types'
import { ArrowLeft, ExternalLink, Play, MapPin, X } from 'lucide-react'

export type VideoPageVideo = {
  url: string
  sourceKind: SourceKind
  /** YouTube video ID (null for non-YouTube sources) — used by the embedded player. */
  videoId: string | null
  title: string | null
  thumbnailUrl: string | null
  parsedAgo: string
  creator: {
    slug: string
    name: string
    platform: Platform
    avatarUrl: string | null
  } | null
}

export type VideoPageMention = {
  id: string
  dish: string | null
  quote: string
  timestampSec: number | null
  restaurant: {
    id: string
    name: string
    nameLocal: string | null
    city: string
    country: string
    cuisine: string | null
    priceLevel: number | null
    photoName: string | null
    lat: number
    lng: number
  }
  dishes: Array<{
    id: string
    name: string
    quote: string
    timestampSec: number | null
  }>
}

export function VideoPageView({
  video,
  mentions,
}: {
  video: VideoPageVideo
  mentions: VideoPageMention[]
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const listRef = useRef<HTMLOListElement>(null)

  // Embedded player state — lifted out of YouTubeClip so chapter clicks can
  // both jump the time AND force the iframe to mount.
  const [playerActive, setPlayerActive] = useState(false)
  const [playerStartSec, setPlayerStartSec] = useState(0)
  function jumpToChapter(sec: number) {
    setPlayerStartSec(Math.max(0, Math.floor(sec)))
    setPlayerActive(true)
  }

  const restaurants: Restaurant[] = useMemo(
    () =>
      mentions.map((m) => ({
        id: m.restaurant.id,
        name: m.restaurant.name,
        nameLocal: m.restaurant.nameLocal ?? undefined,
        city: m.restaurant.city,
        country: m.restaurant.country,
        lat: m.restaurant.lat,
        lng: m.restaurant.lng,
        cuisine: m.restaurant.cuisine ?? undefined,
        priceLevel: (m.restaurant.priceLevel ?? undefined) as Restaurant['priceLevel'],
        photoName: m.restaurant.photoName ?? undefined,
        mentionCount: 1,
        topCreators: [],
      })),
    [mentions]
  )

  const selectedMention = useMemo(
    () => (selectedId ? mentions.find((m) => m.restaurant.id === selectedId) ?? null : null),
    [selectedId, mentions]
  )
  const selectedIdx = useMemo(
    () => (selectedId ? mentions.findIndex((m) => m.restaurant.id === selectedId) : -1),
    [selectedId, mentions]
  )

  // When the selection changes (from the map), scroll the list to it.
  useEffect(() => {
    if (!selectedId) return
    const el = listRef.current?.querySelector(`[data-mention-for="${selectedId}"]`)
    if (el && 'scrollIntoView' in el) {
      ;(el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedId])

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden">
      {/* Sidebar (list) — desktop left, mobile after the map */}
      <aside
        className={cn(
          'order-2 lg:order-1',
          'lg:w-[420px] xl:w-[460px] lg:flex-shrink-0',
          'lg:border-r lg:border-[var(--border)]',
          'flex flex-col lg:overflow-hidden',
          'bg-white'
        )}
      >
        {/* Desktop-only header: back + player + chapter rail */}
        <header className="hidden lg:block border-b border-[var(--border)]">
          <div className="p-4 pb-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
          </div>
          <div className="px-4">
            {video.videoId ? (
              <YouTubeClip
                videoId={video.videoId}
                startSec={playerStartSec}
                title={video.title ?? undefined}
                active={playerActive}
                onActivate={() => setPlayerActive(true)}
                className="rounded-xl"
              />
            ) : (
              <CompactVideoCard video={video} placeCount={mentions.length} />
            )}
          </div>
          {video.videoId && (
            <div className="px-4 pt-3 pb-1">
              <h1 className="fm-display text-base leading-tight font-semibold line-clamp-2">
                {video.title ?? 'Untitled video'}
              </h1>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-[var(--muted)]">
                {video.creator && (
                  <Link
                    href={`/c/${video.creator.slug}`}
                    className="inline-flex items-center gap-1.5 hover:text-[var(--foreground)] transition"
                  >
                    <CreatorAvatar
                      creator={{
                        slug: video.creator.slug,
                        name: video.creator.name,
                        platform: video.creator.platform,
                        avatarUrl: video.creator.avatarUrl ?? undefined,
                        videoCount: 0,
                        restaurantCount: 0,
                      }}
                      size="sm"
                      link={false}
                    />
                    <span className="font-semibold text-[var(--foreground-soft)]">
                      {video.creator.name}
                    </span>
                  </Link>
                )}
                <span className="opacity-60">·</span>
                <span>parsed {video.parsedAgo}</span>
                <span className="ml-auto inline-flex items-center gap-1 text-[var(--foreground)] font-semibold">
                  <MapPin className="w-3 h-3 text-[var(--accent)]" />
                  {mentions.length}
                </span>
              </div>
            </div>
          )}
          <ChapterRail
            mentions={mentions}
            currentSec={playerActive ? playerStartSec : null}
            onJump={jumpToChapter}
          />
        </header>

        {/* List */}
        <ol
          ref={listRef}
          className="lg:flex-1 lg:overflow-y-auto divide-y divide-[var(--border)]"
        >
          {mentions.map((m, idx) => (
            <MentionRow
              key={m.id}
              mention={m}
              idx={idx}
              selected={selectedId === m.restaurant.id}
              onSelect={() => setSelectedId(m.restaurant.id)}
              videoUrl={video.url}
            />
          ))}
        </ol>
      </aside>

      {/* Main (map) — desktop right, mobile top with hero */}
      <main
        className={cn(
          'order-1 lg:order-2',
          'lg:flex-1 lg:flex lg:flex-col lg:overflow-hidden',
          'bg-white'
        )}
      >
        {/* Mobile-only: back + player + meta + chapter rail */}
        <div className="lg:hidden">
          <div className="px-4 pt-3 pb-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
          </div>
          {video.videoId ? (
            <YouTubeClip
              videoId={video.videoId}
              startSec={playerStartSec}
              title={video.title ?? undefined}
              active={playerActive}
              onActivate={() => setPlayerActive(true)}
              className="!rounded-none"
            />
          ) : (
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className="group relative block aspect-video bg-black overflow-hidden"
            >
              {video.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.thumbnailUrl}
                  alt={video.title ?? ''}
                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/95 text-[var(--accent)] shadow-xl">
                  <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
                </span>
              </div>
            </a>
          )}
          <div className="px-4 pt-3 pb-2">
            <h1 className="fm-display text-lg leading-tight font-semibold">
              {video.title ?? 'Untitled video'}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              {video.creator && (
                <Link
                  href={`/c/${video.creator.slug}`}
                  className="inline-flex items-center gap-1.5 hover:text-[var(--foreground)] transition"
                >
                  <CreatorAvatar
                    creator={{
                      slug: video.creator.slug,
                      name: video.creator.name,
                      platform: video.creator.platform,
                      avatarUrl: video.creator.avatarUrl ?? undefined,
                      videoCount: 0,
                      restaurantCount: 0,
                    }}
                    size="sm"
                    link={false}
                  />
                  <span className="font-semibold text-[var(--foreground-soft)]">
                    {video.creator.name}
                  </span>
                </Link>
              )}
              <span className="opacity-60">·</span>
              <span>parsed {video.parsedAgo}</span>
              <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-[var(--foreground)]">
                <MapPin className="w-4 h-4 text-[var(--accent)]" />
                {mentions.length}
              </span>
            </div>
          </div>
          <ChapterRail
            mentions={mentions}
            currentSec={playerActive ? playerStartSec : null}
            onJump={jumpToChapter}
            className="border-y border-[var(--border)]"
          />
        </div>

        {/* Map */}
        <div className="relative h-[55vh] lg:h-auto lg:flex-1 lg:min-h-0 bg-white">
          <AtlasMap
            restaurants={restaurants}
            selectedId={selectedId}
            onSelect={setSelectedId}
            numbered
            className="absolute inset-0"
          />
          {selectedMention && (
            <PlaceDetailPanel
              mention={selectedMention}
              idx={selectedIdx}
              videoUrl={video.url}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>
      </main>
    </div>
  )
}

function ChapterRail({
  mentions,
  currentSec,
  onJump,
  className,
}: {
  mentions: VideoPageMention[]
  currentSec: number | null
  onJump: (sec: number) => void
  className?: string
}) {
  const chapters = mentions.filter(
    (m): m is VideoPageMention & { timestampSec: number } => m.timestampSec != null
  )
  if (chapters.length === 0) return null

  return (
    <div className={cn('overflow-x-auto fm-no-scrollbar', className)}>
      <div className="flex gap-1.5 px-4 py-2.5">
        {chapters.map((m) => {
          const active = currentSec === m.timestampSec
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onJump(m.timestampSec)}
              className={cn(
                'shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ring-1 ring-inset transition',
                active
                  ? 'bg-[var(--foreground)] text-white ring-[var(--foreground)]'
                  : 'bg-white text-[var(--foreground-soft)] ring-[var(--border)] hover:ring-[var(--foreground)]/40 hover:text-[var(--foreground)]'
              )}
            >
              <span className={cn('font-mono text-[10px]', active ? 'opacity-80' : 'text-[var(--accent)]')}>
                {formatTimestamp(m.timestampSec)}
              </span>
              <span className="max-w-[140px] truncate">{m.restaurant.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PlaceDetailPanel({
  mention: m,
  idx,
  videoUrl,
  onClose,
}: {
  mention: VideoPageMention
  idx: number
  videoUrl: string
  onClose: () => void
}) {
  const r = m.restaurant
  const photo = photoUrl(r.photoName, 400)
  const ts = m.timestampSec
  const tsLink = ts != null ? `${videoUrl}&t=${Math.floor(ts)}s` : videoUrl
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${r.name} ${r.city}`
  )}`

  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 lg:left-auto lg:top-4 lg:right-4 lg:bottom-4 lg:w-[380px]',
        'bg-white rounded-t-2xl lg:rounded-2xl',
        'shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)] border border-[var(--border)]',
        'flex flex-col max-h-[60vh] lg:max-h-[calc(100%-2rem)]'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="relative shrink-0">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt={r.name}
                className="w-14 h-14 rounded-lg object-cover fm-photo"
              />
            ) : (
              <span className="w-14 h-14 rounded-lg bg-[var(--muted-soft)] flex items-center justify-center fm-display text-xl text-[var(--muted)]">
                {idx + 1}
              </span>
            )}
            <span className="absolute -top-1.5 -left-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold ring-2 ring-white fm-num">
              {idx + 1}
            </span>
          </span>
          <div className="min-w-0">
            <h2 className="fm-display text-lg leading-tight font-semibold truncate">{r.name}</h2>
            {r.nameLocal && (
              <div className="text-xs text-[var(--muted)] truncate">{r.nameLocal}</div>
            )}
            <div className="text-[11px] text-[var(--muted)] mt-0.5 truncate">
              {r.cuisine ? `${r.cuisine} · ` : ''}
              {r.city}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[var(--muted)] hover:text-[var(--foreground)] p-1 -m-1 shrink-0"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <blockquote className="relative text-sm text-[var(--foreground-soft)] pl-4 italic leading-relaxed">
          <span
            aria-hidden
            className="absolute -left-0.5 top-0 fm-display text-2xl leading-none text-[var(--accent)]/40"
          >
            &ldquo;
          </span>
          {m.quote}
        </blockquote>

        {ts != null && (
          <a
            href={tsLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
          >
            <span className="font-mono">{formatTimestamp(ts)}</span>
            <ExternalLink className="w-3 h-3" />
            Watch this moment
          </a>
        )}

        {m.dishes.length > 0 ? (
          <div>
            <div className="fm-label mb-1.5">Dishes</div>
            <ul className="space-y-1.5">
              {m.dishes.map((d) => (
                <li key={d.id} className="flex items-start gap-2 text-xs">
                  <a
                    href={d.timestampSec != null ? `${videoUrl}&t=${Math.floor(d.timestampSec)}s` : videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[10px] text-[var(--accent)] hover:underline shrink-0 mt-px"
                  >
                    {d.timestampSec != null ? formatTimestamp(d.timestampSec) : '·'}
                  </a>
                  <span className="font-medium text-[var(--foreground)]">{d.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : m.dish ? (
          <div className="text-xs">
            <span className="font-semibold">Dish:</span>{' '}
            <span className="text-[var(--foreground-soft)]">{m.dish}</span>
          </div>
        ) : null}
      </div>

      {/* Footer CTAs */}
      <div className="p-3 border-t border-[var(--border)] flex gap-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[var(--foreground)] text-white text-xs font-medium py-2 rounded-xl hover:opacity-90"
        >
          <MapPin className="w-3.5 h-3.5" />
          Open in Maps
        </a>
        <Link
          href={`/p/${r.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white text-[var(--foreground)] border border-[var(--border)] text-xs font-medium py-2 rounded-xl hover:border-[var(--accent)]"
        >
          Details →
        </Link>
      </div>
    </div>
  )
}

function CompactVideoCard({
  video,
  placeCount,
}: {
  video: VideoPageVideo
  placeCount: number
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <a
        href={video.url}
        target="_blank"
        rel="noreferrer"
        className="group flex gap-3 items-start"
      >
        <span className="relative aspect-video w-28 shrink-0 rounded-lg overflow-hidden bg-black ring-1 ring-[var(--border)]">
          {video.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnailUrl}
              alt={video.title ?? ''}
              className="absolute inset-0 w-full h-full object-cover opacity-95 group-hover:opacity-100 transition"
            />
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/95 text-[var(--accent)] shadow-md group-hover:scale-105 transition">
              <Play className="w-3.5 h-3.5 ml-0.5" fill="currentColor" />
            </span>
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <SourceBadge kind={video.sourceKind} />
          </div>
          <h1 className="fm-display text-base leading-tight font-semibold line-clamp-2 group-hover:text-[var(--accent)] transition">
            {video.title ?? 'Untitled video'}
          </h1>
        </div>
      </a>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {video.creator && (
          <Link
            href={`/c/${video.creator.slug}`}
            className="inline-flex items-center gap-1.5 group"
          >
            <CreatorAvatar
              creator={{
                slug: video.creator.slug,
                name: video.creator.name,
                platform: video.creator.platform,
                avatarUrl: video.creator.avatarUrl ?? undefined,
                videoCount: 0,
                restaurantCount: 0,
              }}
              size="sm"
              link={false}
            />
            <span className="text-xs font-semibold group-hover:text-[var(--accent)] transition truncate max-w-[140px]">
              {video.creator.name}
            </span>
          </Link>
        )}
        <span className="text-[11px] text-[var(--muted)]">parsed {video.parsedAgo}</span>
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold">
          <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
          {placeCount} {placeCount === 1 ? 'place' : 'places'}
        </span>
      </div>
    </div>
  )
}

function MentionRow({
  mention: m,
  idx,
  selected,
  onSelect,
  videoUrl,
}: {
  mention: VideoPageMention
  idx: number
  selected: boolean
  onSelect: () => void
  videoUrl: string
}) {
  const r = m.restaurant
  const photo = photoUrl(r.photoName, 200)
  const ts = m.timestampSec
  const tsLink = ts != null ? `${videoUrl}&t=${Math.floor(ts)}s` : videoUrl

  return (
    <li data-mention-for={r.id}>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'w-full text-left px-4 py-3 flex gap-3 transition',
          selected
            ? 'bg-[var(--accent-soft)]'
            : 'hover:bg-[var(--muted-soft)]/60'
        )}
      >
        <span className="relative shrink-0">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={r.name}
              className="w-16 h-16 rounded-lg object-cover fm-photo"
            />
          ) : (
            <span className="w-16 h-16 rounded-lg bg-[var(--muted-soft)] flex items-center justify-center fm-display text-xl text-[var(--muted)]">
              {idx + 1}
            </span>
          )}
          <span
            className={cn(
              'absolute -top-1.5 -left-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ring-2 ring-white fm-num',
              selected
                ? 'bg-[var(--foreground)] text-white'
                : 'bg-[var(--accent)] text-white'
            )}
          >
            {idx + 1}
          </span>
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-sm leading-tight truncate">
              {r.name}
            </span>
            {ts != null && (
              <a
                href={tsLink}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] font-mono text-[var(--accent)] hover:underline inline-flex items-center gap-0.5 shrink-0"
              >
                {formatTimestamp(ts)}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
          {r.nameLocal && (
            <div className="text-[11px] text-[var(--muted)] truncate">
              {r.nameLocal}
            </div>
          )}
          <div className="text-[11px] text-[var(--muted)] truncate">
            {r.cuisine ? `${r.cuisine} · ` : ''}
            {r.city}
          </div>
          {m.dishes.length > 0 ? (
            <div className="mt-1 text-[11px] text-[var(--foreground-soft)] line-clamp-1">
              <span className="font-semibold">Dishes:</span>{' '}
              {m.dishes.map((d) => d.name).join(', ')}
            </div>
          ) : m.dish ? (
            <div className="mt-1 text-[11px] text-[var(--foreground-soft)] line-clamp-1">
              <span className="font-semibold">Dish:</span> {m.dish}
            </div>
          ) : null}
          <blockquote
            className={cn(
              'mt-1.5 text-xs italic text-[var(--foreground-soft)] leading-snug',
              selected ? '' : 'line-clamp-2'
            )}
          >
            &ldquo;{m.quote}&rdquo;
          </blockquote>
        </div>
      </button>
    </li>
  )
}
