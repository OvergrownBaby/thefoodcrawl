import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { ingestUrl } from '@/lib/pipeline'
import { composeComment } from '@/lib/tracker/compose'
import { authorized } from '@/lib/tracker/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // extraction can take 30–90s

const MAX_ATTEMPTS = 3

/**
 * Drain ONE pending upload per invocation: extract → compose → 'ready'.
 *
 * One row per call bounds wall-clock under the serverless limit; a per-minute
 * cron drains any backlog. The poster box never touches a row until it reaches
 * 'ready', so this route is the whole Vercel-side pipeline (Stages 2–3).
 */
async function run(req: Request) {
  if (!authorized(req)) return new NextResponse('unauthorized', { status: 401 })
  const sb = supabaseAdmin()

  const { data: rows } = await sb
    .from('comment_queue')
    .select('id, youtube_video_id, video_id, attempts')
    .eq('status', 'pending_extract')
    .order('created_at', { ascending: true })
    .limit(1)

  const row = rows?.[0]
  if (!row) return NextResponse.json({ processed: 0 })

  await sb.from('comment_queue').update({ status: 'extracting', attempts: row.attempts + 1 }).eq('id', row.id)

  try {
    await ingestUrl(`https://www.youtube.com/watch?v=${row.youtube_video_id}`)
    const composed = await composeComment(row.video_id)

    if (!composed) {
      await sb.from('comment_queue').update({ status: 'skipped', restaurants_count: 0 }).eq('id', row.id)
      return NextResponse.json({ processed: 1, result: 'skipped', video: row.youtube_video_id })
    }

    await sb
      .from('comment_queue')
      .update({ status: 'ready', comment_text: composed.text, restaurants_count: composed.count })
      .eq('id', row.id)
    return NextResponse.json({ processed: 1, result: 'ready', video: row.youtube_video_id, count: composed.count })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Retry by dropping back to pending until we exhaust attempts.
    await sb
      .from('comment_queue')
      .update({ status: row.attempts + 1 >= MAX_ATTEMPTS ? 'failed' : 'pending_extract', error: message })
      .eq('id', row.id)
    return NextResponse.json({ processed: 1, result: 'error', error: message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  return run(req)
}
export async function POST(req: Request) {
  return run(req)
}
