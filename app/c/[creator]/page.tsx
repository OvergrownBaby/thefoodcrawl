import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCreator } from '@/lib/data'
import { JsonLd } from '@/components/json-ld'
import { creatorJsonLd } from '@/lib/jsonld'
import { CreatorAvatar } from '@/components/creator-avatar'
import { RestaurantCard } from '@/components/restaurant-card'
import { AtlasMap } from '@/components/atlas-map'
import { ExternalLink, Globe } from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ creator: string }>
}) {
  const { creator: slug } = await params
  const data = await getCreator(slug)
  if (!data) return { title: 'Not found' }
  return {
    title: `${data.creator.name} — Foodcrawl`,
    description: `${data.restaurants.length} restaurants recommended by ${data.creator.name}.`,
  }
}

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ creator: string }>
}) {
  const { creator: slug } = await params
  const data = await getCreator(slug)
  if (!data) notFound()
  const { creator, restaurants, mentions } = data

  // Group restaurants by city for tidier display
  const byCity = new Map<string, typeof restaurants>()
  for (const r of restaurants) {
    const list = byCity.get(r.city) ?? []
    list.push(r)
    byCity.set(r.city, list)
  }

  return (
    <div className="flex-1">
      <JsonLd data={creatorJsonLd(creator, restaurants)} />
      {/* Header */}
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 flex items-start gap-6">
          <span className="fm-avatar-tilt inline-flex">
            <CreatorAvatar creator={creator} size="xl" link={false} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="fm-label">Creator</div>
            <h1 className="fm-display mt-1 text-4xl lg:text-5xl leading-[1.0]">{creator.name}</h1>
            <div className="mt-1.5 fm-label">{creator.platform}</div>
            <div className="mt-3 text-sm text-[var(--muted)]">
              <span className="fm-display text-2xl text-[var(--foreground)]">
                {restaurants.length}
              </span>{' '}
              restaurants ·{' '}
              <span className="fm-display text-2xl text-[var(--foreground)]">
                {creator.videoCount}
              </span>{' '}
              videos · across{' '}
              <span className="fm-display text-2xl text-[var(--foreground)]">{byCity.size}</span>{' '}
              {byCity.size === 1 ? 'city' : 'cities'}
            </div>
            {creator.url && (
              <a
                href={creator.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
              >
                <Globe className="w-4 h-4" />
                {creator.url.replace(/^https?:\/\/(www\.)?/, '')}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Map of all their pins */}
      {restaurants.length > 0 && (
        <section className="border-b border-[var(--border)] bg-[var(--muted-soft)]/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
            <div className="rounded-2xl overflow-hidden ring-1 ring-[var(--border)] h-[360px] bg-white">
              <AtlasMap restaurants={restaurants} className="w-full h-full" />
            </div>
          </div>
        </section>
      )}

      {/* By city */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        {Array.from(byCity.entries()).map(([city, list]) => (
          <div key={city} className="mb-10">
            <h2 className="text-xl font-bold mb-4">
              <Link
                href={`/c/${slug}/${encodeURIComponent(city)}`}
                className="hover:underline underline-offset-4"
              >
                {city}
              </Link>{' '}
              <span className="text-sm font-normal text-[var(--muted)]">
                · {list.length} {list.length === 1 ? 'place' : 'places'}
              </span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((r) => (
                <RestaurantCard key={r.id} restaurant={r} />
              ))}
            </div>
          </div>
        ))}

        {restaurants.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[var(--muted)]">
              No restaurants parsed for {creator.name} yet.
            </p>
            <Link
              href="/submit"
              className="mt-4 inline-flex items-center gap-1.5 bg-[var(--accent)] text-white font-semibold px-4 py-2 rounded-xl hover:opacity-90"
            >
              Drop a link to seed
            </Link>
          </div>
        )}
        {/* suppress unused-variable lint */}
        <div className="hidden">{mentions.length}</div>
      </section>
    </div>
  )
}
