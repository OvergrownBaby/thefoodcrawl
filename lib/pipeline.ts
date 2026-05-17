import { supabaseAdmin } from './supabase-server'
import { fetchUrl, type FetchedContent } from './fetchers'
import { extractRestaurants, type ExtractedRestaurant } from './extractor'
import { geocodeRestaurant } from './geocoder'
import { normalizeName, placesCacheKey } from './normalize'

export type PipelineResult = {
  videoId: string
  restaurantsAdded: number
  mentionsAdded: number
  skippedNoGeocode: number
}

/**
 * Full pipeline: URL → fetch → extract → geocode → upsert to Supabase.
 *
 * Idempotent: re-running on the same URL will not duplicate restaurants or
 * mentions (we dedup by (name_normalized, city, country) and (restaurant_id,
 * video_id) respectively).
 */
export async function ingestUrl(url: string): Promise<PipelineResult> {
  const sb = supabaseAdmin()

  // 1. Fetch
  const content = await fetchUrl(url)

  // 2. Persist or update the video row first so we have a stable video_id
  const videoId = videoIdFor(content)

  // Upsert creator if we can identify one (YouTube only for now via channel name)
  let creatorSlug: string | null = null
  if (content.kind === 'video_url' && content.channelName) {
    creatorSlug = await upsertCreator({
      name: content.channelName,
      platform: 'youtube',
      url: content.channelId ? `https://youtube.com/channel/${content.channelId}` : undefined,
    })
  }

  const { error: videoErr } = await sb.from('videos').upsert({
    id: videoId,
    url: content.url,
    source_kind: content.sourceKind,
    creator_slug: creatorSlug,
    title: 'title' in content ? content.title : undefined,
    thumbnail_url: 'thumbnailUrl' in content ? content.thumbnailUrl : undefined,
    published_at: 'publishedAt' in content ? content.publishedAt : undefined,
    raw_transcript: content.kind === 'text' ? content.text.slice(0, 200_000) : null,
  })
  if (videoErr) throw new Error(`videos upsert: ${videoErr.message}`)

  // 3. Extract
  const extracted = await extractRestaurants(content)
  if (extracted.length === 0) {
    return { videoId, restaurantsAdded: 0, mentionsAdded: 0, skippedNoGeocode: 0 }
  }

  // 4. Geocode + upsert each restaurant + mention
  let restaurantsAdded = 0
  let mentionsAdded = 0
  let skippedNoGeocode = 0

  for (const r of extracted) {
    const geo = await geocodeRestaurant({ name: r.name, city: r.city, country: r.country })
    if (!geo) {
      skippedNoGeocode++
      continue
    }

    const nameNorm = normalizeName(r.name)
    const upsertPayload = {
      name: r.name,
      name_local: r.nameLocal ?? null,
      name_normalized: nameNorm,
      city: r.city,
      country: r.country,
      lat: geo.lat,
      lng: geo.lng,
      cuisine: r.cuisine ?? null,
      price_level: r.priceLevel ?? geo.priceLevel ?? null,
      places_id: geo.placesId,
      photo_name: geo.photoName ?? null,
    }

    const { data: restaurantRow, error: rErr } = await sb
      .from('restaurants')
      .upsert(upsertPayload, { onConflict: 'name_normalized,city,country' })
      .select('id')
      .single()

    if (rErr || !restaurantRow) {
      console.warn(`restaurant upsert failed for ${r.name}:`, rErr?.message)
      continue
    }
    restaurantsAdded++

    const { error: mErr } = await sb
      .from('mentions')
      .upsert(
        {
          restaurant_id: restaurantRow.id,
          video_id: videoId,
          dish: r.dish ?? null,
          quote: r.quote,
          timestamp_sec: r.timestampSec ?? null,
        },
        { onConflict: 'restaurant_id,video_id' }
      )

    if (!mErr) mentionsAdded++

    // Suppress unused-var lint
    void placesCacheKey
  }

  return { videoId, restaurantsAdded, mentionsAdded, skippedNoGeocode }
}

function videoIdFor(content: FetchedContent): string {
  if (content.kind === 'video_url') return `yt:${content.videoId}`
  // Hash for non-video sources so we get stable IDs without DB round-trips
  return `${content.sourceKind}:${hashUrl(content.url)}`
}

function hashUrl(url: string): string {
  let h = 0
  for (let i = 0; i < url.length; i++) {
    h = (h << 5) - h + url.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36)
}

async function upsertCreator(args: {
  name: string
  platform: 'youtube' | 'tiktok' | 'instagram' | 'reddit' | 'web'
  url?: string
}): Promise<string> {
  const sb = supabaseAdmin()
  const slug = args.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  await sb
    .from('creators')
    .upsert(
      {
        slug,
        name: args.name,
        platform: args.platform,
        url: args.url ?? null,
      },
      { onConflict: 'slug', ignoreDuplicates: false }
    )

  return slug
}

// Re-export so route handlers can also queue without ingest right now (deferred to v1.5)
export type { ExtractedRestaurant }
