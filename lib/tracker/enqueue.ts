import { supabaseAdmin } from '@/lib/supabase-server'

/**
 * Idempotently enqueue a detected upload for extraction + comment composition.
 *
 * Safe to call from both the WebSub webhook and the RSS-backfill cron — the
 * unique constraint on comment_queue.video_id collapses duplicates, so
 * re-discovery of an already-known upload is a no-op.
 */
export async function enqueueVideo(opts: {
  youtubeVideoId: string
  channelId: string | null
}): Promise<void> {
  const sb = supabaseAdmin()
  await sb.from('comment_queue').upsert(
    {
      video_id: `yt:${opts.youtubeVideoId}`,
      youtube_video_id: opts.youtubeVideoId,
      channel_id: opts.channelId,
      status: 'pending_extract',
    },
    { onConflict: 'video_id', ignoreDuplicates: true }
  )
}
