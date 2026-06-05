import { notFound } from 'next/navigation'
import { getAtlas } from '@/lib/data'
import { resolveCitySlug, cityPath } from '@/lib/cities'
import { JsonLd } from '@/components/json-ld'
import { cityJsonLd, breadcrumbJsonLd } from '@/lib/jsonld'
import { RestaurantCard } from '@/components/restaurant-card'
import { AtlasMap } from '@/components/atlas-map'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params
  const row = await resolveCitySlug(slug)
  if (!row) return { title: 'Not found' }
  return {
    title: `${row.city} — restaurants from food videos`,
    description: `${row.count} restaurants in ${row.city}${row.country ? ', ' + row.country : ''}, pulled from food creators' videos and mapped with the quote and timestamp each came from.`,
    alternates: { canonical: cityPath(row.city) },
  }
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params
  const row = await resolveCitySlug(slug)
  if (!row) notFound()
  const restaurants = await getAtlas({ city: row.city })
  if (restaurants.length === 0) notFound()

  // Distinct creators covering this city, for the subhead.
  const creators = new Map<string, { slug: string; name: string }>()
  for (const r of restaurants) for (const c of r.topCreators) creators.set(c.slug, c)

  return (
    <div className="flex-1">
      <JsonLd data={cityJsonLd(row.city, restaurants)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: row.city, url: cityPath(row.city) },
        ])}
      />

      <section className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <div className="fm-label">Food map</div>
          <h1 className="fm-display mt-1 text-3xl sm:text-4xl lg:text-5xl leading-[1.0]">
            {row.city}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            <span className="fm-display text-2xl text-[var(--foreground)]">
              {restaurants.length}
            </span>{' '}
            restaurants{row.country ? ` in ${row.country}` : ''}, from{' '}
            <span className="fm-display text-2xl text-[var(--foreground)]">{creators.size}</span>{' '}
            {creators.size === 1 ? 'creator' : 'creators'}
          </p>
        </div>
      </section>

      <section className="border-b border-[var(--border)] bg-[var(--muted-soft)]/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
          <div className="rounded-2xl overflow-hidden ring-1 ring-[var(--border)] h-[360px] bg-white">
            <AtlasMap restaurants={restaurants} className="w-full h-full" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {restaurants.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </div>
      </section>
    </div>
  )
}
