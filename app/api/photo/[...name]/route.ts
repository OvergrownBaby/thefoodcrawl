import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Proxy for Google Places photos. The Places API requires a key in the request
 * header, so we can't link images directly to googleapis.com from the browser.
 * Instead, the browser hits /api/photo/places/X/photos/Y?w=400 and we fetch.
 *
 * We pin maxHeightPx server-side so callers can't abuse this for arbitrary
 * sizes (each fetch costs us a Places photo billing event).
 */
const ALLOWED_HEIGHTS = new Set([200, 400, 800, 1200])

export async function GET(
  req: Request,
  { params }: { params: Promise<{ name: string[] }> }
) {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) return NextResponse.json({ error: 'no api key' }, { status: 500 })

  const { name: nameParts } = await params
  const name = nameParts.join('/')
  if (!name.startsWith('places/')) {
    return NextResponse.json({ error: 'invalid photo name' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const requested = parseInt(searchParams.get('h') ?? '400', 10)
  const height = ALLOWED_HEIGHTS.has(requested) ? requested : 400

  const url = `https://places.googleapis.com/v1/${encodeURI(name)}/media?maxHeightPx=${height}`

  const upstream = await fetch(url, {
    headers: { 'X-Goog-Api-Key': key },
    signal: AbortSignal.timeout(15_000),
  })

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `places returned ${upstream.status}` },
      { status: upstream.status }
    )
  }

  const buf = await upstream.arrayBuffer()
  return new Response(buf, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
      // Aggressive edge cache — same photo for a year is fine, place IDs are stable
      'Cache-Control': 'public, max-age=31536000, immutable',
      'CDN-Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
