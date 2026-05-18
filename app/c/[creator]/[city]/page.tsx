import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCreator } from '@/lib/data'
import { CreatorAvatar } from '@/components/creator-avatar'
import { RestaurantCard } from '@/components/restaurant-card'
import { AtlasMap } from '@/components/atlas-map'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ creator: string; city: string }>
}) {
  const { creator: slug, city: rawCity } = await params
  const city = decodeURIComponent(rawCity)
  const data = await getCreator(slug)
  if (!data) return { title: 'Not found' }
  return {
    title: `${data.creator.name}'s ${city}`,
    description: `${data.restaurants.filter((r) => r.city === city).length} restaurants in ${city} recommended by ${data.creator.name}.`,
  }
}

export default async function CityListPage({
  params,
}: {
  params: Promise<{ creator: string; city: string }>
}) {
  const { creator: slug, city: rawCity } = await params
  const city = decodeURIComponent(rawCity)
  const data = await getCreator(slug)
  if (!data) notFound()
  const { creator, restaurants } = data
  const cityRestaurants = restaurants.filter((r) => r.city === city)
  if (cityRestaurants.length === 0) notFound()

  return (
    <div className="flex-1">
      {/* Hero */}
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <Link
            href={`/c/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All of {creator.name}&apos;s picks
          </Link>

          <div className="flex items-start gap-5">
            <span className="fm-avatar-tilt inline-flex">
              <CreatorAvatar creator={creator} size="xl" link={false} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                {creator.name}&apos;s
              </div>
              <h1 className="mt-0.5 text-3xl sm:text-4xl lg:text-5xl font-bold -tracking-[0.025em] leading-tight">
                {city}
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                <span className="font-semibold text-[var(--foreground)] fm-num">
                  {cityRestaurants.length}
                </span>{' '}
                {cityRestaurants.length === 1 ? 'place' : 'places'} in {city},{' '}
                {cityRestaurants[0]?.country}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
          <div className="rounded-2xl overflow-hidden border border-[var(--border-strong)] h-[360px] bg-[var(--muted-soft)]">
            <AtlasMap restaurants={cityRestaurants} className="w-full h-full" />
          </div>
        </div>
      </section>

      {/* List */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cityRestaurants.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </div>
      </section>
    </div>
  )
}
