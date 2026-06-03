import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRestaurant } from '@/lib/data'
import { AtlasMap } from '@/components/atlas-map'
import { SourceBadge } from '@/components/source-badge'
import { CreatorAvatar } from '@/components/creator-avatar'
import { YouTubeClip } from '@/components/youtube-clip'
import { youtubeIdFromUrl } from '@/lib/fetchers/youtube'
import { formatTimestamp, priceDots, placeTitle } from '@/lib/utils'
import { ExternalLink, MapPin, ArrowLeft, Utensils } from 'lucide-react'
import { photoUrl } from '@/lib/photo'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ place: string }>
}) {
  const { place: id } = await params
  const data = await getRestaurant(id)
  if (!data) return { title: 'Not found' }
  return {
    title: `${data.restaurant.name} — Foodcrawl`,
    description: `${data.restaurant.cuisine ?? 'Restaurant'} in ${data.restaurant.city}. Recommended ${data.mentions.length} ${data.mentions.length === 1 ? 'time' : 'times'}.`,
  }
}

export default async function PlacePage({
  params,
}: {
  params: Promise<{ place: string }>
}) {
  const { place: id } = await params
  const data = await getRestaurant(id)
  if (!data) notFound()
  const { restaurant, mentions } = data

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${restaurant.name} ${restaurant.city}`
  )}`
  const hero = photoUrl(restaurant.photoName, 800)

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <Link
          href="/atlas"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to atlas
        </Link>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Left: details */}
          <div>
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
              {hero && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hero}
                  alt={restaurant.name}
                  className="w-full h-56 object-cover bg-[var(--muted-soft)] fm-photo"
                />
              )}
              <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold">
                    {placeTitle(restaurant.name, restaurant.nameLocal).primary}
                  </h1>
                  {placeTitle(restaurant.name, restaurant.nameLocal).secondary && (
                    <p className="text-lg text-[var(--muted)]">
                      {placeTitle(restaurant.name, restaurant.nameLocal).secondary}
                    </p>
                  )}
                </div>
                {restaurant.priceLevel && (
                  <span className="text-sm font-semibold text-[var(--muted)]">
                    {priceDots(restaurant.priceLevel)}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {restaurant.cuisine}
                <span className="mx-2">·</span>
                {restaurant.city}, {restaurant.country}
              </p>

              <div className="mt-5 flex gap-2">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 bg-[var(--foreground)] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90"
                >
                  <MapPin className="w-4 h-4" />
                  Open in Google Maps
                </a>
              </div>
              </div>
            </div>

            {/* Mentions */}
            <div className="mt-6">
              <h2 className="text-xl font-bold mb-3">
                {mentions.length} {mentions.length === 1 ? 'mention' : 'mentions'}
              </h2>
              <ul className="space-y-4">
                {mentions.map((m) => {
                  const ytId = youtubeIdFromUrl(m.source.url)
                  return (
                    <li
                      key={m.id}
                      className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4"
                    >
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <SourceBadge kind={m.source.kind} />
                        {m.source.creator && (
                          <CreatorAvatar creator={m.source.creator} size="sm" />
                        )}
                        {m.source.title && (
                          <span className="text-xs text-[var(--muted)] truncate flex-1">
                            {m.source.title}
                          </span>
                        )}
                        <a
                          href={
                            m.timestampSec != null
                              ? `${m.source.url}&t=${Math.floor(m.timestampSec)}s`
                              : m.source.url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto text-xs font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                        >
                          Open on YouTube
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <blockquote className="text-sm text-[var(--foreground)] border-l-2 border-[var(--accent)]/40 pl-3 italic mb-3">
                        &ldquo;{m.quote}&rdquo;
                      </blockquote>

                      {/* Legacy fallback: pre-dish_mentions records have a
                          single comma-joined `dish` string. Render it as a
                          plain line + the single timestamp jump until
                          re-extraction populates dish_mentions. */}
                      {m.dishes.length === 0 && m.dish && (
                        <div className="rounded-xl ring-1 ring-[var(--border)] bg-[var(--background)]/40 p-3 text-xs">
                          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] font-semibold inline-flex items-center gap-1.5 mb-1.5">
                            <Utensils className="w-3 h-3" />
                            Dishes
                          </div>
                          <p className="text-[var(--foreground-soft)] leading-relaxed">{m.dish}</p>
                          {m.timestampSec != null && ytId && (
                            <div className="mt-3">
                              <YouTubeClip
                                videoId={ytId}
                                startSec={m.timestampSec}
                                title={m.source.title ?? undefined}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {m.dishes.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] font-semibold inline-flex items-center gap-1.5">
                            <Utensils className="w-3 h-3" />
                            {m.dishes.length === 1 ? 'Dish' : `${m.dishes.length} dishes`}
                          </div>
                          <ol className="space-y-3">
                            {m.dishes.map((d, i) => (
                              <li
                                key={d.id}
                                className="rounded-xl ring-1 ring-[var(--border)] bg-[var(--background)]/40 p-3"
                              >
                                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                                  <div className="font-semibold text-sm flex items-center gap-2">
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold fm-num">
                                      {i + 1}
                                    </span>
                                    {d.name}
                                  </div>
                                  {d.timestampSec != null && (
                                    <span className="text-[11px] font-mono text-[var(--muted)]">
                                      {formatTimestamp(d.timestampSec)}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1.5 text-xs text-[var(--foreground-soft)] italic leading-relaxed">
                                  &ldquo;{d.quote}&rdquo;
                                </p>
                                {ytId && (
                                  <div className="mt-3">
                                    <YouTubeClip
                                      videoId={ytId}
                                      startSec={d.timestampSec}
                                      title={`${d.name} — ${m.source.title ?? ''}`}
                                    />
                                  </div>
                                )}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {/* Right: map */}
          <div className="lg:sticky lg:top-20 h-fit">
            <div className="rounded-2xl overflow-hidden ring-1 ring-[var(--border)] h-[360px] bg-white">
              <AtlasMap
                restaurants={[restaurant]}
                center={[restaurant.lng, restaurant.lat]}
                zoom={15}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
