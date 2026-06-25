import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { parseAtom } from '@/lib/youtube/rss'
import { enqueueVideo } from '@/lib/tracker/enqueue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VERIFY = process.env.WEBSUB_VERIFY_TOKEN || ''
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000 // ignore pushes for older uploads (edits/backfill)

/**
 * WebSub verification handshake. When we (un)subscribe, the hub GETs this
 * callback with a challenge we must echo back verbatim to confirm intent.
 */
export async function GET(req: Request) {
  const u = new URL(req.url)
  const mode = u.searchParams.get('hub.mode')
  const challenge = u.searchParams.get('hub.challenge')
  const token = u.searchParams.get('hub.verify_token')

  if ((mode === 'subscribe' || mode === 'unsubscribe') && challenge) {
    if (VERIFY && token !== VERIFY) return new NextResponse('forbidden', { status: 403 })
    return new NextResponse(challenge, { status: 200, headers: { 'content-type': 'text/plain' } })
  }
  return new NextResponse('ok', { status: 200 })
}

/**
 * Upload push. The hub POSTs an Atom payload listing the new (or edited)
 * video. We enqueue fast and return 200 — extraction happens later in the
 * process route, so the hub never waits on our pipeline.
 */
export async function POST(req: Request) {
  const xml = await req.text()
  const entries = parseAtom(xml)
  const sb = supabaseAdmin()

  for (const e of entries) {
    const published = Date.parse(e.published || e.updated)
    if (Number.isFinite(published) && Date.now() - published > MAX_AGE_MS) continue

    await enqueueVideo({ youtubeVideoId: e.videoId, channelId: e.channelId || null })
    if (e.channelId) {
      await sb.from('tracked_channels').update({ last_seen_video_id: e.videoId }).eq('channel_id', e.channelId)
    }
  }

  return new NextResponse('ok', { status: 200 })
}
