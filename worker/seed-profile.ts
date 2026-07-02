/**
 * Seed the persistent Chrome profile from an exported cookie set — ONCE. After
 * this the worker reuses the profile, and the session refreshes its own cookies
 * so it doesn't go stale. (Google blocks automated *login*, but importing an
 * existing session and using it is fine.)
 *
 *   npx tsx worker/seed-profile.ts worker/cookies.json
 *
 * cookies.json = a Cookie-Editor JSON export (array of {name,value,domain,…})
 * captured on youtube.com while logged in.
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import { config } from './config'

const ss = (v?: string): 'Strict' | 'Lax' | 'None' => {
  const s = (v || '').toLowerCase()
  if (s === 'no_restriction' || s === 'none') return 'None'
  if (s === 'strict') return 'Strict'
  return 'Lax'
}

async function main() {
  const inPath = process.argv[2] || 'worker/cookies.json'
  const raw = JSON.parse(fs.readFileSync(inPath, 'utf8'))
  const arr: any[] = Array.isArray(raw) ? raw : raw.cookies ?? []
  const cookies = arr.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path || '/',
    expires: typeof c.expirationDate === 'number' ? Math.floor(c.expirationDate) : c.expires ?? -1,
    httpOnly: !!c.httpOnly,
    secure: !!c.secure,
    sameSite: ss(c.sameSite),
  }))

  const ctx = await chromium.launchPersistentContext(config.profileDir, {
    headless: config.headless,
    channel: config.channel,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    viewport: { width: 1280, height: 900 },
  })
  await ctx.addCookies(cookies)
  const p = ctx.pages()[0] || (await ctx.newPage())
  await p.goto('https://www.youtube.com', { waitUntil: 'commit', timeout: 90000 })
  await p.waitForTimeout(4000)
  const li = await p.evaluate(() => (window as any).ytcfg?.get('LOGGED_IN'))
  console.log('LOGGED_IN', li)
  await ctx.close() // flush the session into the profile dir
  console.log(li === true ? 'SEEDED OK — profile ready' : 'SEED FAILED — cookies not valid/stale')
  process.exit(li === true ? 0 : 1)
}
main().catch((e) => { console.error(e); process.exit(1) })
