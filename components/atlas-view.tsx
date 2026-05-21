'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Restaurant, RestaurantVideo, Mention, Creator } from '@/lib/types'
import { AtlasMap } from './atlas-map'
import { CreatorAvatar } from './creator-avatar'
import { SourceBadge } from './source-badge'
import { formatTimestamp, priceDots, cn } from '@/lib/utils'
import { X, MapPin, ExternalLink, Loader2 } from 'lucide-react'

type Props = {
  restaurants: Restaurant[]
  creators: Creator[]
}

export function AtlasView({ restaurants, creators }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeCreator, setActiveCreator] = useState<string | null>(null)
  const [selectedMentions, setSelectedMentions] = useState<Mention[]>([])
  const [loadingMentions, setLoadingMentions] = useState(false)
  // Hover preview lives in a portal-style fixed position so it escapes the
  // sidebar's overflow-y-auto clip box. Position is computed from the LI's
  // bounding rect on mouseenter.
  const [hover, setHover] = useState<{ video: RestaurantVideo; top: number; left: number } | null>(
    null
  )

  // Source filter — we don't have mentions on the client until pin click,
  // so source filtering happens on a separate fetch path. For now: only
  // creator filtering is reactive; source filter is hidden until v2.
  const filtered = useMemo(() => {
    return restaurants.filter((r) => {
      if (activeCreator && !r.topCreators.some((c) => c.slug === activeCreator)) {
        return false
      }
      return true
    })
  }, [restaurants, activeCreator])

  const effectiveSelectedId =
    selectedId && filtered.some((r) => r.id === selectedId) ? selectedId : null
  const selected = effectiveSelectedId
    ? filtered.find((r) => r.id === effectiveSelectedId) ?? null
    : null

  // Lazy-fetch mentions when a pin is selected
  useEffect(() => {
    if (!effectiveSelectedId) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingMentions(true)
    fetch(`/api/place/${effectiveSelectedId}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { mentions?: Mention[] } | null) => {
        if (cancelled) return
        setSelectedMentions(data?.mentions ?? [])
        setLoadingMentions(false)
      })
      .catch(() => {
        if (cancelled) return
        setSelectedMentions([])
        setLoadingMentions(false)
      })
    return () => {
      cancelled = true
    }
  }, [effectiveSelectedId])

  // Reset mentions when selection clears (derive-not-effect would mix state and async fetch awkwardly).
  const visibleMentions = effectiveSelectedId ? selectedMentions : []

  // Mobile vs desktop layout. Computed once on mount + on resize so the
  // map's pan-offset (which pushes the focal pin above the bottom sheet)
  // updates if the user rotates the device or resizes the window.
  const [isMobile, setIsMobile] = useState(false)
  const [viewportH, setViewportH] = useState(800)
  useEffect(() => {
    function update() {
      setIsMobile(window.innerWidth < 1024)
      setViewportH(window.innerHeight)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Mobile bottom-sheet state — qilingo-style two-snap (half/full) drag.
  const [sheetMode, setSheetMode] = useState<'half' | 'full'>('half')
  const [sheetDragY, setSheetDragY] = useState(0)
  const [sheetDragging, setSheetDragging] = useState(false)
  const sheetStartYRef = useRef(0)

  // Scroll-driven map focus: as the list scrolls, the topmost-visible
  // restaurant's id is set as focusedId and the map gently pans to its pin.
  // Uses the scroll event's target as the container reference so the same
  // handler works on both the desktop aside list and the mobile sheet list
  // (only one is visible at a time — the other has display:none).
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const scrollRafRef = useRef<number | null>(null)
  function handleListScroll(e: React.UIEvent<HTMLDivElement>) {
    const container = e.currentTarget
    if (scrollRafRef.current != null) return
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null
      const containerTop = container.getBoundingClientRect().top
      const items = container.querySelectorAll<HTMLElement>('[data-restaurant-id]')
      for (const item of items) {
        const rect = item.getBoundingClientRect()
        if (rect.bottom > containerTop + 8) {
          const id = item.dataset.restaurantId
          if (id && id !== focusedId) setFocusedId(id)
          return
        }
      }
    })
  }

  function handleSheetTouchStart(e: React.TouchEvent) {
    setSheetDragging(true)
    sheetStartYRef.current = e.touches[0].clientY
    setSheetDragY(0)
  }
  function handleSheetTouchMove(e: React.TouchEvent) {
    if (!sheetDragging) return
    const dy = e.touches[0].clientY - sheetStartYRef.current
    setSheetDragY(dy)
  }
  function handleSheetTouchEnd() {
    if (!sheetDragging) return
    const threshold = 60
    if (sheetMode === 'half' && sheetDragY < -threshold) setSheetMode('full')
    else if (sheetMode === 'full' && sheetDragY > threshold) setSheetMode('half')
    setSheetDragY(0)
    setSheetDragging(false)
  }

  const sidebarHeader = (
    <div className="p-5 border-b border-[var(--border)]">
      <div className="fm-label">Browse</div>
      <h1 className="fm-display text-2xl mt-1">Atlas</h1>
      <p className="text-sm text-[var(--muted)] mt-1">
        <span className="font-semibold text-[var(--foreground)]">{filtered.length}</span>{' '}
        {filtered.length === 1 ? 'restaurant' : 'restaurants'}
        {activeCreator
          ? ` from ${creators.find((c) => c.slug === activeCreator)?.name}`
          : ' from everyone'}
      </p>
    </div>
  )

  // Compact mobile-only chrome: a single thin row with count + horizontally
  // scrollable creator chips. ~70px total vs ~200px for the desktop pair,
  // leaving room in the half-sheet for actual restaurants.
  const mobileChrome = (
    <div className="px-4 pt-1 pb-2 border-b border-[var(--border)]">
      <div className="flex items-center justify-between text-[11px] mb-1.5">
        <span className="text-[var(--muted)]">
          <span className="font-semibold text-[var(--foreground)]">{filtered.length}</span>{' '}
          {filtered.length === 1 ? 'place' : 'places'}
          {activeCreator && (
            <>
              {' · '}
              <span className="font-semibold text-[var(--foreground)]">
                {creators.find((c) => c.slug === activeCreator)?.name}
              </span>
            </>
          )}
        </span>
        {activeCreator && (
          <button
            onClick={() => setActiveCreator(null)}
            className="text-[11px] text-[var(--accent)] font-medium"
          >
            Clear
          </button>
        )}
      </div>
      <div className="-mx-4 px-4 flex gap-1.5 overflow-x-auto pb-0.5 fm-no-scrollbar">
        <button
          onClick={() => setActiveCreator(null)}
          className={cn(
            'shrink-0 px-3 py-1 rounded-full text-xs font-medium ring-1 ring-inset transition',
            !activeCreator
              ? 'bg-[var(--foreground)] text-white ring-[var(--foreground)]'
              : 'bg-white text-[var(--foreground)] ring-[var(--border)]'
          )}
        >
          Everyone
        </button>
        {creators
          .filter((c) => c.restaurantCount > 0)
          .map((c) => (
            <button
              key={c.slug}
              onClick={() => setActiveCreator(c.slug)}
              className={cn(
                'shrink-0 inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-xs font-medium ring-1 ring-inset transition',
                activeCreator === c.slug
                  ? 'bg-[var(--foreground)] text-white ring-[var(--foreground)]'
                  : 'bg-white text-[var(--foreground)] ring-[var(--border)]'
              )}
            >
              <CreatorAvatar creator={c} size="sm" link={false} />
              {c.name}
            </button>
          ))}
      </div>
    </div>
  )

  const filterRail = (
    <div className="p-5 space-y-3 border-b border-[var(--border)]">
      <div className="flex items-center justify-between">
        <span className="fm-label">Creator</span>
        {activeCreator && (
          <button
            onClick={() => setActiveCreator(null)}
            className="text-[11px] text-[var(--accent)] hover:underline font-medium"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCreator(null)}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium ring-1 ring-inset transition',
            !activeCreator
              ? 'bg-[var(--foreground)] text-white ring-[var(--foreground)]'
              : 'bg-white text-[var(--foreground)] ring-[var(--border)] hover:ring-[var(--foreground)]/30'
          )}
        >
          Everyone
        </button>
        {creators
          .filter((c) => c.restaurantCount > 0)
          .map((c) => (
            <button
              key={c.slug}
              onClick={() => setActiveCreator(c.slug)}
              className={cn(
                'inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-xs font-medium ring-1 ring-inset transition',
                activeCreator === c.slug
                  ? 'bg-[var(--foreground)] text-white ring-[var(--foreground)]'
                  : 'bg-white text-[var(--foreground)] ring-[var(--border)] hover:ring-[var(--foreground)]/30'
              )}
            >
              <CreatorAvatar creator={c} size="sm" link={false} />
              {c.name}
            </button>
          ))}
      </div>
    </div>
  )

  const restaurantList = (
    <ul className="space-y-1 p-2">
      {filtered.map((r) => (
        <li
          key={r.id}
          data-restaurant-id={r.id}
          className="relative"
          onMouseEnter={(e) => {
            if (!r.primaryVideo?.thumbnailUrl) return
            const rect = e.currentTarget.getBoundingClientRect()
            setHover({
              video: r.primaryVideo,
              top: rect.top + rect.height / 2,
              left: rect.right + 12,
            })
          }}
          onMouseLeave={() => setHover(null)}
        >
          <button
            onClick={() => setSelectedId(r.id)}
            className={cn(
              'w-full text-left px-3 py-2.5 rounded-xl transition',
              effectiveSelectedId === r.id
                ? 'bg-[var(--accent-soft)] ring-1 ring-inset ring-[var(--accent)]/30'
                : 'hover:bg-[var(--muted-soft)]'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{r.name}</div>
                {r.nameLocal && (
                  <div className="text-xs text-[var(--muted)] truncate">{r.nameLocal}</div>
                )}
                <div className="mt-0.5 text-[11px] text-[var(--muted)] truncate">
                  {r.cuisine}
                </div>
                {r.primaryVideo && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-[var(--muted)] min-w-0">
                    <SourceBadge kind={r.primaryVideo.sourceKind} size="sm" />
                    <span className="truncate">
                      {r.primaryVideo.title ?? r.primaryVideo.channelName ?? 'Source video'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {r.priceLevel && (
                  <span className="text-[10px] text-[var(--muted)] font-medium">
                    {priceDots(r.priceLevel)}
                  </span>
                )}
                <div className="flex -space-x-1.5">
                  {r.topCreators.slice(0, 3).map((c) => (
                    <CreatorAvatar key={c.slug} creator={c} size="sm" link={false} />
                  ))}
                </div>
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="flex-1 flex flex-row min-h-0 relative">
      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex lg:w-80 xl:w-96 border-r border-[var(--border)] bg-[var(--background)] flex-col">
        {sidebarHeader}
        {filterRail}
        <div onScroll={handleListScroll} className="flex-1 overflow-y-auto">
          {restaurantList}
        </div>
      </aside>

      {/* Hover preview — fixed-position so it escapes the list's overflow clip */}
      {hover && <VideoHoverPreview video={hover.video} top={hover.top} left={hover.left} />}

      {/* Map */}
      <div className="flex-1 relative">
        <AtlasMap
          restaurants={filtered}
          selectedId={effectiveSelectedId}
          onSelect={setSelectedId}
          focusedId={focusedId}
          globe
          // Mobile: declare the sheet's height as bottom padding so MapLibre
          // re-centers the globe + every pan into the visible top half.
          bottomInset={isMobile ? Math.round(viewportH * (sheetMode === 'full' ? 0.9 : 0.5)) : 0}
          // Scroll-focus zooms in to neighborhood level so the user sees the
          // pin in context, not lost on a global view.
          focusZoom={13}
          className="absolute inset-0"
        />

        {/* Detail panel — floats over map. AnimatePresence drives both the
            mount (slide-in) and unmount (slide-out) so closing isn't a flash. */}
        <AnimatePresence>
          {selected && (
            <DetailPanel
              key={selected.id}
              restaurant={selected}
              mentions={visibleMentions}
              loading={loadingMentions}
              onClose={() => setSelectedId(null)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Mobile bottom sheet — qilingo-style drag between half (50dvh) and full (90dvh). */}
      <div
        className={cn(
          'lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-2xl shadow-[0_-8px_28px_-8px_rgba(0,0,0,0.18)] flex flex-col touch-none',
          sheetMode === 'half' ? 'h-[50dvh]' : 'h-[90dvh]'
        )}
        style={{
          transform: sheetDragging
            ? `translateY(${
                sheetMode === 'half'
                  ? Math.max(sheetDragY, -200)
                  : Math.max(sheetDragY, 0)
              }px)`
            : undefined,
          transition: sheetDragging
            ? 'none'
            : 'height 240ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {/* Drag handle — touch events live here. */}
        <div
          className="shrink-0 pt-2.5 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
          onClick={() => setSheetMode((m) => (m === 'half' ? 'full' : 'half'))}
        >
          <div className="w-9 h-[5px] rounded-full bg-[var(--border-strong)] mx-auto" />
        </div>

        {mobileChrome}
        <div
          onScroll={handleListScroll}
          className="flex-1 overflow-y-auto overscroll-contain touch-pan-y"
        >
          {restaurantList}
        </div>
      </div>
    </div>
  )
}

function VideoHoverPreview({
  video,
  top,
  left,
}: {
  video: RestaurantVideo
  top: number
  left: number
}) {
  return (
    <div
      className="pointer-events-none fixed z-50 w-64 hidden lg:block"
      style={{ top, left, transform: 'translateY(-50%)' }}
      aria-hidden
    >
      <div className="bg-white rounded-xl shadow-[var(--shadow-pop)] border border-[var(--border)] overflow-hidden animate-in fade-in slide-in-from-left-1 duration-150">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.thumbnailUrl}
          alt=""
          className="w-full aspect-video object-cover bg-black"
        />
        <div className="px-3 py-2">
          <div className="text-xs font-semibold line-clamp-2 leading-snug">
            {video.title ?? 'Source video'}
          </div>
          {video.channelName && (
            <div className="mt-1 text-[10px] text-[var(--muted)] truncate">
              {video.channelName}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailPanel({
  restaurant,
  mentions,
  loading,
  onClose,
}: {
  restaurant: Restaurant
  mentions: Mention[]
  loading: boolean
  onClose: () => void
}) {
  const ytMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${restaurant.name} ${restaurant.city}`
  )}`

  // Animation direction: slide up from the bottom on mobile (matches the
  // bottom-sheet idiom), slide in from the right on desktop. Detect once
  // per mount so we don't fight resize during the animation.
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024
  const initial = isMobile ? { y: '100%', opacity: 0 } : { x: 24, opacity: 0 }
  const animate = isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }
  const exit = isMobile ? { y: '100%', opacity: 0 } : { x: 24, opacity: 0 }

  return (
    <motion.div
      initial={initial}
      animate={animate}
      exit={exit}
      transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.8 }}
      className="fixed lg:absolute z-50 inset-x-0 bottom-0 lg:left-auto lg:top-4 lg:right-4 lg:bottom-4 lg:inset-x-auto lg:w-[420px] bg-[var(--card)] rounded-t-2xl lg:rounded-3xl shadow-[var(--shadow-pop)] border border-[var(--border-strong)] flex flex-col max-h-[70dvh] lg:max-h-[calc(100vh-7rem)]"
    >
      <div className="p-5 border-b border-[var(--border)] flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="fm-display text-xl leading-tight">{restaurant.name}</h2>
          {restaurant.nameLocal && (
            <p className="text-sm text-[var(--muted)] font-medium">{restaurant.nameLocal}</p>
          )}
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            {restaurant.cuisine}
            {restaurant.priceLevel && (
              <>
                <span className="mx-1.5 opacity-40">/</span>
                <span className="font-mono">{priceDots(restaurant.priceLevel)}</span>
              </>
            )}
            <span className="mx-1.5 opacity-40">/</span>
            <span className="fm-label !text-[var(--muted)] !text-[10px]">{restaurant.city}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-[var(--muted)] hover:text-[var(--foreground)] p-1 -m-1"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && mentions.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-[var(--muted)]">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm">Loading mentions…</span>
          </div>
        ) : !loading && mentions.length === 0 ? (
          <div className="p-6 text-sm text-[var(--muted)] italic">
            No mentions found for this place.
          </div>
        ) : null}
        <ul className="divide-y divide-[var(--border)]">
          {mentions.map((m) => (
            <li key={m.id} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <SourceBadge kind={m.source.kind} />
                {m.source.creator && (
                  <CreatorAvatar creator={m.source.creator} size="sm" />
                )}
                <a
                  href={
                    m.timestampSec != null
                      ? `${m.source.url}&t=${Math.floor(m.timestampSec)}s`
                      : m.source.url
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-xs text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                >
                  {m.timestampSec != null && (
                    <span className="font-mono">{formatTimestamp(m.timestampSec)}</span>
                  )}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <blockquote className="relative text-sm text-[var(--foreground-soft)] pl-4 leading-relaxed">
                <span
                  aria-hidden
                  className="absolute -left-0.5 top-0 fm-display text-[28px] leading-none text-[var(--accent)]/40"
                >
                  &ldquo;
                </span>
                <span className="italic">{m.quote}</span>
              </blockquote>
              {m.dishes.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {m.dishes.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-start gap-2 text-xs"
                    >
                      <a
                        href={
                          d.timestampSec != null
                            ? `${m.source.url}&t=${Math.floor(d.timestampSec)}s`
                            : m.source.url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[10px] text-[var(--accent)] hover:underline shrink-0 mt-px"
                      >
                        {d.timestampSec != null ? formatTimestamp(d.timestampSec) : '·'}
                      </a>
                      <span className="font-medium text-[var(--foreground)]">
                        {d.name}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : m.dish ? (
                // Legacy fallback for mentions ingested before dish_mentions migration.
                <div className="mt-2 text-xs text-[var(--muted)]">
                  <span className="font-semibold text-[var(--foreground)]">Dishes:</span>{' '}
                  {m.dish}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-3 border-t border-[var(--border)] flex gap-2">
        <a
          href={ytMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[var(--foreground)] text-white text-sm font-medium py-2 rounded-xl hover:opacity-90"
        >
          <MapPin className="w-4 h-4" />
          Open in Maps
        </a>
        <a
          href={`/p/${restaurant.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white text-[var(--foreground)] border border-[var(--border)] text-sm font-medium py-2 rounded-xl hover:border-[var(--accent)]"
        >
          Details →
        </a>
      </div>
    </motion.div>
  )
}
