import { config as loadEnv } from 'dotenv'
// Local dev reads .env.local; the box reads worker/.env. Load both (box just lacks the first).
loadEnv({ path: '.env.local' })
loadEnv({ path: 'worker/.env' })

function str(k: string, fallback?: string): string {
  const v = process.env[k] ?? fallback
  if (v == null) throw new Error(`missing env ${k}`)
  return v
}
function int(k: string, d: number): number {
  const v = process.env[k]
  return v ? parseInt(v, 10) : d
}

export const config = {
  // Supabase (service key bypasses RLS). Accept either name so .env.local works locally.
  supabaseUrl: str('SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey: str('SUPABASE_SECRET_KEY'),

  // Logged-in YouTube session captured by login-capture.ts (Playwright storageState).
  stateFile: process.env.YT_STATE_FILE || 'worker/yt-state.json',

  // Posting policy
  minRestaurants: int('POST_MIN_RESTAURANTS', 2), // don't post thin 1-spot comments
  maxPerDay: int('POST_MAX_PER_DAY', 10),
  maxPerHour: int('POST_MAX_PER_HOUR', 2),
  startHour: int('POST_START_HOUR', 9), // box local time
  endHour: int('POST_END_HOUR', 22),
  minGapMin: int('POST_MIN_GAP_MIN', 20),
  maxGapMin: int('POST_MAX_GAP_MIN', 90),
  tickMin: int('TICK_MIN', 5),

  headless: process.env.HEADLESS === 'true', // false → run under xvfb (recommended)

  // Persistent Chrome profile (self-refreshing session). Seed once with seed-profile.ts.
  profileDir: process.env.YT_PROFILE_DIR || 'worker/yt-profile',
  // Set YT_CHANNEL=chrome to use system Google Chrome; unset → bundled chromium.
  channel: (process.env.YT_CHANNEL as 'chrome' | undefined) || undefined,
}
