import { supabaseAdmin } from './supabase-server'

export type CuratedListItem = {
  id: string
  name: string
  photoName: string | null
  cuisine: string | null
}

export type CuratedList = {
  creatorSlug: string
  creatorName: string
  city: string
  country: string
  count: number
  /** Up to 6 restaurants in the list, sorted by most recently added */
  restaurants: CuratedListItem[]
  /** Source video titles (deduped). Used in card subtitle. */
  videoTitles: string[]
  /** Number of videos that contributed to this list */
  videoCount: number
}

/**
 * Aggregate restaurants into "lists" — one per (creator, city).
 * Each list reads as "Mark Wiens × Hong Kong" with the actual
 * restaurant names + source video titles surfaced.
 */
export async function getCuratedLists(limit = 12): Promise<CuratedList[]> {
  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from('mentions')
    .select(
      `restaurant_id, created_at,
       videos!inner ( id, title, creator_slug, creators!inner ( slug, name ) ),
       restaurants!inner ( id, name, city, country, photo_name, cuisine )`
    )
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error || !data) return []

  type Row = {
    restaurant_id: string
    created_at: string
    videos: {
      id: string
      title: string | null
      creator_slug: string | null
      creators: { slug: string; name: string } | null
    }
    restaurants: {
      id: string
      name: string
      city: string
      country: string
      photo_name: string | null
      cuisine: string | null
    }
  }
  const rows = data as unknown as Row[]

  type Bucket = {
    creatorSlug: string
    creatorName: string
    city: string
    country: string
    restaurantIds: Set<string>
    restaurants: CuratedListItem[]
    videoIds: Set<string>
    videoTitles: string[]
  }
  const buckets = new Map<string, Bucket>()

  for (const r of rows) {
    const creator = r.videos.creators
    if (!creator) continue
    const key = `${creator.slug}|${r.restaurants.city}|${r.restaurants.country}`
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = {
        creatorSlug: creator.slug,
        creatorName: creator.name,
        city: r.restaurants.city,
        country: r.restaurants.country,
        restaurantIds: new Set(),
        restaurants: [],
        videoIds: new Set(),
        videoTitles: [],
      }
      buckets.set(key, bucket)
    }
    if (!bucket.restaurantIds.has(r.restaurants.id)) {
      bucket.restaurantIds.add(r.restaurants.id)
      if (bucket.restaurants.length < 6) {
        bucket.restaurants.push({
          id: r.restaurants.id,
          name: r.restaurants.name,
          photoName: r.restaurants.photo_name,
          cuisine: r.restaurants.cuisine,
        })
      }
    }
    if (!bucket.videoIds.has(r.videos.id)) {
      bucket.videoIds.add(r.videos.id)
      if (r.videos.title) bucket.videoTitles.push(r.videos.title)
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => b.restaurantIds.size - a.restaurantIds.size)
    .slice(0, limit)
    .map((b) => ({
      creatorSlug: b.creatorSlug,
      creatorName: b.creatorName,
      city: b.city,
      country: b.country,
      count: b.restaurantIds.size,
      restaurants: b.restaurants,
      videoTitles: b.videoTitles,
      videoCount: b.videoIds.size,
    }))
}
