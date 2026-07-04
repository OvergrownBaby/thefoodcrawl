import { config } from './config'
import { launchContext, postComment, checkAlive } from './youtube'
import {
  claimReadyRow,
  markPosted,
  markFailed,
  recentPostTimes,
  lastPostTime,
  skipThin,
  dueForSurvival,
  recordSurvival,
} from './db'
import { canPost } from './rate-limit'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const randMin = (a: number, b: number) => (a + Math.floor(Math.random() * (b - a))) * 60_000

/**
 * Stage 4 + 5 worker. Persistent loop (pm2): on each tick it runs due survival
 * checks, then — if the rate gate allows — claims one `ready` comment and posts
 * it, then sleeps a randomized gap. The queue is the only coupling to Vercel.
 */
async function main() {
  console.log(`[poster] starting · headless=${config.headless} · caps=${config.maxPerHour}/h ${config.maxPerDay}/d`)
  const ctx = await launchContext()

  for (;;) {
    try {
      await skipThin(config.minRestaurants)

      // Stage 5: survival checks for anything posted >1h ago.
      for (const row of await dueForSurvival()) {
        const alive = await checkAlive(ctx, row.youtube_video_id, row.comment_text)
        if (alive === null) {
          console.log(`[survival] ${row.youtube_video_id} inconclusive — will retry next tick`)
          continue
        }
        await recordSurvival(row.id, alive)
        console.log(`[survival] ${row.youtube_video_id} alive=${alive}`)
      }

      // Stage 4: post one if the gate allows.
      const gate = canPost({
        now: new Date(),
        recentPosts: await recentPostTimes(),
        maxPerHour: config.maxPerHour,
        maxPerDay: config.maxPerDay,
        startHour: config.startHour,
        endHour: config.endHour,
        lastPostAt: await lastPostTime(),
        minGapMs: config.minGapMin * 60_000,
      })

      if (gate.ok) {
        const row = await claimReadyRow(config.minRestaurants)
        if (row) {
          console.log(`[post] ${row.youtube_video_id} (${row.restaurants_count} spots)`)
          const res = await postComment(ctx, row.youtube_video_id, row.comment_text)
          if (res.ok) {
            await markPosted(row.id, null)
            console.log(`[post] OK ${row.youtube_video_id}`)
          } else {
            // session-expired shouldn't burn the row; everything else can retry.
            await markFailed(row.id, res.reason, res.reason !== 'NOT_LOGGED_IN')
            console.log(`[post] FAIL ${row.youtube_video_id}: ${res.reason}`)
          }
          await sleep(randMin(config.minGapMin, config.maxGapMin)) // jitter between posts
          continue
        }
        console.log('[post] no eligible ready rows')
      } else {
        console.log(`[gate] holding: ${gate.reason}`)
      }
    } catch (e) {
      console.error('[loop] error', e)
    }
    await sleep(config.tickMin * 60_000)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
