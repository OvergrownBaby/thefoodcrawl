import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { subscribeChannel, DEFAULT_LEASE_SECONDS } from '@/lib/youtube/websub'
import { authorized } from '@/lib/tracker/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://thefoodcrawl.com').replace(/\/+$/, '')
const VERIFY = process.env.WEBSUB_VERIFY_TOKEN || ''

/**
 * Register a channel to track and open its WebSub subscription.
 * Admin-only (CRON_SECRET bearer).
 *
 *   curl -X POST $SITE/api/tracker/subscribe \
 *     -H "authorization: Bearer $CRON_SECRET" \
 *     -d '{"channelId":"UCyEd6QBSgat5kkC6svyjudA","handle":"@MarkWiens","title":"Mark Wiens"}'
 */
export async function POST(req: Request) {
  if (!authorized(req)) return new NextResponse('unauthorized', { status: 401 })

  let body: { channelId?: unknown; handle?: unknown; title?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const channelId = typeof body.channelId === 'string' ? body.channelId.trim() : ''
  if (!/^UC[A-Za-z0-9_-]{22}$/.test(channelId)) {
    return NextResponse.json({ error: 'channelId must be a YouTube UC… id' }, { status: 400 })
  }

  const sb = supabaseAdmin()
  await sb.from('tracked_channels').upsert(
    {
      channel_id: channelId,
      handle: typeof body.handle === 'string' ? body.handle : null,
      title: typeof body.title === 'string' ? body.title : null,
      active: true,
    },
    { onConflict: 'channel_id' }
  )

  const sub = await subscribeChannel(channelId, { callback: `${SITE}/api/yt-webhook`, verifyToken: VERIFY })
  if (sub.ok) {
    await sb
      .from('tracked_channels')
      .update({ websub_lease_expires_at: new Date(Date.now() + DEFAULT_LEASE_SECONDS * 1000).toISOString() })
      .eq('channel_id', channelId)
  }

  return NextResponse.json({ channelId, subscribed: sub.ok, hubStatus: sub.status, hubError: sub.body }, { status: sub.ok ? 200 : 502 })
}
