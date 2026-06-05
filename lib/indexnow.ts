// IndexNow — instantly notify Bing, Yandex (and partners) when pages change.
// Bing feeds Copilot + ChatGPT, so this also speeds up AI-search discovery.
// Protocol: host a {key}.txt file at the site root, then POST changed URLs.

export const INDEXNOW_KEY = '8f3c1a9e5d2b47f6a0c8e1b4d7906352'

const HOST = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thefoodcrawl.com')
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '')
const SITE = `https://${HOST}`

/** Submit URLs to IndexNow. Returns false on any failure (best-effort, never throws). */
export async function pingIndexNow(urls: string[]): Promise<boolean> {
  const urlList = Array.from(new Set(urls.filter(Boolean))).slice(0, 10000)
  if (!urlList.length) return false
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}
