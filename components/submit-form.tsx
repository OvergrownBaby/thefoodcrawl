'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { SourceKind } from '@/lib/types'
import { SourceBadge } from './source-badge'
import { Loader2, Sparkles, Link as LinkIcon, Check, X, ExternalLink, ArrowRight, Key } from 'lucide-react'
import { cn, formatTimestamp } from '@/lib/utils'
import { AtlasMap } from './atlas-map'
import { photoUrl } from '@/lib/photo'
import type { Restaurant } from '@/lib/types'
import { ByokModal } from './byok-modal'
import { getStoredKey } from '@/lib/byok'

type Stage = 'idle' | 'fetching' | 'extracting' | 'geocoding' | 'done' | 'failed'

const STAGES: Array<{ key: Stage; label: string; sub: string }> = [
  { key: 'fetching', label: 'Fetching', sub: 'Loading the video / article…' },
  { key: 'extracting', label: 'Reading', sub: 'AI is watching and listening…' },
  { key: 'geocoding', label: 'Mapping', sub: 'Finding each place on the map…' },
  { key: 'done', label: 'Done', sub: 'Pins added to the atlas' },
]

type ResultRestaurant = {
  id: string
  name: string
  nameLocal?: string
  city: string
  country: string
  cuisine?: string
  priceLevel?: number
  lat: number
  lng: number
  photoName?: string
}

type ResultMention = {
  id: string
  restaurant_id: string
  dish: string | null
  quote: string
  timestamp_sec: number | null
  restaurants: {
    id: string
    name: string
    name_local: string | null
    city: string
    country: string
    cuisine: string | null
    price_level: number | null
    lat: number
    lng: number
    photo_name: string | null
  } | null
}

type ExtractResponse = {
  jobId?: string
  videoId?: string
  restaurantsAdded?: number
  mentionsAdded?: number
  skippedNoGeocode?: number
  mentions?: ResultMention[]
  error?: string
}

export function SubmitForm() {
  const [url, setUrl] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [keyModalOpen, setKeyModalOpen] = useState(false)
  const [hasUserKey, setHasUserKey] = useState(false)
  const [result, setResult] = useState<{
    sourceUrl: string
    sourceKind: SourceKind
    creatorName?: string
    restaurants: ResultRestaurant[]
    mentions: Array<{
      id: string
      restaurantId: string
      dish?: string
      quote: string
      timestampSec?: number
    }>
  } | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasUserKey(!!getStoredKey())
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setError(null)
    setResult(null)

    // Optimistic progress UX while the (potentially long) API call runs.
    setStage('fetching')

    try {
      // Bump through stages on a timer so the user sees movement even though
      // the backend completes them all in one call. The real one finishes
      // at the API response.
      const stageTimer = stepStages(setStage)

      const headers: Record<string, string> = { 'content-type': 'application/json' }
      const byok = getStoredKey()
      if (byok) headers['x-gemini-key'] = byok

      const res = await fetch('/api/extract', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url }),
      })

      stageTimer.cancel()

      const body = (await res.json()) as ExtractResponse

      if (!res.ok || body.error) {
        setStage('failed')
        setError(body.error ?? `Request failed (${res.status})`)
        return
      }

      const mentions = (body.mentions ?? []).filter((m): m is ResultMention & {
        restaurants: NonNullable<ResultMention['restaurants']>
      } => m.restaurants !== null)

      const restaurants: ResultRestaurant[] = mentions.map((m) => ({
        id: m.restaurants.id,
        name: m.restaurants.name,
        nameLocal: m.restaurants.name_local ?? undefined,
        city: m.restaurants.city,
        country: m.restaurants.country,
        cuisine: m.restaurants.cuisine ?? undefined,
        priceLevel: m.restaurants.price_level ?? undefined,
        lat: m.restaurants.lat,
        lng: m.restaurants.lng,
        photoName: m.restaurants.photo_name ?? undefined,
      }))

      const ms = mentions.map((m) => ({
        id: m.id,
        restaurantId: m.restaurant_id,
        dish: m.dish ?? undefined,
        quote: m.quote,
        timestampSec: m.timestamp_sec ?? undefined,
      }))

      // Best-effort source kind inference from URL
      const sourceKind: SourceKind = /youtube\.com|youtu\.be/.test(url)
        ? 'youtube'
        : /reddit\.com/.test(url)
          ? 'reddit'
          : 'article'

      setResult({
        sourceUrl: url,
        sourceKind,
        restaurants,
        mentions: ms,
      })
      setStage('done')
    } catch (err) {
      setStage('failed')
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  function reset() {
    setStage('idle')
    setResult(null)
    setError(null)
    setUrl('')
  }

  const busy = stage !== 'idle' && stage !== 'done' && stage !== 'failed'

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <label
          htmlFor="url"
          className="block text-sm font-medium text-[var(--muted)] mb-2"
        >
          Paste a link
        </label>
        <div className="flex items-center gap-2 bg-white border border-[var(--border)] rounded-2xl pl-4 pr-2 py-2 focus-within:ring-2 focus-within:ring-[var(--accent)]/30 focus-within:border-[var(--accent)] transition">
          <LinkIcon className="w-4 h-4 text-[var(--muted)] shrink-0" />
          <input
            id="url"
            type="url"
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=…  or  reddit / eater / blog"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm py-1.5"
          />
          <button
            type="submit"
            disabled={!url.trim() || busy}
            className={cn(
              'fm-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm',
              !url.trim() || busy
                ? 'bg-[var(--muted-soft)] text-[var(--muted)] cursor-not-allowed'
                : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
            )}
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Working…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Extract
              </>
            )}
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <span className="truncate">
            Works on YouTube, Reddit, and most articles. Long-form videos can take 1–3 minutes.
          </span>
          <button
            type="button"
            onClick={() => setKeyModalOpen(true)}
            className={cn(
              'shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md transition',
              hasUserKey
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20 hover:ring-[var(--accent)]/40'
                : 'hover:text-[var(--foreground)] hover:bg-[var(--muted-soft)]'
            )}
          >
            <Key className="w-3 h-3" />
            {hasUserKey ? 'using your key' : 'use your own key'}
          </button>
        </div>
      </form>

      <ByokModal
        open={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
        onChange={setHasUserKey}
      />

      {(busy || stage === 'done' || stage === 'failed') && (
        <div className="mt-8 bg-white rounded-2xl border border-[var(--border)] p-5">
          <ol className="grid grid-cols-4 gap-3">
            {STAGES.map((s, i) => {
              const reached = stageIndex(stage) >= i
              const current = stage === s.key
              return (
                <li
                  key={s.key}
                  className={cn(
                    'rounded-xl p-3 border transition',
                    current
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : reached
                        ? 'border-[var(--border)] bg-[var(--muted-soft)]'
                        : 'border-[var(--border)] bg-white opacity-60'
                  )}
                >
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    <span>Step {i + 1}</span>
                    {reached && !current && <Check className="w-3 h-3 text-green-600" />}
                    {current && <Loader2 className="w-3 h-3 animate-spin text-[var(--accent)]" />}
                  </div>
                  <div className="mt-1 text-sm font-semibold">{s.label}</div>
                  <div className="text-xs text-[var(--muted)]">{s.sub}</div>
                </li>
              )
            })}
          </ol>

          {stage === 'failed' && (
            <div className="mt-4 flex items-start gap-2 text-sm text-red-700">
              <X className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Failed</div>
                <div className="text-xs">{error ?? 'Something went wrong'}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {stage === 'done' && result && (
        <ResultView result={result} onReset={reset} />
      )}
    </div>
  )
}

function ResultView({
  result,
  onReset,
}: {
  result: {
    sourceUrl: string
    sourceKind: SourceKind
    restaurants: ResultRestaurant[]
    mentions: Array<{
      id: string
      restaurantId: string
      dish?: string
      quote: string
      timestampSec?: number
    }>
  }
  onReset: () => void
}) {
  // Order restaurants by their first-mention timestamp so the polyline is
  // "the tour the creator took us on."
  const tsById = new Map(result.mentions.map((m) => [m.restaurantId, m.timestampSec ?? 1e9]))
  const ordered = [...result.restaurants].sort(
    (a, b) => (tsById.get(a.id) ?? 1e9) - (tsById.get(b.id) ?? 1e9)
  )

  const mapRestaurants: Restaurant[] = ordered.map((r) => ({
    id: r.id,
    name: r.name,
    nameLocal: r.nameLocal,
    city: r.city,
    country: r.country,
    lat: r.lat,
    lng: r.lng,
    cuisine: r.cuisine,
    priceLevel: r.priceLevel as 1 | 2 | 3 | 4 | undefined,
    photoName: r.photoName,
    mentionCount: 1,
    topCreators: [],
  }))
  const routeOrder = ordered.map((r) => r.id)

  return (
    <div className="mt-8 bg-white rounded-2xl border border-[var(--border)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-lg">
            Added {result.restaurants.length}{' '}
            {result.restaurants.length === 1 ? 'restaurant' : 'restaurants'}
          </h2>
          <p className="text-sm text-[var(--muted)]">Live on the atlas.</p>
        </div>
        <button
          onClick={onReset}
          className="fm-btn text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Add another
        </button>
      </div>

      {result.restaurants.length === 0 ? (
        <p className="text-sm text-[var(--muted)] italic">
          Nothing extracted — either no restaurants were mentioned, or the AI couldn&apos;t
          find verbatim quotes to back them up.
        </p>
      ) : (
        <>
          <div className="rounded-xl overflow-hidden border border-[var(--border)] h-[300px] sm:h-[360px] bg-[var(--muted-soft)] mb-4">
            <AtlasMap
              restaurants={mapRestaurants}
              routeOrder={routeOrder}
              numbered={true}
              className="w-full h-full"
            />
          </div>

          <ol className="space-y-2">
            {ordered.map((r, idx) => {
              const m = result.mentions.find((m) => m.restaurantId === r.id)
              const ts = m?.timestampSec
              const videoUrlWithTime =
                ts != null && result.sourceKind === 'youtube'
                  ? `${result.sourceUrl}&t=${Math.floor(ts)}s`
                  : result.sourceUrl
              const photo = photoUrl(r.photoName, 200)
              return (
                <li
                  key={r.id}
                  className="flex items-stretch gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--accent)]/40 transition bg-white"
                >
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt={r.name}
                      className="w-16 h-16 rounded-lg object-cover bg-[var(--muted-soft)] shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-[var(--muted-soft)] shrink-0 flex items-center justify-center text-xl">
                      📍
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold fm-num">
                        {idx + 1}
                      </span>
                      <Link
                        href={`/p/${r.id}`}
                        className="font-semibold hover:text-[var(--accent)] transition"
                      >
                        {r.name}
                      </Link>
                      {r.nameLocal && (
                        <span className="text-xs text-[var(--muted)]">{r.nameLocal}</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-0.5">
                      {r.cuisine}
                      {r.cuisine && ' · '}
                      {r.city}
                    </div>
                    {m && (
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <SourceBadge kind={result.sourceKind} size="sm" />
                        <a
                          href={videoUrlWithTime}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
                        >
                          {ts != null && (
                            <span className="font-mono">{formatTimestamp(ts)}</span>
                          )}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-xs text-[var(--muted)] italic truncate flex-1 min-w-0">
                          &ldquo;{m.quote.slice(0, 80)}
                          {m.quote.length > 80 ? '…' : ''}&rdquo;
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </>
      )}

      <div className="mt-5 flex gap-2">
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
    </div>
  )
}

function stageIndex(s: Stage): number {
  const order: Stage[] = ['idle', 'fetching', 'extracting', 'geocoding', 'done']
  return order.indexOf(s)
}

// Step the visible stage forward on a timer, so the user sees movement
// even though the API call is doing everything in one shot.
function stepStages(setStage: (s: Stage) => void) {
  const t1 = setTimeout(() => setStage('extracting'), 2_500)
  const t2 = setTimeout(() => setStage('geocoding'), 30_000)
  return {
    cancel: () => {
      clearTimeout(t1)
      clearTimeout(t2)
    },
  }
}
