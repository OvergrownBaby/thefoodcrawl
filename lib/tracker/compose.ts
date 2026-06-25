import { supabaseAdmin } from '@/lib/supabase-server'
import { toNamesAndTimesText, type ExportItem } from '@/lib/export-extraction'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://thefoodcrawl.com').replace(/\/+$/, '')

type ComposeRow = {
  timestamp_sec: number | null
  quote: string | null
  restaurants: {
    name: string
    name_local: string | null
    city: string | null
    country: string | null
    cuisine: string | null
  }
}

/**
 * Stage 3 — build the comment for an already-extracted video.
 *
 * Reuses the site's own `toNamesAndTimesText` formatter (the "Copy names +
 * times" affordance), so the posted comment is byte-identical to what the UI
 * produces: "Name — m:ss" lines, chronological, with the Foodcrawl watermark
 * pointing at the video's map page. Returns null when nothing was extracted.
 */
export async function composeComment(
  videoId: string
): Promise<{ text: string; count: number } | null> {
  const sb = supabaseAdmin()
  const { data } = await sb
    .from('mentions')
    .select('timestamp_sec, quote, restaurants!inner ( name, name_local, city, country, cuisine )')
    .eq('video_id', videoId)
    .returns<ComposeRow[]>()

  if (!data || data.length === 0) return null

  const items: ExportItem[] = data
    .map((m) => ({
      name: m.restaurants.name,
      nameLocal: m.restaurants.name_local,
      city: m.restaurants.city,
      country: m.restaurants.country,
      cuisine: m.restaurants.cuisine,
      quote: m.quote,
      timestampSec: m.timestamp_sec,
    }))
    // chronological by appearance in the video; untimed entries sink to the end
    .sort((a, b) => (a.timestampSec ?? Number.MAX_SAFE_INTEGER) - (b.timestampSec ?? Number.MAX_SAFE_INTEGER))

  const bareId = videoId.replace(/^yt:/, '')
  const text = toNamesAndTimesText(items, { url: `${SITE}/v/${bareId}` })
  return { text, count: items.length }
}
