'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExtractEvent } from './stream-events'
import { getStoredKey } from './byok'

export type StreamStatus =
  | 'idle'
  | 'connecting'
  | 'watching'
  | 'extracting'
  | 'reconnecting'
  | 'complete'
  | 'failed'

export type RestaurantArrival = {
  clientId: string
  name: string
  nameLocal?: string
  city: string
  country: string
  cuisine?: string
  dish?: string
  quote: string
  timestampSec?: number
  // Populated after geocoded event
  id?: string
  lat?: number
  lng?: number
  photoName?: string
  priceLevel?: 1 | 2 | 3 | 4
  // Skipped state
  skipped?: boolean
  skipReason?: string
}

export type VideoMeta = {
  videoId: string
  url: string
  sourceKind: string
  title?: string
  thumbnailUrl?: string
  channelName?: string
}

export type StreamState = {
  status: StreamStatus
  video: VideoMeta | null
  message: string
  restaurants: RestaurantArrival[]
  startedAt: number | null
  finishedAt: number | null
  totalCount: number | null
  error: string | null
  result: {
    videoId: string
    restaurantsAdded: number
    mentionsAdded: number
    skippedNoGeocode: number
  } | null
}

const INITIAL: StreamState = {
  status: 'idle',
  video: null,
  message: '',
  restaurants: [],
  startedAt: null,
  finishedAt: null,
  totalCount: null,
  error: null,
  result: null,
}

// --- Persistence of the in-flight run, so a backgrounded/closed tab can
//     recover its progress when it comes back. ----------------------------
const ACTIVE_KEY = 'foodcrawl.active'
const ACTIVE_TTL_MS = 20 * 60 * 1000
const RECONNECT_MAX = 5

type ActiveRun = { url: string; videoId?: string | null; startedAt: number }

function loadActive(): ActiveRun | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(ACTIVE_KEY)
    if (!raw) return null
    const a = JSON.parse(raw) as ActiveRun
    if (!a?.url || !a.startedAt || Date.now() - a.startedAt > ACTIVE_TTL_MS) {
      window.localStorage.removeItem(ACTIVE_KEY)
      return null
    }
    return a
  } catch {
    return null
  }
}

function saveActive(a: ActiveRun): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(a))
  } catch {
    // ignore (private mode / quota)
  }
}

function clearActive(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(ACTIVE_KEY)
  } catch {
    // ignore
  }
}

/**
 * Hook: POSTs to /api/extract/stream, consumes the SSE events, and exposes
 * accumulated state for the LiveExtractionView component to render.
 *
 * Resilience: a dropped connection (backgrounded tab, flaky network) is not
 * treated as a hard failure. The hook persists the active run, transitions to
 * `reconnecting`, and recovers — first cheaply from saved DB results, then by
 * re-opening the stream. The same path auto-resumes after a full page reload.
 */
export function useStreamExtract() {
  const [state, setState] = useState<StreamState>(INITIAL)

  const abortRef = useRef<AbortController | null>(null)
  const runRef = useRef<{ url: string; geminiKey?: string | null; force?: boolean } | null>(null)
  const videoIdRef = useRef<string | null>(null)
  const terminalRef = useRef(false)
  const userStoppedRef = useRef(false)
  const reconnectsRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusRef = useRef<StreamStatus>('idle')
  const connectingRef = useRef(false)
  const recoverRef = useRef<() => void>(() => {})

  useEffect(() => {
    statusRef.current = state.status
  }, [state.status])

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    userStoppedRef.current = true
    abortRef.current?.abort()
    abortRef.current = null
    clearReconnectTimer()
    clearActive()
    reconnectsRef.current = 0
    setState(INITIAL)
  }, [clearReconnectTimer])

  // Apply one SSE event and book-keep refs (videoId, terminal, progress).
  const handleEvent = useCallback((e: ExtractEvent) => {
    if (e.type === 'video.loaded') {
      videoIdRef.current = e.data.videoId
      const a = loadActive()
      if (a) saveActive({ ...a, videoId: e.data.videoId })
    }
    // Forward progress resets the reconnect budget so a long run that drops
    // late isn't penalised by hiccups that happened near the start.
    if (e.type === 'extraction.found' || e.type === 'restaurant.geocoded') {
      reconnectsRef.current = 0
    }
    if (e.type === 'complete') {
      terminalRef.current = true
      reconnectsRef.current = 0
      clearActive()
    }
    if (e.type === 'error') {
      terminalRef.current = true
      clearActive()
    }
    setState((s) => applyEvent(s, e))
  }, [])

  // Pull the saved results for a video and present them as a completed run.
  const loadSavedResults = useCallback(async (videoId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/extract/results?videoId=${encodeURIComponent(videoId)}`)
      if (!res.ok) return false
      const body = (await res.json()) as {
        video: VideoMeta | null
        restaurants: RestaurantArrival[]
      }
      if (!body.restaurants || body.restaurants.length === 0) return false
      setState((s) => ({
        ...s,
        status: 'complete',
        video: body.video ?? s.video,
        restaurants: body.restaurants,
        totalCount: body.restaurants.length,
        finishedAt: Date.now(),
        error: null,
        result: {
          videoId,
          restaurantsAdded: 0,
          mentionsAdded: body.restaurants.length,
          skippedNoGeocode: 0,
        },
      }))
      reconnectsRef.current = 0
      clearActive()
      return true
    } catch {
      return false
    }
  }, [])

  // Open (or re-open) the SSE stream for the current run. On any non-terminal
  // end (network drop, backgrounded tab) it hands off to recover() exactly once
  // via the finally block. A real server rejection (rate limit, bad URL) is
  // terminal — reconnecting would just loop.
  const connect = useCallback(async () => {
    const run = runRef.current
    if (!run) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    terminalRef.current = false
    connectingRef.current = true
    let lost = false

    // Re-opening replays from the start, so clear the accumulator (keep video
    // meta + the original start time for a continuous elapsed clock).
    setState((s) => ({
      ...s,
      restaurants: [],
      totalCount: null,
      message: '',
      result: null,
      error: null,
      status: s.status === 'reconnecting' ? 'reconnecting' : 'connecting',
    }))

    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' }
      if (run.geminiKey) headers['x-gemini-key'] = run.geminiKey

      let res: Response
      try {
        res = await fetch('/api/extract/stream', {
          method: 'POST',
          headers,
          body: JSON.stringify({ url: run.url, force: run.force === true }),
          signal: controller.signal,
        })
      } catch {
        if (!controller.signal.aborted) lost = true
        return
      }

      if (!res.ok) {
        let errMsg = `Request failed (${res.status})`
        try {
          const body = (await res.json()) as { error?: string }
          if (body.error) errMsg = body.error
        } catch {}
        clearActive()
        setState((s) => ({ ...s, status: 'failed', error: errMsg, finishedAt: Date.now() }))
        return
      }

      if (!res.body) {
        lost = true
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const frames = buffer.split(/\n\n/)
          buffer = frames.pop() ?? ''

          for (const frame of frames) {
            if (!frame.trim()) continue
            let eventName = 'message'
            let dataText = ''
            for (const line of frame.split('\n')) {
              if (line.startsWith('event:')) eventName = line.slice(6).trim()
              else if (line.startsWith('data:')) dataText += line.slice(5).trim()
            }
            if (!dataText) continue
            let parsed: unknown
            try {
              parsed = JSON.parse(dataText)
            } catch {
              continue
            }
            handleEvent({ type: eventName, data: parsed } as unknown as ExtractEvent)
          }
        }
      } catch {
        if (!controller.signal.aborted) lost = true
        return
      }

      // Stream ended with no terminal event → the connection dropped.
      if (!terminalRef.current && !controller.signal.aborted && !userStoppedRef.current) {
        lost = true
      }
    } finally {
      connectingRef.current = false
      if (lost && !controller.signal.aborted && !userStoppedRef.current) {
        recoverRef.current()
      }
    }
  }, [handleEvent])

  // Recover a lost connection: try saved results first (cheap, no new job),
  // then fall back to re-opening the stream with bounded backoff.
  const recover = useCallback(async () => {
    if (userStoppedRef.current) return
    // A connect attempt is already running; it will hand back to recover() on
    // its own if it drops. Avoid opening a second, duplicate stream.
    if (connectingRef.current) return
    clearReconnectTimer()
    setState((s) =>
      s.status === 'complete' || s.status === 'failed' ? s : { ...s, status: 'reconnecting' }
    )

    if (videoIdRef.current) {
      const restored = await loadSavedResults(videoIdRef.current)
      if (restored) return
    }

    if (reconnectsRef.current >= RECONNECT_MAX) {
      clearActive()
      setState((s) => ({
        ...s,
        status: 'failed',
        error:
          'Connection lost. We kept trying to reconnect but couldn’t reach the extractor. Retry when you have a stable connection.',
        finishedAt: Date.now(),
      }))
      return
    }

    reconnectsRef.current += 1
    const delay = Math.min(8000, 1000 * 2 ** (reconnectsRef.current - 1))
    reconnectTimerRef.current = setTimeout(() => {
      if (!userStoppedRef.current) void connect()
    }, delay)
  }, [clearReconnectTimer, connect, loadSavedResults])

  useEffect(() => {
    recoverRef.current = () => void recover()
  }, [recover])

  const submit = useCallback(
    async (url: string, opts: { geminiKey?: string | null; force?: boolean } = {}) => {
      userStoppedRef.current = false
      clearReconnectTimer()
      abortRef.current?.abort()
      reconnectsRef.current = 0
      terminalRef.current = false
      videoIdRef.current = null
      runRef.current = { url, geminiKey: opts.geminiKey, force: opts.force }

      const startedAt = Date.now()
      saveActive({ url, startedAt })
      setState({ ...INITIAL, status: 'connecting', startedAt })
      await connect()
    },
    [clearReconnectTimer, connect]
  )

  // Resume an in-flight run captured before a reload / long backgrounding.
  const resume = useCallback(() => {
    const a = loadActive()
    if (!a) return
    userStoppedRef.current = false
    runRef.current = { url: a.url, geminiKey: getStoredKey(), force: false }
    videoIdRef.current = a.videoId ?? null
    reconnectsRef.current = 0
    terminalRef.current = false
    setState({ ...INITIAL, status: 'reconnecting', startedAt: a.startedAt })
    void recover()
  }, [recover])

  // On mount: if a recent run was left in flight, pick it back up.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (loadActive()) resume()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When the tab returns to the foreground or the network comes back, don't
  // sit on a backoff timer — recover immediately.
  useEffect(() => {
    function kick() {
      if (statusRef.current !== 'reconnecting') return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      clearReconnectTimer()
      void recover()
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') kick()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', kick)
    window.addEventListener('focus', kick)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', kick)
      window.removeEventListener('focus', kick)
    }
  }, [clearReconnectTimer, recover])

  // Clean up timers on unmount.
  useEffect(() => () => clearReconnectTimer(), [clearReconnectTimer])

  return { state, submit, reset }
}

function applyEvent(s: StreamState, e: ExtractEvent): StreamState {
  switch (e.type) {
    case 'video.loaded':
      return {
        ...s,
        status: 'watching',
        video: {
          videoId: e.data.videoId,
          url: e.data.url,
          sourceKind: e.data.sourceKind,
          title: e.data.title,
          thumbnailUrl: e.data.thumbnailUrl,
          channelName: e.data.channelName,
        },
      }
    case 'extraction.started':
      return { ...s, message: e.data.message }
    case 'extraction.found':
      return { ...s, status: 'extracting', totalCount: e.data.count }
    case 'restaurant.found':
      return {
        ...s,
        restaurants: [
          ...s.restaurants,
          {
            clientId: e.data.clientId,
            name: e.data.name,
            nameLocal: e.data.nameLocal,
            city: e.data.city,
            country: e.data.country,
            cuisine: e.data.cuisine,
            dish: e.data.dish,
            quote: e.data.quote,
            timestampSec: e.data.timestampSec,
          },
        ],
      }
    case 'restaurant.geocoded':
      return {
        ...s,
        restaurants: s.restaurants.map((r) =>
          r.clientId === e.data.clientId
            ? {
                ...r,
                id: e.data.id,
                lat: e.data.lat,
                lng: e.data.lng,
                photoName: e.data.photoName,
                priceLevel: e.data.priceLevel,
              }
            : r
        ),
      }
    case 'restaurant.skipped':
      return {
        ...s,
        restaurants: s.restaurants.map((r) =>
          r.clientId === e.data.clientId
            ? { ...r, skipped: true, skipReason: e.data.reason }
            : r
        ),
      }
    case 'complete':
      return {
        ...s,
        status: 'complete',
        finishedAt: Date.now(),
        result: e.data,
      }
    case 'error':
      return { ...s, status: 'failed', error: e.data.message, finishedAt: Date.now() }
    default:
      return s
  }
}
