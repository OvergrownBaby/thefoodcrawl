/**
 * One-off: fetch photos for restaurants that don't have one yet.
 * Uses places.searchText with the same field mask as the live geocoder.
 *
 *   npm run backfill:photos
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { supabaseAdmin } from '../lib/supabase-server'

async function main() {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY not set')
  const sb = supabaseAdmin()

  const { data: rows, error } = await sb
    .from('restaurants')
    .select('id, name, city, country, places_id, photo_name')
    .is('photo_name', null)

  if (error) throw error
  console.log(`${rows?.length ?? 0} restaurants without photo_name`)

  for (const r of rows ?? []) {
    const query = `${r.name}, ${r.city}`
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.photos',
      },
      body: JSON.stringify({
        textQuery: query,
        regionCode: r.country,
        maxResultCount: 1,
        includedType: 'restaurant',
        strictTypeFiltering: false,
      }),
    })
    if (!res.ok) {
      console.warn(`  ${r.name}: HTTP ${res.status}`)
      continue
    }
    const data = (await res.json()) as {
      places?: Array<{ id: string; photos?: Array<{ name: string }> }>
    }
    const photoName = data.places?.[0]?.photos?.[0]?.name
    if (!photoName) {
      console.log(`  ${r.name}: no photo`)
      continue
    }
    await sb.from('restaurants').update({ photo_name: photoName }).eq('id', r.id)
    console.log(`  ✓ ${r.name}: ${photoName.slice(0, 50)}...`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
