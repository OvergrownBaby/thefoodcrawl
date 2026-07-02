/**
 * Pure rate-limit gate for the poster. No I/O — unit-testable.
 *
 * Caps posting to a human cadence: a daytime window, hourly + daily ceilings,
 * and a minimum gap since the last post (jitter is applied by the caller).
 */
export function withinPostingHours(now: Date, startHour: number, endHour: number): boolean {
  const h = now.getHours()
  return h >= startHour && h < endHour
}

export function canPost(opts: {
  now: Date
  recentPosts: number[] // epoch ms of recent successful posts (last 24h)
  maxPerHour: number
  maxPerDay: number
  startHour: number
  endHour: number
  lastPostAt: number | null
  minGapMs: number
}): { ok: boolean; reason?: string } {
  if (!withinPostingHours(opts.now, opts.startHour, opts.endHour)) {
    return { ok: false, reason: 'outside posting hours' }
  }
  const t = opts.now.getTime()
  const hourCount = opts.recentPosts.filter((p) => t - p < 3_600_000).length
  if (hourCount >= opts.maxPerHour) return { ok: false, reason: 'hourly cap reached' }
  const dayCount = opts.recentPosts.filter((p) => t - p < 86_400_000).length
  if (dayCount >= opts.maxPerDay) return { ok: false, reason: 'daily cap reached' }
  if (opts.lastPostAt != null && t - opts.lastPostAt < opts.minGapMs) {
    return { ok: false, reason: 'min gap not elapsed' }
  }
  return { ok: true }
}
