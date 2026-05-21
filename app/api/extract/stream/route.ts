import { supabaseAdmin } from '@/lib/supabase-server'
import { ingestUrlStream } from '@/lib/pipeline-stream'
import type { ExtractEvent } from '@/lib/stream-events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const PER_IP_PER_HOUR = 5
const PROJECT_PER_HOUR = 30
const PROJECT_PER_DAY = 200

export async function POST(req: Request) {
  let url: string
  let force = false
  try {
    const body = (await req.json()) as { url?: unknown; force?: unknown }
    if (typeof body.url !== 'string' || !body.url.trim()) {
      return Response.json({ error: 'url required' }, { status: 400 })
    }
    url = body.url.trim()
    force = body.force === true
  } catch {
    return Response.json({ error: 'invalid json body' }, { status: 400 })
  }

  const sb = supabaseAdmin()
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null

  // BYOK
  const userGeminiKey = req.headers.get('x-gemini-key')?.trim() || null
  const usingByok = !!userGeminiKey && /^AIza[A-Za-z0-9_-]{30,}$/.test(userGeminiKey)

  // Rate limiting — return plain HTTP 429 BEFORE opening the stream so the
  // client can switch UI to error state without needing to read SSE.
  if (!usingByok) {
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString()
    const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString()

    if (ip) {
      const { count: perIp } = await sb
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('user_ip', ip)
        .gte('created_at', oneHourAgo)
      if ((perIp ?? 0) >= PER_IP_PER_HOUR) {
        return Response.json(
          {
            error: `Rate limit: ${PER_IP_PER_HOUR} per hour per IP. Try again later, or use your own Gemini key to bypass.`,
          },
          { status: 429 }
        )
      }
    }

    const { count: hourly } = await sb
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo)
    if ((hourly ?? 0) >= PROJECT_PER_HOUR) {
      return Response.json(
        {
          error:
            'Foodcrawl is busy right now — too many submissions on the shared server key. Try again in a bit, or use your own Gemini key.',
        },
        { status: 429 }
      )
    }

    const { count: daily } = await sb
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo)
    if ((daily ?? 0) >= PROJECT_PER_DAY) {
      return Response.json(
        { error: 'Daily limit hit on the shared key. Submissions reopen tomorrow, or use your own Gemini key.' },
        { status: 429 }
      )
    }
  }

  // Job row — persisted so /api/jobs/[id] can be queried during a long run
  const { data: job } = await sb
    .from('jobs')
    .insert({ url, status: 'fetching', user_ip: ip })
    .select('id')
    .single()
  const jobId = job?.id ?? null

  // Build the SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: ExtractEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${e.type}\ndata: ${JSON.stringify(e.data)}\n\n`)
          )
        } catch {
          // controller closed (client disconnected)
        }
      }

      const abortController = new AbortController()
      req.signal.addEventListener('abort', () => abortController.abort())

      // SSE comment-line heartbeat every 15s. During the 60-90s "Gemini is
      // watching the video" phase the stream emits no real events; without a
      // heartbeat, Safari and some proxies (Vercel edge included) tear down the
      // idle connection, surfacing as a TypeError "Load failed" on the client.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`))
        } catch {
          // controller closed
        }
      }, 15_000)

      try {
        for await (const event of ingestUrlStream(url, {
          geminiKey: usingByok ? userGeminiKey! : undefined,
          signal: abortController.signal,
          force,
        })) {
          send(event)
          if (event.type === 'complete' || event.type === 'error') break
        }

        // Update job row to final state
        if (jobId) {
          await sb
            .from('jobs')
            .update({ status: 'done' })
            .eq('id', jobId)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const stack = err instanceof Error ? err.stack : undefined
        console.error(
          `[stream-route:uncaught] url=${url} jobId=${jobId} error=${msg}${stack ? '\n' + stack : ''}`
        )
        send({ type: 'error', data: { message: msg } })
        if (jobId) {
          await sb
            .from('jobs')
            .update({ status: 'failed', error: msg.slice(0, 1000) })
            .eq('id', jobId)
        }
      } finally {
        clearInterval(heartbeat)
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Vercel: disable buffering on edge/proxy layer
      'X-Accel-Buffering': 'no',
    },
  })
}
