/**
 * Post the real queued comment for one video, once (manual validation of the
 * full Stage-4 flow). Marks the row posted/failed like the worker would.
 *
 *   HEADLESS=true npx tsx worker/run-once.ts <youtubeVideoId>
 */
import { launchContext, postComment } from './youtube'
import { sb, markPosted, markFailed } from './db'

async function main() {
  const vid = process.argv[2]
  if (!vid) {
    console.error('usage: npx tsx worker/run-once.ts <youtubeVideoId>')
    process.exit(2)
  }
  const { data: row } = await sb
    .from('comment_queue')
    .select('id, youtube_video_id, comment_text, status')
    .eq('youtube_video_id', vid)
    .maybeSingle()
  if (!row || !row.comment_text) {
    console.error('no ready comment for', vid)
    process.exit(1)
  }
  console.log(`posting on ${vid} (status ${row.status}):\n--- comment ---\n${row.comment_text}\n---------------`)

  const ctx = await launchContext()
  const res = await postComment(ctx, vid, row.comment_text)
  console.log('result:', JSON.stringify(res))
  if (res.ok) await markPosted(row.id, null)
  else await markFailed(row.id, res.reason, res.reason !== 'NOT_LOGGED_IN')
  await ctx.browser()?.close()
  process.exit(res.ok ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
