import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase-server'
import { VideoPageView, type VideoPageMention, type VideoPageVideo } from '@/components/video-page-view'
import type { SourceKind, Platform } from '@/lib/types'

export const dynamic = 'force-dynamic'

type VideoRow = {
  id: string
  url: string
  source_kind: SourceKind
  title: string | null
  thumbnail_url: string | null
  published_at: string | null
  created_at: string
  duration_sec: number | null
  creator_slug: string | null
  creators: {
    slug: string
    name: string
    platform: Platform
    avatar_url: string | null
    url: string | null
  } | null
}

type MentionRow = {
  id: string
  dish: string | null
  quote: string
  timestamp_sec: number | null
  restaurants: {
    id: string
    name: string
    name_local: string | null
    city: string
    country: string
    cuisine: string | null
    price_level: number | null
    photo_name: string | null
    lat: number
    lng: number
  } | null
  dish_mentions: Array<{
    id: string
    name: string
    quote: string
    timestamp_sec: number | null
  }>
}

async function loadVideo(idParam: string) {
  const sb = supabaseAdmin()
  const candidates = [`yt:${idParam}`, idParam]
  for (const id of candidates) {
    const { data: video } = await sb
      .from('videos')
      .select(
        `id, url, source_kind, title, thumbnail_url, published_at, created_at, duration_sec, creator_slug,
         creators ( slug, name, platform, avatar_url, url )`
      )
      .eq('id', id)
      .maybeSingle<VideoRow>()
    if (video) {
      const { data: mentions } = await sb
        .from('mentions')
        .select(
          `id, dish, quote, timestamp_sec,
           restaurants ( id, name, name_local, city, country, cuisine, price_level, photo_name, lat, lng ),
           dish_mentions ( id, name, quote, timestamp_sec )`
        )
        .eq('video_id', id)
        .order('timestamp_sec', { ascending: true, nullsFirst: false })
        .returns<MentionRow[]>()
      return { video, mentions: mentions ?? [] }
    }
  }
  return null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ videoId: string }>
}): Promise<Metadata> {
  const { videoId } = await params
  const data = await loadVideo(videoId)
  if (!data) return { title: 'Not found' }
  const count = data.mentions.length
  return {
    title: data.video.title ?? 'Video',
    description: `${count} restaurants pinned from ${data.video.creators?.name ?? 'this video'}.`,
  }
}

export default async function VideoPage({
  params,
}: {
  params: Promise<{ videoId: string }>
}) {
  const { videoId } = await params
  const data = await loadVideo(videoId)
  if (!data) notFound()
  const { video, mentions } = data

  const videoProps: VideoPageVideo = {
    url: video.url,
    sourceKind: video.source_kind,
    // Strip the `yt:` prefix to get the bare YouTube video ID. Non-YouTube
    // sources currently aren't supported but we leave the field null-safe.
    videoId: video.source_kind === 'youtube' ? video.id.replace(/^yt:/, '') : null,
    title: video.title,
    thumbnailUrl: video.thumbnail_url,
    parsedAgo: relativeTime(video.created_at),
    creator: video.creators
      ? {
          slug: video.creators.slug,
          name: video.creators.name,
          platform: video.creators.platform,
          avatarUrl: video.creators.avatar_url,
        }
      : null,
  }

  const mentionProps: VideoPageMention[] = mentions
    .filter((m): m is MentionRow & { restaurants: NonNullable<MentionRow['restaurants']> } =>
      m.restaurants != null
    )
    .map((m) => ({
      id: m.id,
      dish: m.dish,
      quote: m.quote,
      timestampSec: m.timestamp_sec,
      restaurant: {
        id: m.restaurants.id,
        name: m.restaurants.name,
        nameLocal: m.restaurants.name_local,
        city: m.restaurants.city,
        country: m.restaurants.country,
        cuisine: m.restaurants.cuisine,
        priceLevel: m.restaurants.price_level,
        photoName: m.restaurants.photo_name,
        lat: m.restaurants.lat,
        lng: m.restaurants.lng,
      },
      dishes: m.dish_mentions.map((d) => ({
        id: d.id,
        name: d.name,
        quote: d.quote,
        timestampSec: d.timestamp_sec,
      })),
    }))

  return <VideoPageView video={videoProps} mentions={mentionProps} />
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const seconds = Math.floor((now - then) / 1000)
  if (seconds < 60) return 'just now'
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  return new Date(iso).toLocaleDateString()
}
