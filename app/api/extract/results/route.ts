import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Saved results for an already-extracted video, keyed by `videoId`.
 *
 * Used by the client to recover state cheaply after a dropped connection
 * (backgrounded tab, flaky network) or a full page reload — without opening
 * a new extraction stream or burning a rate-limit slot. Returns whatever
 * mentions were persisted, mapped into the same shape the live stream emits.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const videoId = searchParams.get('videoId')?.trim()
  if (!videoId) return NextResponse.json({ error: 'videoId required' }, { status: 400 })

  const sb = supabaseAdmin()

  const { data: video } = await sb
    .from('videos')
    .select('id, url, source_kind, title, thumbnail_url, creators ( name )')
    .eq('id', videoId)
    .maybeSingle<{
      id: string
      url: string
      source_kind: string
      title: string | null
      thumbnail_url: string | null
      creators: { name: string } | null
    }>()

  const { data: mentions } = await sb
    .from('mentions')
    .select(
      'id, quote, timestamp_sec, dish, created_at, restaurants!inner ( id, name, name_local, city, country, lat, lng, cuisine, price_level, photo_name )'
    )
    .eq('video_id', videoId)
    .order('created_at', { ascending: true })
    .returns<MentionRow[]>()

  const restaurants = (mentions ?? []).map((m) => {
    const r = m.restaurants
    return {
      clientId: m.id,
      id: r.id,
      name: r.name,
      nameLocal: r.name_local ?? undefined,
      city: r.city,
      country: r.country,
      cuisine: r.cuisine ?? undefined,
      dish: m.dish ?? undefined,
      quote: m.quote,
      timestampSec: m.timestamp_sec ?? undefined,
      lat: r.lat,
      lng: r.lng,
      photoName: r.photo_name ?? undefined,
      priceLevel: (r.price_level ?? undefined) as 1 | 2 | 3 | 4 | undefined,
    }
  })

  return NextResponse.json({
    videoId,
    video: video
      ? {
          videoId: video.id,
          url: video.url,
          sourceKind: video.source_kind,
          title: video.title ?? undefined,
          thumbnailUrl: video.thumbnail_url ?? undefined,
          channelName: video.creators?.name ?? undefined,
        }
      : null,
    restaurants,
  })
}

type MentionRow = {
  id: string
  quote: string
  timestamp_sec: number | null
  dish: string | null
  created_at: string
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
    photo_name: string | null
  }
}
