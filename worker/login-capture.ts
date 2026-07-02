/**
 * Capture a logged-in YouTube session → storageState JSON.
 *
 * Run this ON A MACHINE WITH A SCREEN (your laptop):
 *   npx tsx worker/login-capture.ts worker/yt-state.json
 * A browser opens; log into the Google account you'll post from, then press
 * ENTER here. Copy the resulting JSON to the box: scp worker/yt-state.json box:…
 *
 * (If Google challenges the session on the box's IP, do this over VNC on the box
 * instead so the cookies are minted from the box's own IP.)
 */
import { chromium } from 'playwright'
import readline from 'node:readline'

async function main() {
  const out = process.argv[2] || 'worker/yt-state.json'
  const browser = await chromium.launch({ headless: false })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto('https://www.youtube.com')

  console.log('\n>>> Log into your YouTube account in the opened window.')
  console.log('>>> Once you can see you are signed in, come back here and press ENTER.\n')
  await new Promise<void>((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question('', () => {
      rl.close()
      res()
    })
  })

  await ctx.storageState({ path: out })
  console.log(`saved session → ${out}`)
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
