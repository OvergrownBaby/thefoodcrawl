import { chromium, type BrowserContext, type Page } from 'playwright'
import fs from 'node:fs'
import { config } from './config'

/**
 * Launch a Chromium context with the captured logged-in session.
 * On the headless box, run the worker under `xvfb-run` and keep HEADLESS=false
 * so YouTube sees a real (headful) browser, which is far less bot-detectable.
 */
export async function launchContext(): Promise<BrowserContext> {
  if (!fs.existsSync(config.stateFile)) {
    throw new Error(`no session file at ${config.stateFile} — run worker/login-capture.ts first`)
  }
  const browser = await chromium.launch({
    headless: config.headless,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  })
  return browser.newContext({
    storageState: config.stateFile,
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
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    })
    await dismissConsent(page)
    await page.waitForTimeout(2500)
    await page.evaluate(() => window.scrollTo(0, 700))
    await page.waitForTimeout(2500)

    if (await page.locator('text=/sign in to comment/i').count()) {
      return { ok: false, reason: 'NOT_LOGGED_IN' }
    }

    const placeholder = page.locator('#simplebox-placeholder, #placeholder-area').first()
    await placeholder.click({ timeout: 15000 })

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
 * Stage 5 — is our comment still on the video? Reloads and scans the comment
 * list for the first line of our text. No API key needed (reuses the browser).
 */
export async function checkAlive(ctx: BrowserContext, videoId: string, text: string): Promise<boolean> {
  const page = await ctx.newPage()
  try {
    await page.goto(`https://www.youtube.com/watch?v=${videoId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    })
    await dismissConsent(page)
    const needle = (text.split('\n')[0] || '').slice(0, 30)
    if (!needle) return false
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500))
      await page.waitForTimeout(1500)
      if (await page.locator('#content-text', { hasText: needle }).count()) return true
    }
    return false
  } catch {
    return false
  } finally {
    await page.close().catch(() => {})
  }
}
