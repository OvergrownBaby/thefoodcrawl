import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { Restaurant, SourceKind, RestaurantVideo } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const creatorFilter = searchParams.get('creator')
  const cityFilter = searchParams.get('city')
  const countryFilter = searchParams.get('country')

  const sb = supabaseAdmin()

  // Pull restaurants with their mentions + videos + creators joined.
  let query = sb
    .from('restaurants')
    .select(
      `id, name, name_local, city, country, lat, lng, cuisine, price_level, places_id, photo_name,
       mentions (
         videos (
           id, url, source_kind, title, thumbnail_url, published_at, creator_slug,
           creators ( slug, name, platform, avatar_url, url )
         )
       )`
    )
    .limit(2000)

  if (cityFilter) query = query.eq('city', cityFilter)
  if (countryFilter) query = query.eq('country', countryFilter)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type AtlasRow = {
    id: string
    name: string
    name_local: string | null
    city: string
    country: string
    lat: number
    lng: number
    cuisine: string | null
    price_level: number | null
    places_id: string | null
    photo_name: string | null
    mentions: Array<{
      videos: {
        id: string
        url: string
        source_kind: string
        title: string | null
        thumbnail_url: string | null
        published_at: string | null
        creator_slug: string | null
        creators: {
          slug: string
          name: string
          platform: string
          avatar_url: string | null
          url: string | null
        } | null
      } | null
    }>
  }
  const rows = (data ?? []) as unknown as AtlasRow[]

  const restaurants: Restaurant[] = rows
    .map((r): Restaurant => {
      const creators = new Map<string, { slug: string; name: string; platform: string; avatarUrl?: string; url?: string }>()
      const videos = new Map<string, { v: AtlasRow['mentions'][number]['videos']; publishedAt: string | null }>()
      let mentionCount = 0
      for (const m of r.mentions ?? []) {
        mentionCount++
        const v = m.videos
        if (v) {
          if (!videos.has(v.id)) {
            videos.set(v.id, { v, publishedAt: v.published_at })
          }
        }
        const c = m.videos?.creators
        if (c) {
          creators.set(c.slug, {
            slug: c.slug,
            name: c.name,
            platform: c.platform,
            avatarUrl: c.avatar_url ?? undefined,
            url: c.url ?? undefined,
          })
        }
      }
      const topCreators = Array.from(creators.values()).slice(0, 3)

      // Primary video: most recently published mention. Falls back to any.
      let primaryVideo: RestaurantVideo | undefined
      const videoList = Array.from(videos.values()).sort((a, b) => {
        if (a.publishedAt && b.publishedAt) return b.publishedAt.localeCompare(a.publishedAt)
        if (a.publishedAt) return -1
        if (b.publishedAt) return 1
        return 0
      })
      const v = videoList[0]?.v
      if (v) {
        primaryVideo = {
          id: v.id,
          url: v.url,
          sourceKind: v.source_kind as SourceKind,
          title: v.title ?? undefined,
          thumbnailUrl: v.thumbnail_url ?? undefined,
          channelName: v.creators?.name,
        }
      }

      return {
        id: r.id,
        name: r.name,
        nameLocal: r.name_local ?? undefined,
        city: r.city,
        country: r.country,
        lat: r.lat,
        lng: r.lng,
        cuisine: r.cuisine ?? undefined,
        priceLevel: (r.price_level as 1 | 2 | 3 | 4 | null) ?? undefined,
        placesId: r.places_id ?? undefined,
        photoName: r.photo_name ?? undefined,
        mentionCount,
        topCreators: topCreators.map((c) => ({
          slug: c.slug,
          name: c.name,
          platform: c.platform as 'youtube' | 'tiktok' | 'instagram' | 'reddit' | 'web',
          avatarUrl: c.avatarUrl,
          url: c.url,
          videoCount: 0,
          restaurantCount: 0,
        })),
        primaryVideo,
      }
    })
    .filter((r) => !creatorFilter || r.topCreators.some((c) => c.slug === creatorFilter))

  return NextResponse.json(restaurants)
}
