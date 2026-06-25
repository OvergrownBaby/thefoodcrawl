/**
 * Tests the deterministic parts (no browser, no posting): the rate-limit gate
 * and the atomic queue claim / state-machine against the real DB. Inserts a
 * synthetic row, drives it claim→posting→posted, then cleans up.
 *
 *   npx tsx worker/selftest.ts
 */
import { canPost, withinPostingHours } from './rate-limit'
import { sb, claimReadyRow, markPosted } from './db'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`)
  console.log(`  ok: ${msg}`)
}

async function main() {
  console.log('1) rate-limit gate (pure):')
  const noon = new Date(2026, 5, 25, 12, 0, 0)
  assert(withinPostingHours(noon, 9, 22), 'noon is within 9–22')
  assert(!withinPostingHours(new Date(2026, 5, 25, 3, 0, 0), 9, 22), '3am is outside')
  const base = { now: noon, startHour: 9, endHour: 22, lastPostAt: null, minGapMs: 0 }
  assert(canPost({ ...base, recentPosts: [], maxPerHour: 2, maxPerDay: 10 }).ok, 'empty history → ok')
  assert(
    !canPost({ ...base, recentPosts: [noon.getTime() - 1000, noon.getTime() - 2000], maxPerHour: 2, maxPerDay: 10 }).ok,
    'two posts this hour → hourly cap'
  )
  assert(
    !canPost({ ...base, recentPosts: [], maxPerHour: 2, maxPerDay: 10, lastPostAt: noon.getTime() - 1000, minGapMs: 60_000 }).ok,
    'within min-gap → blocked'
  )

  console.log('2) atomic claim + state machine (real DB, synthetic row):')
  const vid = `yt:selftest-${Date.now()}`
  // Backdate created_at so this row is the OLDEST eligible → claimReadyRow takes
  // it, not a real queued row.
  await sb.from('comment_queue').insert({
    video_id: vid,
    youtube_video_id: 'selftest',
    status: 'ready',
    comment_text: 'selftest',
    restaurants_count: 5,
    created_at: '1970-01-01T00:00:00Z',
  })
  const claimed = await claimReadyRow(2)
  assert(!!claimed && claimed.video_id === vid, 'claimReadyRow claimed the synthetic (oldest) row')
  // CAS: a second claim attempt on the same row must return null (already 'posting').
  const { data: recas } = await sb
    .from('comment_queue')
    .update({ status: 'posting' })
    .eq('id', claimed!.id)
    .eq('status', 'ready')
    .select()
    .maybeSingle()
  assert(!recas, 'second CAS claim on the same row returns null (no double-claim)')

  await markPosted(claimed!.id, 'selftest-cid')
  const { data: done } = await sb.from('comment_queue').select('status, posted_at').eq('id', claimed!.id).single()
  assert(done?.status === 'posted' && !!done?.posted_at, "markPosted set 'posted' + posted_at")

  await sb.from('comment_queue').delete().eq('video_id', vid)
  console.log('  cleaned up synthetic row')

  console.log('\nALL SELFTESTS PASSED')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
