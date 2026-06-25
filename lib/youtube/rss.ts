/**
 * YouTube channel RSS feed (Stage 1 — reconciliation/backfill).
 *
 * The primary detection path is WebSub push (see lib/youtube/websub.ts); this
 * polled feed is the safety net for pushes the hub dropped. Same Atom format
 * as the WebSub payload, so `parseAtom` serves both.
 *
 * No API key, no quota. NOTE: the feed endpoint is reachable from US egress
 * (Vercel) but can be rejected from some VPN exit IPs — this is meant to run
 * server-side on the deployment, not from a dev laptop behind a VPN.
 */

export type FeedEntry = {
  videoId: string
  channelId: string
  title: string
  published: string
  updated: string
}

const feedUrl = (channelId: string) =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`

export async function fetchChannelFeed(channelId: string): Promise<FeedEntry[]> {
  const res = await fetch(feedUrl(channelId), {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; FoodcrawlBot/1.0; +https://thefoodcrawl.com)' },
    // feeds change at most a few times a day; let the platform cache briefly
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`yt feed ${channelId}: HTTP ${res.status}`)
  return parseAtom(await res.text())
}

const pick = (block: string, tag: string): string => {
  const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
  return m ? m[1].trim() : ''
}

/** Parse a YouTube Atom feed (or WebSub push body) into entries. */
export function parseAtom(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = []
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const block = m[1]
    const videoId = pick(block, 'yt:videoId')
    if (!videoId) continue
    entries.push({
      videoId,
      channelId: pick(block, 'yt:channelId'),
      title: pick(block, 'title'),
      published: pick(block, 'published'),
      updated: pick(block, 'updated'),
    })
  }
  return entries
}
