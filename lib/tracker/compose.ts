import { supabaseAdmin } from '@/lib/supabase-server'
import { formatTimestamp, placeTitle } from '@/lib/utils'

// Text-only watermark. NO url and NO bare domain — YouTube auto-links both,
// and link comments get held/filtered on moderated channels (verified live:
// the link version was held, this text-only version posted and stayed up).
const WATERMARK = '— Extracted with thefoodcrawl 🗺️'

type ComposeRow = {
  timestamp_sec: number | null
  restaurants: {
    name: string
    name_local: string | null
  }
}

/**
 * Stage 3 — build the comment for an already-extracted video: chronological
 * "Name — m:ss" lines + the text-only thefoodcrawl watermark. Returns null when
 * nothing was extracted.
 */
export async function composeComment(
  videoId: string
): Promise<{ text: string; count: number } | null> {
  const sb = supabaseAdmin()
  const { data } = await sb
    .from('mentions')
    .select('timestamp_sec, restaurants!inner ( name, name_local )')
    .eq('video_id', videoId)
    .returns<ComposeRow[]>()

  if (!data || data.length === 0) return null

  const lines = data
    .slice()
    .sort(
      (a, b) =>
        (a.timestamp_sec ?? Number.MAX_SAFE_INTEGER) - (b.timestamp_sec ?? Number.MAX_SAFE_INTEGER)
    )
    .map((m) => {
      const name = placeTitle(m.restaurants.name, m.restaurants.name_local).primary
      const ts = m.timestamp_sec != null ? formatTimestamp(m.timestamp_sec) : null
      return ts ? `${name} — ${ts}` : name
    })

  const text = `${lines.join('\n')}\n\n${WATERMARK}`
  return { text, count: lines.length }
}
