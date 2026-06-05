import type { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabase-server'
import { placePath } from '@/lib/place-url'
import { citySlug } from '@/lib/cities'
import { COMPARISONS } from '@/lib/comparisons'
import { GUIDES } from '@/lib/guides'

// Regenerate at most hourly so newly-added videos/places/creators get
// discovered by search + AI crawlers without hitting the DB on every request.
export const revalidate = 3600

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thefoodcrawl.com').replace(/\/+$/, '')

// Tab separator: never appears in a creator slug or a city name, so it's
// safe to pack a (creator, city) pair into one Set key and split it back.
const SEP = '\t'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = supabaseAdmin()
  const now = new Date()

  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/atlas`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/creators`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/submit`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]

  const [videosRes, creatorsRes, placesRes] = await Promise.all([
    sb.from('videos').select('id, published_at, created_at').limit(50000),
    sb.from('creators').select('slug').limit(50000),
    sb.from('restaurants').select('id, name, city, mentions(videos(creator_slug))').limit(50000),
  ])

  // Videos -> /v/{youtubeId}  (DB stores ids as "yt:VIDEOID"; the route strips the prefix)
  for (const v of videosRes.data ?? []) {
    const id = String(v.id).replace(/^yt:/, '')
    entries.push({
      url: `${SITE}/v/${id}`,
      lastModified: v.published_at ?? v.created_at ?? now,
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

  // Creators -> /c/{slug}
  for (const c of creatorsRes.data ?? []) {
    if (!c.slug) continue
    entries.push({
      url: `${SITE}/c/${encodeURIComponent(c.slug)}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  // Restaurants -> /p/{id}  +  collect distinct creator x city pairs
  const creatorCity = new Set<string>()
  const cities = new Set<string>()
  type VideoRef = { creator_slug: string | null }
  type PlaceRow = {
    id: string
    name: string | null
    city: string | null
    // Supabase types the embedded relation as an array even when it's to-one,
    // so accept either shape and normalize at runtime.
    mentions: Array<{ videos: VideoRef | VideoRef[] | null }> | null
  }
  for (const r of (placesRes.data ?? []) as unknown as PlaceRow[]) {
    entries.push({
      url: `${SITE}${placePath(r)}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    })
    if (!r.city) continue
    cities.add(r.city)
    for (const m of r.mentions ?? []) {
      const v = m?.videos
      const slug = Array.isArray(v) ? v[0]?.creator_slug : v?.creator_slug
      if (slug) creatorCity.add(slug + SEP + r.city)
    }
  }

  // The long-tail goldmine: "where did {creator} eat in {city}"
  for (const key of creatorCity) {
    const [slug, city] = key.split(SEP)
    entries.push({
      url: `${SITE}/c/${encodeURIComponent(slug)}/${encodeURIComponent(city)}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    })
  }

  // Global city pages -> /city/{slug}
  for (const city of cities) {
    entries.push({
      url: `${SITE}/city/${citySlug(city)}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  // Comparison + guide landing pages (static config)
  for (const c of COMPARISONS) {
    entries.push({ url: `${SITE}/vs/${c.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 })
  }
  for (const g of GUIDES) {
    entries.push({ url: `${SITE}/guides/${g.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 })
  }

  return entries
}
