import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRestaurant } from '@/lib/data'
import { AtlasMap } from '@/components/atlas-map'
import { SourceBadge } from '@/components/source-badge'
import { CreatorAvatar } from '@/components/creator-avatar'
import { formatTimestamp, priceDots } from '@/lib/utils'
import { ExternalLink, MapPin, ArrowLeft } from 'lucide-react'
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
                  <h1 className="text-3xl font-bold">{restaurant.name}</h1>
                  {restaurant.nameLocal && (
                    <p className="text-lg text-[var(--muted)]">{restaurant.nameLocal}</p>
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
              <ul className="space-y-3">
                {mentions.map((m) => (
                  <li
                    key={m.id}
                    className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4"
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <SourceBadge kind={m.source.kind} />
                      {m.source.creator && <CreatorAvatar creator={m.source.creator} size="sm" />}
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
                        {m.timestampSec != null && (
                          <span className="font-mono">{formatTimestamp(m.timestampSec)}</span>
                        )}
                        Open
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {m.dish && (
                      <div className="text-xs text-[var(--muted)] mb-2">
                        <span className="font-semibold text-[var(--foreground)]">Dish:</span>{' '}
                        {m.dish}
                      </div>
                    )}
                    <blockquote className="text-sm text-[var(--foreground)] border-l-2 border-[var(--accent)]/40 pl-3 italic">
                      &ldquo;{m.quote}&rdquo;
                    </blockquote>
                  </li>
                ))}
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
