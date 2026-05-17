import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { Restaurant, Mention } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = supabaseAdmin()

  const { data: r, error } = await sb
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!r) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { data: mentionsRows } = await sb
    .from('mentions')
    .select(
      `id, restaurant_id, dish, quote, timestamp_sec, anchor, created_at,
       videos ( id, source_kind, url, title, thumbnail_url, published_at,
         creators ( slug, name, platform, avatar_url, url ) )`
    )
    .eq('restaurant_id', id)
    .order('created_at', { ascending: false })

  const restaurant: Restaurant = {
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
    mentionCount: mentionsRows?.length ?? 0,
    topCreators: [],
  }

  type MentionRow = {
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
      creators: {
        slug: string
        name: string
        platform: string
        avatar_url: string | null
        url: string | null
      } | null
    } | null
  }
  const typedMentions = (mentionsRows ?? []) as unknown as MentionRow[]
  const mentions: Mention[] = typedMentions.map((m) => ({
    id: m.id,
    restaurantId: m.restaurant_id,
    source: {
      kind: (m.videos?.source_kind ?? 'article') as Mention['source']['kind'],
      url: m.videos?.url ?? '',
      title: m.videos?.title ?? undefined,
      thumbnailUrl: m.videos?.thumbnail_url ?? undefined,
      publishedAt: m.videos?.published_at ?? undefined,
      creator: m.videos?.creators
        ? {
            slug: m.videos.creators.slug,
            name: m.videos.creators.name,
            platform: m.videos.creators.platform as 'youtube' | 'tiktok' | 'instagram' | 'reddit' | 'web',
            avatarUrl: m.videos.creators.avatar_url ?? undefined,
            url: m.videos.creators.url ?? undefined,
            videoCount: 0,
            restaurantCount: 0,
          }
        : undefined,
    },
    dish: m.dish ?? undefined,
    quote: m.quote,
    timestampSec: m.timestamp_sec ?? undefined,
    anchor: m.anchor ?? undefined,
    createdAt: m.created_at,
  }))

  return NextResponse.json({ restaurant, mentions })
}
