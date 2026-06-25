import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { fetchChannelFeed } from '@/lib/youtube/rss'
import { subscribeChannel, DEFAULT_LEASE_SECONDS } from '@/lib/youtube/websub'
import { enqueueVideo } from '@/lib/tracker/enqueue'
import { authorized } from '@/lib/tracker/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://thefoodcrawl.com').replace(/\/+$/, '')
const VERIFY = process.env.WEBSUB_VERIFY_TOKEN || ''
const RENEW_WINDOW_MS = 24 * 60 * 60 * 1000 // renew leases expiring within a day
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Maintenance tick: (1) renew WebSub leases before they lapse, and (2) poll
 * each channel's RSS feed as a reconciliation net for any pushes the hub
 * dropped. enqueueVideo is idempotent, so re-seeing known uploads is a no-op.
 */
async function run(req: Request) {
  if (!authorized(req)) return new NextResponse('unauthorized', { status: 401 })
  const sb = supabaseAdmin()
  const callback = `${SITE}/api/yt-webhook`
  const now = Date.now()

  const { data: channels } = await sb
    .from('tracked_channels')
    .select('channel_id, websub_lease_expires_at')
    .eq('active', true)

  let renewed = 0
  let enqueued = 0
  let polled = 0

  for (const c of channels ?? []) {
    // 1. Renew lease if missing or expiring soon.
    const exp = c.websub_lease_expires_at ? Date.parse(c.websub_lease_expires_at) : 0
    if (!exp || exp - now < RENEW_WINDOW_MS) {
      const r = await subscribeChannel(c.channel_id, { callback, verifyToken: VERIFY })
      if (r.ok) {
        await sb
          .from('tracked_channels')
          .update({ websub_lease_expires_at: new Date(now + DEFAULT_LEASE_SECONDS * 1000).toISOString() })
          .eq('channel_id', c.channel_id)
        renewed++
      }
    }

    // 2. RSS-backfill reconciliation.
    try {
      const entries = await fetchChannelFeed(c.channel_id)
      polled++
      for (const e of entries.slice(0, 5)) {
        const published = Date.parse(e.published || e.updated)
        if (Number.isFinite(published) && now - published > MAX_AGE_MS) continue
        await enqueueVideo({ youtubeVideoId: e.videoId, channelId: c.channel_id })
        enqueued++
      }
      if (entries[0]) {
        await sb
          .from('tracked_channels')
          .update({ last_seen_video_id: entries[0].videoId, last_polled_at: new Date(now).toISOString() })
          .eq('channel_id', c.channel_id)
      }
    } catch {
      // a single channel's feed hiccup shouldn't abort the whole tick
    }
  }

  return NextResponse.json({ channels: channels?.length ?? 0, renewed, polled, enqueued })
}

export async function GET(req: Request) {
  return run(req)
}
export async function POST(req: Request) {
  return run(req)
}
