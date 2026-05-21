'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import type { StreamState, RestaurantArrival } from '@/lib/use-stream-extract'
import { AtlasMap } from './atlas-map'
import { SourceBadge } from './source-badge'
import { photoUrl } from '@/lib/photo'
import { formatTimestamp, cn } from '@/lib/utils'
import type { Restaurant, SourceKind } from '@/lib/types'
import { Loader2, X, ArrowRight, ExternalLink, MapPin, Key, AlertTriangle } from 'lucide-react'

export function LiveExtractionView({
  state,
  onReset,
  onForceRefresh,
  onOpenKeyModal,
  hasUserKey,
}: {
  state: StreamState
  onReset: () => void
  onForceRefresh: () => void
  onOpenKeyModal?: () => void
  hasUserKey?: boolean
}) {
  const elapsed = useElapsed(state.startedAt, state.finishedAt)
  const geocoded = state.restaurants.filter((r) => r.lat != null && r.lng != null)

  // Live numbering: every visible row gets the position it'll have on the map
  // once geocoded. Skipped rows show an X instead of a number, so list pin #N
  // always matches map pin #N regardless of skip order.
  const numberByClientId = useMemo(() => {
    const m = new Map<string, number>()
    let n = 0
    for (const r of state.restaurants) {
      if (r.skipped) continue
      m.set(r.clientId, ++n)
    }
    return m
  }, [state.restaurants])

  const mapRestaurants: Restaurant[] = useMemo(
    () =>
      geocoded.map((r) => ({
        id: r.id!,
        name: r.name,
        nameLocal: r.nameLocal,
        city: r.city,
        country: r.country,
        lat: r.lat!,
        lng: r.lng!,
        cuisine: r.cuisine,
        priceLevel: r.priceLevel,
        photoName: r.photoName,
        mentionCount: 1,
        topCreators: [],
      })),
    [geocoded]
  )

  const phaseLabel = phaseLabelFor(state)

  return (
    <div className="mt-6 bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[var(--border)] bg-[var(--background)]">
        <div className="flex items-center gap-2 text-sm">
          {state.status !== 'complete' && state.status !== 'failed' && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
          )}
          <span className="font-semibold">{phaseLabel}</span>
          <span className="font-mono text-xs text-[var(--muted)]">{elapsed}</span>
        </div>
        <button
          onClick={onReset}
          className="text-[var(--muted)] hover:text-[var(--foreground)] -m-1 p-1"
          aria-label="Cancel and start over"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Video thumbnail w/ scan-line (visible during watching phase, optional during others) */}
      {state.video?.thumbnailUrl && (
        <ScannedThumbnail
          src={state.video.thumbnailUrl}
          title={state.video.title}
          channel={state.video.channelName}
          sourceKind={state.video.sourceKind as SourceKind}
          isWatching={state.status === 'watching'}
        />
      )}

      {/* Message during watching */}
      {state.status === 'watching' && state.message && (
        <p className="px-5 py-3 text-xs text-[var(--muted)] border-b border-[var(--border)] bg-[var(--muted-soft)]/40">
          {state.message}
        </p>
      )}

      {/* Restaurants column + map — 50/50 on lg+ */}
      {state.restaurants.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-0">
          <ol className="divide-y divide-[var(--border)] lg:max-h-[640px] lg:overflow-y-auto">
            <AnimatePresence initial={false}>
              {state.restaurants.map((r) => (
                <motion.li
                  key={r.clientId}
                  layout
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                  className={cn('p-4', r.skipped && 'opacity-50')}
                >
                  <ArrivalCard
                    arrival={r}
                    number={numberByClientId.get(r.clientId)}
                    videoUrl={state.video?.url ?? ''}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>

          <div className="lg:border-l border-t lg:border-t-0 border-[var(--border)] bg-[var(--muted-soft)]/40 h-[360px] lg:h-[640px] lg:self-start relative">
            {mapRestaurants.length > 0 ? (
              <AtlasMap
                restaurants={mapRestaurants}
                numbered
                className="absolute inset-0"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--muted)] italic">
                Pins land here as places are geocoded
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state during watching with no restaurants yet */}
      {state.status === 'watching' && state.restaurants.length === 0 && (
        <div className="px-5 py-6 text-center text-sm text-[var(--muted)]">
          <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2 text-[var(--accent)]" />
          Waiting on Gemini. No restaurants yet.
        </div>
      )}

      {/* Failed state */}
      {state.status === 'failed' && (
        <ErrorPanel
          error={state.error}
          hasUserKey={hasUserKey}
          onOpenKeyModal={onOpenKeyModal}
          onRetry={onForceRefresh}
          onReset={onReset}
        />
      )}

      {/* Complete CTA */}
      {state.status === 'complete' && state.result && (
        <div className="p-5 border-t border-[var(--border)] space-y-3">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/atlas"
              className="fm-btn flex-1 inline-flex items-center justify-center gap-1.5 bg-[var(--foreground)] text-[var(--background)] font-semibold py-3 rounded-xl hover:bg-[var(--accent)]"
            >
              View on atlas
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={onReset}
              className="fm-btn px-5 py-3 rounded-xl border border-[var(--border)] hover:border-[var(--foreground)] text-sm font-semibold"
            >
              Add another
            </button>
          </div>
          <button
            onClick={onForceRefresh}
            className="text-xs text-[var(--muted)] hover:text-[var(--accent)] underline underline-offset-2"
          >
            Re-extract from scratch (skip cache)
          </button>
        </div>
      )}
    </div>
  )
}

function phaseLabelFor(state: StreamState): string {
  if (state.status === 'idle') return 'Ready'
  if (state.status === 'connecting') return 'Connecting…'
  if (state.status === 'watching') return 'Watching the video'
  if (state.status === 'extracting') {
    const geocodedCount = state.restaurants.filter((r) => r.lat != null).length
    const total = state.totalCount ?? state.restaurants.length
    return `Pinning ${geocodedCount}/${total}`
  }
  if (state.status === 'complete')
    return `Done · ${state.result?.mentionsAdded ?? 0} ${
      (state.result?.mentionsAdded ?? 0) === 1 ? 'place' : 'places'
    }`
  if (state.status === 'failed') return 'Failed'
  return ''
}

function ArrivalCard({
  arrival,
  number,
  videoUrl,
}: {
  arrival: RestaurantArrival
  number: number | undefined
  videoUrl: string
}) {
  const photo = photoUrl(arrival.photoName, 200)
  const ts = arrival.timestampSec
  const videoUrlWithTime = ts != null ? `${videoUrl}&t=${Math.floor(ts)}s` : videoUrl
  return (
    <div className="flex items-stretch gap-3">
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--muted-soft)] shrink-0 relative">
        {arrival.skipped ? (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--muted)]">
            <X className="w-5 h-5" />
          </div>
        ) : photo ? (
          <motion.img
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            src={photo}
            alt={arrival.name}
            className="w-full h-full object-cover fm-photo"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--muted)]" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {arrival.skipped ? (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--muted-soft)] text-[var(--muted)] text-[10px] font-bold fm-num">
              <X className="w-3 h-3" />
            </span>
          ) : (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold fm-num">
              {number ?? '·'}
            </span>
          )}
          {arrival.id ? (
            <Link
              href={`/p/${arrival.id}`}
              className="font-semibold hover:text-[var(--accent)] transition"
            >
              {arrival.name}
            </Link>
          ) : (
            <span className="font-semibold">{arrival.name}</span>
          )}
          {arrival.nameLocal && (
            <span className="text-xs text-[var(--muted)]">{arrival.nameLocal}</span>
          )}
        </div>
        <div className="text-xs text-[var(--muted)] mt-0.5">
          {arrival.cuisine}
          {arrival.cuisine && ' · '}
          {arrival.city}
          {arrival.skipped && (
            <span className="ml-2 italic text-red-600">{arrival.skipReason}</span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <SourceBadge kind="youtube" size="sm" />
          {ts != null && videoUrl && (
            <a
              href={videoUrlWithTime}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
            >
              <span className="font-mono">{formatTimestamp(ts)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <span className="text-xs text-[var(--muted)] italic truncate flex-1 min-w-0">
            &ldquo;{arrival.quote.slice(0, 80)}
            {arrival.quote.length > 80 ? '…' : ''}&rdquo;
          </span>
        </div>
      </div>
    </div>
  )
}

function ScannedThumbnail({
  src,
  title,
  channel,
  sourceKind,
  isWatching,
}: {
  src: string
  title?: string
  channel?: string
  sourceKind: SourceKind
  isWatching: boolean
}) {
  return (
    <div className="relative aspect-video bg-black overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={title ?? ''} className="absolute inset-0 w-full h-full object-cover" />
      {isWatching && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent)]/0 to-black/30" />
          <div className="absolute left-0 right-0 h-[2px] bg-[var(--accent)]/80 fm-scanline shadow-[0_0_18px_4px_rgba(218,63,42,0.6)]" />
        </>
      )}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/85 to-transparent text-white">
        <div className="text-sm font-semibold line-clamp-1">{title}</div>
        <div className="text-xs opacity-70 flex items-center gap-1.5 mt-0.5">
          <MapPin className="w-3 h-3" />
          {channel}
          <span className="opacity-50">·</span>
          {sourceKind}
        </div>
      </div>
    </div>
  )
}

type ErrorKind = 'quota' | 'network' | 'unknown'

function classifyError(raw: string | null): {
  kind: ErrorKind
  title: string
  body: string
  retrySec: number | null
} {
  const msg = (raw ?? '').toString()
  if (
    /RESOURCE_EXHAUSTED|free_tier_requests|exceeded your current quota|quota\b|\b429\b/i.test(
      msg
    )
  ) {
    const m = msg.match(/retry in\s*(\d+(?:\.\d+)?)\s*s/i)
    const retrySec = m ? Math.ceil(parseFloat(m[1])) : null
    return {
      kind: 'quota',
      title: 'Free Gemini quota hit',
      body: retrySec
        ? `The shared free key has run out for the moment. Try again in ~${retrySec}s, or add your own Gemini key for unlimited extractions.`
        : 'The shared free Gemini quota has run out. Add your own Gemini API key for unlimited extractions — it stays in your browser.',
      retrySec,
    }
  }
  // Safari emits "Load failed" / "The network connection was lost" when fetch
  // drops at the transport layer. Chrome/Firefox emit "Failed to fetch" / "The
  // operation was aborted". All are network-layer failures, not server errors.
  if (
    /load failed|failed to fetch|fetch failed|network|ECONN|ENOTFOUND|timeout|connection (was )?lost|operation was aborted/i.test(
      msg
    )
  ) {
    return {
      kind: 'network',
      title: 'Connection dropped',
      body: 'The connection to the extractor was interrupted before any data came back. Usually a Wi-Fi / cellular hiccup or a backgrounded tab. Retry should work.',
      retrySec: null,
    }
  }
  return {
    kind: 'unknown',
    title: 'Something went wrong',
    body: msg.slice(0, 280) || 'No further details.',
    retrySec: null,
  }
}

function ErrorPanel({
  error,
  hasUserKey,
  onOpenKeyModal,
  onRetry,
  onReset,
}: {
  error: string | null
  hasUserKey?: boolean
  onOpenKeyModal?: () => void
  onRetry: () => void
  onReset: () => void
}) {
  const info = classifyError(error)
  return (
    <div className="p-5 border-t border-[var(--border)]">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{info.title}</div>
          <div className="mt-1 text-sm text-[var(--foreground-soft)]">{info.body}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {info.kind === 'quota' && !hasUserKey && onOpenKeyModal && (
          <button
            type="button"
            onClick={onOpenKeyModal}
            className="fm-btn inline-flex items-center gap-1.5 bg-[var(--accent)] text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-[var(--accent-hover)]"
          >
            <Key className="w-4 h-4" />
            Add your own key
          </button>
        )}
        <button
          type="button"
          onClick={onRetry}
          className="fm-btn inline-flex items-center gap-1.5 border border-[var(--border)] hover:border-[var(--foreground)] px-4 py-2 rounded-xl text-sm font-medium"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={onReset}
          className="fm-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Start over
        </button>
      </div>

      {info.kind === 'unknown' && error && error.length > 280 && (
        <details className="mt-4 text-xs text-[var(--muted)]">
          <summary className="cursor-pointer hover:text-[var(--foreground)]">
            Show full error
          </summary>
          <pre className="mt-2 whitespace-pre-wrap break-all bg-[var(--muted-soft)] p-3 rounded-lg font-mono">
            {error}
          </pre>
        </details>
      )}
    </div>
  )
}

function useElapsed(startedAt: number | null, finishedAt: number | null): string {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!startedAt || finishedAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [startedAt, finishedAt])
  if (!startedAt) return '0:00'
  const end = finishedAt ?? now
  const total = Math.max(0, Math.floor((end - startedAt) / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
