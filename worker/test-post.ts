/**
 * One-shot manual post — validate the Playwright flow safely BEFORE running the
 * full loop. Point it at a throwaway video you control:
 *
 *   npx tsx worker/test-post.ts dQw4w9WgXcQ "test from foodcrawl 🗺️"
 *
 * Bypasses the queue + rate limits entirely. Exits 0 on success.
 */
import { launchContext, postComment } from './youtube'

async function main() {
  const videoId = process.argv[2]
  const text = process.argv[3]
  if (!videoId || !text) {
    console.error('usage: npx tsx worker/test-post.ts <videoId> "<comment text>"')
    process.exit(2)
  }
  const ctx = await launchContext()
  const res = await postComment(ctx, videoId, text)
  console.log(res)
  await ctx.browser()?.close()
  process.exit(res.ok ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
