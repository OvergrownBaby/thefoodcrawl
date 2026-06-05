import { NextResponse } from 'next/server'
import sitemap from '@/app/sitemap'
import { pingIndexNow, INDEXNOW_KEY } from '@/lib/indexnow'

export const runtime = 'nodejs'

// Guard with the IndexNow key so this can't be abused to spam search engines.
function authed(req: Request): boolean {
  return new URL(req.url).searchParams.get('key') === INDEXNOW_KEY
}

// GET /api/indexnow?key=...  — re-announce every sitemap URL (call after a deploy
// or on a cron; a deploy that adds pages IS a change worth pinging).
export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const entries = await sitemap()
  const urls = entries
    .map((e) => (typeof e.url === 'string' ? e.url : ''))
    .filter(Boolean)
  const ok = await pingIndexNow(urls)
  return NextResponse.json({ ok, submitted: urls.length })
}

// POST /api/indexnow?key=...  { urls: string[] } — submit specific changed URLs.
// (Drop a call to pingIndexNow([...]) wherever a new place/video is saved to make
//  this fully automatic once the extraction pipeline lands.)
export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  let urls: string[] = []
  try {
    const body = await req.json()
    if (Array.isArray(body?.urls)) {
      urls = body.urls.filter((u: unknown): u is string => typeof u === 'string')
    }
  } catch {
    // fall through to the 400 below
  }
  if (!urls.length) return NextResponse.json({ error: 'provide { urls: string[] }' }, { status: 400 })
  const ok = await pingIndexNow(urls)
  return NextResponse.json({ ok, submitted: urls.length })
}
