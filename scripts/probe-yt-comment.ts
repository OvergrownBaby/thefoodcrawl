/**
 * Feasibility probe for the Stage-4 Playwright poster (NO account, NO posting).
 * Checks: can we launch, load a watch page, reach the comment section, and
 * what does the composer/sign-in surface look like. Run on the box later WITH
 * a logged-in profile to test the real post.
 *
 *   npx tsx scripts/probe-yt-comment.ts [videoId]
 */
import { chromium } from 'playwright'

const VIDEO = process.argv[2] || '8frIFTQJg1c'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    locale: 'en-US',
  })
  const page = await ctx.newPage()

  const resp = await page.goto(`https://www.youtube.com/watch?v=${VIDEO}`, {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  })
  console.log('page status:', resp?.status())
  console.log('title:', await page.title())

  // try to dismiss a consent wall if present
  for (const sel of ['button:has-text("Accept all")', 'button:has-text("Reject all")', 'button[aria-label*="Accept"]']) {
    const b = page.locator(sel)
    if (await b.count()) {
      await b.first().click().catch(() => {})
      break
    }
  }

  // let the SPA hydrate, scroll to comments
  await page.waitForTimeout(4000)
  await page.evaluate(() => window.scrollTo(0, 1400))
  await page.waitForTimeout(4000)

  const composer = await page
    .locator('ytd-comment-simplebox-renderer, #placeholder-area, #simplebox-placeholder')
    .count()
  const commentsSection = await page.locator('ytd-comments, #comments').count()
  const signInCue = await page.locator('text=/sign in/i').count()
  const consentWall = await page.locator('text=/before you continue/i').count()

  console.log(JSON.stringify({ composer, commentsSection, signInCue, consentWall }, null, 2))
  await page.screenshot({ path: '/tmp/yt-probe.png', fullPage: false })
  console.log('screenshot: /tmp/yt-probe.png')
  await browser.close()
}

main().catch((e) => {
  console.error('PROBE_FAILED:', e instanceof Error ? e.message : e)
  process.exit(1)
})
