import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { ingestUrl } from '@/lib/pipeline'

export const runtime = 'nodejs'
// Long-running: video extraction can take 30-90s
export const maxDuration = 300

// Rate limit guardrails — set generously enough for genuine use,
// tight enough to bound cost-griefing.
const PER_IP_PER_HOUR = 5
const PROJECT_PER_HOUR = 30
const PROJECT_PER_DAY = 200

export async function POST(req: Request) {
  let url: string
  try {
    const body = (await req.json()) as { url?: unknown }
    if (typeof body.url !== 'string' || !body.url.trim()) {
      return NextResponse.json({ error: 'url required' }, { status: 400 })
    }
    url = body.url.trim()
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 })
  }

  const sb = supabaseAdmin()
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null

  // BYOK — when the client provides their own Gemini key, they pay for the
  // expensive call directly. We can skip rate-limiting entirely.
  const userGeminiKey = req.headers.get('x-gemini-key')?.trim() || null
  const usingByok = !!userGeminiKey && /^AIza[A-Za-z0-9_-]{30,}$/.test(userGeminiKey)

  // Rate limiting — check before doing any expensive work (server key only)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  if (!usingByok && ip) {
    const { count: perIp } = await sb
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('user_ip', ip)
      .gte('created_at', oneHourAgo)
    if ((perIp ?? 0) >= PER_IP_PER_HOUR) {
      return NextResponse.json(
        { error: `Rate limit: ${PER_IP_PER_HOUR} submissions per hour. Try again later.` },
        { status: 429 }
      )
    }
  }

  if (!usingByok) {
    const { count: hourly } = await sb
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo)
    if ((hourly ?? 0) >= PROJECT_PER_HOUR) {
      return NextResponse.json(
        {
          error:
            'Crumb is busy right now — too many submissions on the shared server key in the last hour. Try again, or set your own Gemini key to skip the limit.',
        },
        { status: 429 }
      )
    }

    const { count: daily } = await sb
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo)
    if ((daily ?? 0) >= PROJECT_PER_DAY) {
      return NextResponse.json(
        {
          error:
            'Crumb hit its daily limit on the shared server key. Submissions reopen tomorrow — or set your own Gemini key to bypass it.',
        },
        { status: 429 }
      )
    }
  }

  // Create job row up front so the UI can show progress
  const { data: job, error: jobErr } = await sb
    .from('jobs')
    .insert({ url, status: 'fetching', user_ip: ip })
    .select('id')
    .single()

  if (jobErr || !job) {
    return NextResponse.json({ error: `failed to create job: ${jobErr?.message}` }, { status: 500 })
  }

  // Run synchronously for v1 — Vercel allows up to 300s, plenty for one video.
  // v1.5 we can move this to a worker queue.
  try {
    await sb.from('jobs').update({ status: 'extracting', progress: 'Watching content...' }).eq('id', job.id)

    const result = await ingestUrl(url, { geminiKey: usingByok ? userGeminiKey! : undefined })

    await sb
      .from('jobs')
      .update({
        status: 'done',
        progress: `${result.restaurantsAdded} restaurants, ${result.mentionsAdded} mentions`,
        result_video_id: result.videoId,
      })
      .eq('id', job.id)

    // Fetch the actual restaurants we just added for the response
    const { data: mentions } = await sb
      .from('mentions')
      .select('id, restaurant_id, dish, quote, timestamp_sec, restaurants(*)')
      .eq('video_id', result.videoId)

    return NextResponse.json({
      jobId: job.id,
      videoId: result.videoId,
      restaurantsAdded: result.restaurantsAdded,
      mentionsAdded: result.mentionsAdded,
      skippedNoGeocode: result.skippedNoGeocode,
      mentions: mentions ?? [],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await sb.from('jobs').update({ status: 'failed', error: msg.slice(0, 1000) }).eq('id', job.id)
    return NextResponse.json({ error: msg, jobId: job.id }, { status: 500 })
  }
}
