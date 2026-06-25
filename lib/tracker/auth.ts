/**
 * Bearer-token guard for the tracker's internal routes (process / cron /
 * subscribe). Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
 * automatically when CRON_SECRET is set. If the env var is unset we fail
 * OPEN in dev but CLOSED in production, so a misconfigured prod deploy can't
 * leave these endpoints world-callable.
 */
export function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  return req.headers.get('authorization') === `Bearer ${secret}`
}
