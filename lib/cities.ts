import { supabaseAdmin } from './supabase-server'
import { slugify } from './place-url'

// Global city pages: "every restaurant mapped in {city}, across all creators".
// Eatlect only covers ~11 A-list creators; the per-city long tail is wide open,
// and these pages generate themselves from the DB as new videos are ingested.

export type CityRow = { city: string; country: string; count: number }

export function citySlug(city: string): string {
  return slugify(city)
}

export function cityPath(city: string): string {
  return `/city/${citySlug(city)}`
}

/** Distinct cities with restaurant counts, busiest first. Powers the sitemap
 *  and a future /city index. */
export async function listCities(): Promise<CityRow[]> {
  const sb = supabaseAdmin()
  const { data } = await sb.from('restaurants').select('city, country').limit(50000)
  const map = new Map<string, CityRow>()
  for (const row of (data ?? []) as Array<{ city: string | null; country: string | null }>) {
    if (!row.city) continue
    const cur = map.get(row.city)
    if (cur) cur.count++
    else map.set(row.city, { city: row.city, country: row.country ?? '', count: 1 })
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

/** Resolve a city slug back to its real name (slugs aren't reversible, so we
 *  match against the live list). Collisions resolve to the busiest city. */
export async function resolveCitySlug(slug: string): Promise<CityRow | null> {
  const cities = await listCities()
  return cities.find((c) => citySlug(c.city) === slug) ?? null
}
