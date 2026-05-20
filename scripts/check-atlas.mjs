import { chromium } from 'playwright'

const url = process.argv[2] || 'https://thefoodcrawl.com/atlas'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

const consoleMsgs = []
page.on('console', (m) => consoleMsgs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => consoleMsgs.push(`[pageerror] ${e.message}`))
page.on('requestfailed', (r) => consoleMsgs.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`))

await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
// Give the map time to render pins
await page.waitForTimeout(3000)

// Capture the initial render
await page.screenshot({ path: '/tmp/atlas-initial.png', fullPage: false })

// Try hovering the first list item if it exists
const firstItem = await page.locator('aside ul li').first()
const exists = await firstItem.count()
if (exists > 0) {
  await firstItem.hover()
  await page.waitForTimeout(800) // let popover animate in
  await page.screenshot({ path: '/tmp/atlas-hover.png', fullPage: false })
}

// Count pins on the map
const pinCount = await page.locator('.fm-marker').count()

// Get computed bounding box of a few pins
const pinPositions = await page.locator('.fm-marker').evaluateAll((els) =>
  els.slice(0, 10).map((el) => {
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  })
)

console.log('---')
console.log('pinCount:', pinCount)
console.log('first 10 pin positions:', JSON.stringify(pinPositions))
console.log('---')
console.log('console messages:')
for (const m of consoleMsgs.slice(0, 30)) console.log(' ', m)

await browser.close()
