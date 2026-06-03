import { supabaseAdmin } from './supabase-server'

export type ActivityItem =
  | {
      kind: 'place'
      id: string
      name: string
      city: string | null
      country: string | null
      photoName: string | null
      at: string
    }
  | {
      kind: 'video'
      id: string
      pathSlug: string
      title: string | null
      creatorName: string | null
      placeCount: number
      at: string
    }

export type SiteStats = {
  places: number
  videos: number
  creators: number
  countries: number
}

/**
 * A merged recent-activity feed for the home ticker: newly geocoded places
 * interleaved with newly parsed videos, newest first.
 */
export async function getRecentActivity(limit = 24): Promise<ActivityItem[]> {
  const sb = supabaseAdmin()

  const [{ data: places }, { data: videos }] = await Promise.all([
    sb
      .from('restaurants')
      .select('id, name, city, country, photo_name, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    sb
      .from('videos')
      .select('id, title, created_at, creators ( name ), mentions ( id )')
      .order('created_at', { ascending: false })
      .limit(Math.ceil(limit / 2)),
  ])

  const placeItems: ActivityItem[] = (places ?? []).map((r) => ({
    kind: 'place',
    id: r.id as string,
    name: r.name as string,
    city: (r.city as string) ?? null,
    country: (r.country as string) ?? null,
    photoName: (r.photo_name as string) ?? null,
    at: r.created_at as string,
  }))

  type VideoRow = {
    id: string
    title: string | null
    created_at: string
    creators: { name: string } | null
    mentions: Array<{ id: string }>
  }
  const videoItems: ActivityItem[] = ((videos ?? []) as unknown as VideoRow[])
    .filter((v) => v.mentions.length > 0)
    .map((v) => ({
      kind: 'video',
      id: v.id,
      pathSlug: v.id.startsWith('yt:') ? v.id.slice(3) : v.id,
      title: v.title,
      creatorName: v.creators?.name ?? null,
      placeCount: v.mentions.length,
      at: v.created_at,
    }))

  return [...placeItems, ...videoItems]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, limit)
}

/** Distinct creator names, most-recently-active first — for tagline rotation. */
export async function getCreatorNames(limit = 12): Promise<string[]> {
  const sb = supabaseAdmin()
  const { data } = await sb
    .from('creators')
    .select('name, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []).map((c) => c.name as string).filter(Boolean)
}

/** "dish in City" phrases drawn from real mentions — for tagline rotation. */
export async function getDishCityPhrases(limit = 12): Promise<string[]> {
  const sb = supabaseAdmin()
  const { data } = await sb
    .from('mentions')
    .select('dish, restaurants!inner ( city )')
    .not('dish', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit * 3)

  type Row = { dish: string | null; restaurants: { city: string | null } | null }
  const seen = new Set<string>()
  const out: string[] = []
  for (const r of (data ?? []) as unknown as Row[]) {
    const dish = r.dish?.trim()
    const city = r.restaurants?.city?.trim()
    if (!dish || !city) continue
    const phrase = `${dish.toLowerCase()} in ${city}`
    if (seen.has(phrase)) continue
    seen.add(phrase)
    out.push(phrase)
    if (out.length >= limit) break
  }
  return out
}

export async function getSiteStats(): Promise<SiteStats> {
  const sb = supabaseAdmin()
  const [places, videos, creators, countryRows] = await Promise.all([
    sb.from('restaurants').select('id', { count: 'exact', head: true }),
    sb.from('videos').select('id', { count: 'exact', head: true }),
    sb.from('creators').select('slug', { count: 'exact', head: true }),
    sb.from('restaurants').select('country').limit(5000),
  ])

  const countries = new Set(
    (countryRows.data ?? []).map((r) => (r.country as string)?.trim()).filter(Boolean)
  )

  return {
    places: places.count ?? 0,
    videos: videos.count ?? 0,
    creators: creators.count ?? 0,
    countries: countries.size,
  }
}
