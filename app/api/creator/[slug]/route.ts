import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { Creator, Restaurant, Mention } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sb = supabaseAdmin()

  const { data: cRow, error: cErr } = await sb
    .from('creators')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })
  if (!cRow) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Mentions for this creator (via videos)
  const { data: mentionsRows } = await sb
    .from('mentions')
    .select(
      `id, restaurant_id, dish, quote, timestamp_sec, anchor, created_at,
       videos!inner ( id, source_kind, url, title, thumbnail_url, published_at, creator_slug ),
       restaurants ( id, name, name_local, city, country, lat, lng, cuisine, price_level, places_id, photo_name )`
    )
    .eq('videos.creator_slug', slug)

  // Aggregate
  const restaurantsMap = new Map<string, Restaurant>()
  const mentions: Mention[] = []
  const videoIds = new Set<string>()

  type Row = {
    id: string
    restaurant_id: string
    dish: string | null
    quote: string
    timestamp_sec: number | null
    anchor: string | null
    created_at: string
    videos: {
      id: string
      source_kind: string
      url: string
      title: string | null
      thumbnail_url: string | null
      published_at: string | null
    }
    restaurants: {
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
    } | null
  }
  const typedRows = (mentionsRows ?? []) as unknown as Row[]
  for (const m of typedRows) {
    if (!m.restaurants) continue
    videoIds.add(m.videos.id)
    const r = m.restaurants
    if (!restaurantsMap.has(r.id)) {
      restaurantsMap.set(r.id, {
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
        mentionCount: 0,
        topCreators: [],
      })
    }
    const restaurant = restaurantsMap.get(r.id)!
    restaurant.mentionCount++

    mentions.push({
      id: m.id,
      restaurantId: m.restaurant_id,
      source: {
        kind: m.videos.source_kind as Mention['source']['kind'],
        url: m.videos.url,
        title: m.videos.title ?? undefined,
        thumbnailUrl: m.videos.thumbnail_url ?? undefined,
        publishedAt: m.videos.published_at ?? undefined,
      },
      dish: m.dish ?? undefined,
      quote: m.quote,
      timestampSec: m.timestamp_sec ?? undefined,
      anchor: m.anchor ?? undefined,
      createdAt: m.created_at,
    })
  }

  const creator: Creator = {
    slug: cRow.slug,
    name: cRow.name,
    platform: cRow.platform as Creator['platform'],
    avatarUrl: cRow.avatar_url ?? undefined,
    url: cRow.url ?? undefined,
    videoCount: videoIds.size,
    restaurantCount: restaurantsMap.size,
  }

  return NextResponse.json({
    creator,
    restaurants: Array.from(restaurantsMap.values()),
    mentions,
  })
}
