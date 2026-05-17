import { supabaseAdmin } from './supabase-server'
import { placesCacheKey } from './normalize'

export type GeocodeResult = {
  placesId: string
  name: string
  formattedAddress: string
  lat: number
  lng: number
  priceLevel?: 1 | 2 | 3 | 4
  /** Resource name of the first photo, e.g. "places/X/photos/Y" — use via /api/photo. */
  photoName?: string
}

/**
 * Google Places API (New) — Text Search.
 * Designed for business/POI lookup, not address-only.
 *
 * https://developers.google.com/maps/documentation/places/web-service/text-search
 */
export async function geocodeRestaurant(args: {
  name: string
  city: string
  country: string
}): Promise<GeocodeResult | null> {
  const cacheKey = placesCacheKey(args.name, args.city, args.country)
  const cached = await getCached(cacheKey)
  if (cached) return cached

  const fresh = await callPlaces(args)
  if (fresh) await putCache(cacheKey, fresh)
  else await putCache(cacheKey, null) // negative cache to avoid re-querying junk
  return fresh
}

async function callPlaces(args: {
  name: string
  city: string
  country: string
}): Promise<GeocodeResult | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY not set')

  const query = `${args.name}, ${args.city}`

  const res = await fetch(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        // Field mask: only request the fields we need (cheaper SKU)
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.priceLevel,places.types,places.photos',
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'en',
        regionCode: args.country,
        maxResultCount: 1,
        // Restrict to food-related types where possible
        includedType: 'restaurant',
        strictTypeFiltering: false,
      }),
      signal: AbortSignal.timeout(15_000),
    }
  )

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    console.warn(`Places API ${res.status} for "${query}": ${err.slice(0, 300)}`)
    return null
  }

  const data = (await res.json()) as {
    places?: Array<{
      id: string
      displayName?: { text: string }
      formattedAddress?: string
      location?: { latitude: number; longitude: number }
      priceLevel?:
        | 'PRICE_LEVEL_INEXPENSIVE'
        | 'PRICE_LEVEL_MODERATE'
        | 'PRICE_LEVEL_EXPENSIVE'
        | 'PRICE_LEVEL_VERY_EXPENSIVE'
        | 'PRICE_LEVEL_FREE'
        | 'PRICE_LEVEL_UNSPECIFIED'
      photos?: Array<{ name: string }>
    }>
  }

  const p = data.places?.[0]
  if (!p?.location || !p.id) return null

  const priceMap: Record<string, 1 | 2 | 3 | 4> = {
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  }

  return {
    placesId: p.id,
    name: p.displayName?.text ?? args.name,
    formattedAddress: p.formattedAddress ?? '',
    lat: p.location.latitude,
    lng: p.location.longitude,
    priceLevel: p.priceLevel ? priceMap[p.priceLevel] : undefined,
    photoName: p.photos?.[0]?.name,
  }
}

async function getCached(key: string): Promise<GeocodeResult | null> {
  const sb = supabaseAdmin()
  const { data } = await sb
    .from('places_cache')
    .select('*')
    .eq('query_key', key)
    .maybeSingle()
  if (!data) return null
  if (!data.places_id || data.lat == null || data.lng == null) return null
  return {
    placesId: data.places_id,
    name: data.name ?? '',
    formattedAddress: data.formatted_address ?? '',
    lat: data.lat,
    lng: data.lng,
    priceLevel: data.price_level ?? undefined,
    photoName: data.photo_name ?? undefined,
  }
}

async function putCache(key: string, result: GeocodeResult | null): Promise<void> {
  const sb = supabaseAdmin()
  await sb.from('places_cache').upsert({
    query_key: key,
    places_id: result?.placesId ?? null,
    name: result?.name ?? null,
    formatted_address: result?.formattedAddress ?? null,
    lat: result?.lat ?? null,
    lng: result?.lng ?? null,
    price_level: result?.priceLevel ?? null,
    photo_name: result?.photoName ?? null,
  })
}
