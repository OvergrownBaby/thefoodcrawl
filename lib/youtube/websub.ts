/**
 * YouTube WebSub (PubSubHubbub) subscription (Stage 1 — primary detection).
 *
 * We subscribe per channel; YouTube's hub then POSTs an Atom payload to our
 * callback the instant that channel uploads. Subscriptions lease for a few
 * days and must be renewed (the cron route does this).
 */

const HUB = 'https://pubsubhubbub.appspot.com/subscribe'

/** The hub topic for a channel (note the `/xml/` path — distinct from the RSS feed URL). */
export const topicFor = (channelId: string) =>
  `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`

export const DEFAULT_LEASE_SECONDS = 5 * 24 * 60 * 60 // 5 days

export async function subscribeChannel(
  channelId: string,
  opts: { callback: string; verifyToken: string; leaseSeconds?: number; mode?: 'subscribe' | 'unsubscribe' }
): Promise<{ ok: boolean; status: number; body?: string }> {
  const body = new URLSearchParams({
    'hub.callback': opts.callback,
    'hub.topic': topicFor(channelId),
    'hub.verify': 'async',
    'hub.mode': opts.mode ?? 'subscribe',
    'hub.verify_token': opts.verifyToken,
    'hub.lease_seconds': String(opts.leaseSeconds ?? DEFAULT_LEASE_SECONDS),
  })

  const res = await fetch(HUB, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  // Hub returns 202 Accepted on success (verification happens async via our callback).
  const ok = res.status === 202 || res.status === 204
  return { ok, status: res.status, body: ok ? undefined : await res.text().catch(() => undefined) }
}
