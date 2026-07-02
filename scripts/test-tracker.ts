/**
 * End-to-end smoke test for the upload tracker (Stages 1–3), exercising the
 * real lib functions against the live DB — the same calls the webhook +
 * process routes make, minus the HTTP shell.
 *
 *   npx tsx scripts/test-tracker.ts [youtubeVideoId]
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { supabaseAdmin } from '../lib/supabase-server'
import { enqueueVideo } from '../lib/tracker/enqueue'
import { ingestUrl } from '../lib/pipeline'
import { composeComment } from '../lib/tracker/compose'

const VIDEO = process.argv[2] || '8frIFTQJg1c' // Mark Wiens — Borough Market
const CHANNEL_ID = 'UCyEd6QBSgat5kkC6svyjudA'
const CHANNEL_TITLE = 'Mark Wiens'

async function main() {
  const sb = supabaseAdmin()
  const videoId = `yt:${VIDEO}`

  console.log('0) register channel (subscribe route does this) …')
  await sb.from('tracked_channels').upsert(
    { channel_id: CHANNEL_ID, handle: '@MarkWiens', title: CHANNEL_TITLE, active: true },
    { onConflict: 'channel_id' }
  )

  console.log('1) enqueue upload (webhook/cron output) …')
  await enqueueVideo({ youtubeVideoId: VIDEO, channelId: CHANNEL_ID })
  const { data: queued } = await sb
    .from('comment_queue')
    .select('status, video_id')
    .eq('video_id', videoId)
    .single()
  console.log('   queue row:', queued)

  console.log('2) extract (process route → ingestUrl) … [30–90s]')
  const res = await ingestUrl(`https://www.youtube.com/watch?v=${VIDEO}`)
  console.log('   ', res)

  console.log('3) compose (toNamesAndTimesText) …')
  const composed = await composeComment(videoId)
  await sb
    .from('comment_queue')
    .update(
      composed
        ? { status: 'ready', comment_text: composed.text, restaurants_count: composed.count }
        : { status: 'skipped', restaurants_count: 0 }
    )
    .eq('video_id', videoId)

  const { data: final } = await sb
    .from('comment_queue')
    .select('status, restaurants_count')
    .eq('video_id', videoId)
    .single()

  console.log('\n========== COMMENT THAT WOULD BE POSTED ==========')
  console.log(composed?.text ?? '(no restaurants extracted)')
  console.log('==================================================')
  console.log('final queue row:', final)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('FAILED:', e)
    process.exit(1)
  })
