import { chromium, type BrowserContext, type Page } from 'playwright'
import fs from 'node:fs'
import { config } from './config'

/**
 * Launch a PERSISTENT Chromium context from the profile dir. The session lives
 * in the profile and refreshes its own cookies as the worker keeps using it —
 * so it doesn't go stale like a static cookie export. Seed it once with
 * `worker/seed-profile.ts`.
 *
 * On the headless box, run under `xvfb-run` with HEADLESS=false so YouTube sees
 * a real (headful) browser, which is far less bot-detectable.
 */
export async function launchContext(): Promise<BrowserContext> {
  if (!fs.existsSync(config.profileDir)) {
    throw new Error(`no session profile at ${config.profileDir} — run worker/seed-profile.ts first`)
  }
  return chromium.launchPersistentContext(config.profileDir, {
    headless: config.headless,
    channel: config.channel,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    viewport: { width: 1280, height: 900 },
  })
}

async function dismissConsent(page: Page): Promise<void> {
  for (const sel of ['button:has-text("Accept all")', 'button[aria-label*="Accept"]']) {
    const b = page.locator(sel)
    if (await b.count()) {
      await b.first().click().catch(() => {})
      return
    }
  }
}

/**
 * Post `text` as a top-level comment on the video. Returns a structured result;
 * NOT_LOGGED_IN means the session expired (re-run login-capture).
 *
 * Selectors are YouTube's current comment-composer ids; if YouTube reshuffles
 * its DOM these are the spots to adjust (the box test will confirm them live).
 */
export async function postComment(
  ctx: BrowserContext,
  videoId: string,
  text: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const page = await ctx.newPage()
  try {
    await page.goto(`https://www.youtube.com/watch?v=${videoId}`, {
      waitUntil: 'commit',
      timeout: 90000,
    })
    await dismissConsent(page)
    await page.waitForTimeout(3000)
    // step-scroll to trigger lazy-loaded comments (slow networks need this)
    for (const y of [400, 900, 1400]) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y)
      await page.waitForTimeout(2000)
    }

    if (await page.locator('text=/sign in to comment/i').count()) {
      return { ok: false, reason: 'NOT_LOGGED_IN' }
    }

    const placeholder = page.locator('#simplebox-placeholder, #placeholder-area').first()
    await placeholder.waitFor({ state: 'visible', timeout: 30000 })
    await placeholder.click({ timeout: 10000 })

    const input = page.locator('#contenteditable-root')
    await input.waitFor({ state: 'visible', timeout: 10000 })
    await input.click()
    await input.type(text, { delay: 25 }) // human-ish typing cadence
    await page.waitForTimeout(600)

    const submit = page.locator('#submit-button button, ytd-button-renderer#submit-button').first()
    await submit.click({ timeout: 10000 })
    await page.waitForTimeout(4000)

    // Confirm the composer cleared (a held/failed submit usually leaves the text).
    const remaining = (await input.innerText().catch(() => '')) || ''
    if (remaining.includes(text.slice(0, 15))) {
      return { ok: false, reason: 'submit-did-not-clear' }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) }
  } finally {
    await page.close().catch(() => {})
  }
}

/**
 * A token unique to our comments to scan for. Every composed comment ends with
 * the `thefoodcrawl` watermark (see lib/tracker/compose.ts) — matching that is
 * far more reliable than a restaurant-name slice, which can match another
 * viewer who mentioned the same place (a false "alive"). Falls back to the
 * first line if the watermark is ever absent.
 */
function needleFor(text: string): string {
  return text.includes('thefoodcrawl') ? 'thefoodcrawl' : (text.split('\n')[0] || '').slice(0, 30)
}

/**
 * Open the comments "Sort by" menu and switch to newest-first (YouTube labels
 * it "Show recent comments…"). Clicks run in-page because the paper-button and
 * menu items intermittently fail Playwright's actionability checks. Returns
 * false if the control never appeared.
 */
async function sortByNewest(page: Page): Promise<boolean> {
  const opened = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('yt-dropdown-menu tp-yt-paper-button#label')).find(
      (e) => /sort by/i.test(e.textContent || '')
    ) as HTMLElement | undefined
    if (!b) return false
    b.click()
    return true
  })
  if (!opened) return false
  await page.waitForTimeout(1500)
  const picked = await page.evaluate(() => {
    const items = Array.from(
      document.querySelectorAll('tp-yt-paper-listbox tp-yt-paper-item, a.yt-simple-endpoint')
    ) as HTMLElement[]
    const it =
      items.find((e) => /recent comments/i.test(e.textContent || '') && e.offsetParent !== null) ||
      items.find((e) => /recent comments/i.test(e.textContent || ''))
    if (!it) return false
    it.click()
    return true
  })
  if (picked) await page.waitForTimeout(4000)
  return picked
}

/**
 * Stage 5 — is our comment PUBLICLY visible on the video?
 *
 * Runs in a fresh, logged-OUT browser (a random viewer's view): the worker's
 * persistent profile is logged in and would see our own comment even if it were
 * held for review or shadow-removed — a false "alive". We also switch the sort
 * to newest-first so a fresh, low-engagement comment isn't buried under "Top
 * comments" and wrongly reported gone. That false-negative is exactly what was
 * silently flipping live comments to `removed`.
 *
 * Returns true (found), false (confidently absent under newest-first), or null
 * (inconclusive — nav failed or the sort control never rendered). On null the
 * caller must NOT record a result, so the row is retried next tick instead of
 * being mislabeled.
 */
export async function checkAlive(
  _ctx: BrowserContext,
  videoId: string,
  text: string
): Promise<boolean | null> {
  const needle = needleFor(text)
  if (!needle) return null
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  })
  try {
    const ctx = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'en-US',
      viewport: { width: 1280, height: 900 },
    })
    const page = await ctx.newPage()
    await page.goto(`https://www.youtube.com/watch?v=${videoId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    })
    await dismissConsent(page)
    await page.waitForTimeout(3000)
    // Scroll to render the comments header, then flip to newest-first.
    for (const y of [400, 800, 1200, 1600]) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y)
      await page.waitForTimeout(1800)
    }
    await page.locator('ytd-comments-header-renderer').first().waitFor({ timeout: 20000 }).catch(() => {})
    let sorted = false
    for (let attempt = 0; attempt < 3 && !sorted; attempt++) {
      sorted = await sortByNewest(page)
      if (!sorted) await page.waitForTimeout(1500)
    }
    if (!sorted) return null // couldn't get a reliable newest-first view — don't guess "removed"

    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => window.scrollBy(0, 1600))
      await page.waitForTimeout(1300)
      if (await page.locator('#content-text', { hasText: needle }).count()) return true
    }
    return false
  } catch {
    return null
  } finally {
    await browser.close().catch(() => {})
  }
}
