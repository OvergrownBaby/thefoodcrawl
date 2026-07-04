import { createClient } from '@supabase/supabase-js'
import WS from 'ws'
import { config } from './config'

// Node < 22 lacks a global WebSocket, which @supabase/supabase-js's RealtimeClient
// constructs eagerly (even though this worker only uses REST). Provide one so
// createClient() doesn't throw. Guarded: a no-op on Node 22+/Vercel where it exists.
if (!(globalThis as any).WebSocket) (globalThis as any).WebSocket = WS

export const sb = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: { persistSession: false },
})

export type ReadyRow = {
  id: string
  video_id: string
  youtube_video_id: string
  comment_text: string
  restaurants_count: number
}

/**
 * Atomically claim ONE eligible `ready` row, flipping it to `posting`.
 * The `.eq('status','ready')` guard on the UPDATE is a compare-and-swap, so two
 * concurrent workers can't grab the same row (fixes the non-atomic claim the
 * process route has).
 */
export async function claimReadyRow(minRestaurants: number): Promise<ReadyRow | null> {
  const { data: candidates } = await sb
    .from('comment_queue')
    .select('id, video_id, youtube_video_id, comment_text, restaurants_count')
    .eq('status', 'ready')
    .gte('restaurants_count', minRestaurants)
    .order('created_at', { ascending: true })
    .limit(5)

  for (const c of candidates ?? []) {
    const { data: claimed } = await sb
      .from('comment_queue')
      .update({ status: 'posting' })
      .eq('id', c.id)
      .eq('status', 'ready')
      .select('id, video_id, youtube_video_id, comment_text, restaurants_count')
      .maybeSingle()
    if (claimed) return claimed as ReadyRow
  }
  return null
}

export async function markPosted(id: string, commentId: string | null): Promise<void> {
  await sb
    .from('comment_queue')
    .update({ status: 'posted', posted_at: new Date().toISOString(), posted_comment_id: commentId })
    .eq('id', id)
}

export async function markFailed(id: string, error: string, retry: boolean): Promise<void> {
  await sb.from('comment_queue').update({ status: retry ? 'ready' : 'failed', error }).eq('id', id)
}

/** Epoch-ms of successful posts in the last 24h (for the rate gate). */
export async function recentPostTimes(): Promise<number[]> {
  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { data } = await sb
    .from('comment_queue')
    .select('posted_at')
    .eq('status', 'posted')
    .gte('posted_at', since)
  return (data ?? []).map((r) => Date.parse(r.posted_at as string)).filter(Number.isFinite)
}

export async function lastPostTime(): Promise<number | null> {
  const { data } = await sb
    .from('comment_queue')
    .select('posted_at')
    .not('posted_at', 'is', null)
    .order('posted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.posted_at ? Date.parse(data.posted_at as string) : null
}

/** Retire thin `ready` rows (below threshold) so they don't linger. */
export async function skipThin(minRestaurants: number): Promise<void> {
  await sb
    .from('comment_queue')
    .update({ status: 'skipped' })
    .eq('status', 'ready')
    .lt('restaurants_count', minRestaurants)
}

/** Posted rows older than an hour with no survival check yet (Stage 5). */
export async function dueForSurvival(): Promise<
  Array<{ id: string; youtube_video_id: string; comment_text: string }>
> {
  const cutoff = new Date(Date.now() - 3_600_000).toISOString()
  const { data } = await sb
    .from('comment_queue')
    .select('id, youtube_video_id, comment_text')
    .eq('status', 'posted')
    .is('checked_at', null)
    .lt('posted_at', cutoff)
    .limit(5)
  return data ?? []
}

export async function recordSurvival(id: string, alive: boolean): Promise<void> {
  await sb
    .from('comment_queue')
    .update({ checked_at: new Date().toISOString(), status: alive ? 'posted' : 'removed' })
    .eq('id', id)
}
