'use client'

import { useEffect, useState } from 'react'
import { Loader2, Sparkles, Link as LinkIcon, Key } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ByokModal } from './byok-modal'
import { LiveExtractionView } from './live-extraction-view'
import { getStoredKey } from '@/lib/byok'
import { useStreamExtract } from '@/lib/use-stream-extract'

const PRESETS: Array<{ label: string; url: string }> = [
  {
    label: 'Mark Wiens · HK typhoon crab',
    url: 'https://www.youtube.com/watch?v=z-iAddtjM7A',
  },
  {
    label: 'Blondie · Shenzhen',
    url: 'https://www.youtube.com/watch?v=U8VGHShDols',
  },
  {
    label: 'Mark Wiens · Texas BBQ',
    url: 'https://www.youtube.com/watch?v=3n227UzYczY',
  },
]

export function SubmitForm({
  showPresets = false,
}: {
  showPresets?: boolean
} = {}) {
  const [url, setUrl] = useState('')
  const [keyModalOpen, setKeyModalOpen] = useState(false)
  const [hasUserKey, setHasUserKey] = useState(false)
  const { state, submit, reset } = useStreamExtract()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasUserKey(!!getStoredKey())
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    submit(url.trim(), { geminiKey: getStoredKey() })
  }

  function handleReset() {
    reset()
    setUrl('')
  }

  function handleForceRefresh() {
    const target = state.video?.url
    if (!target) return
    submit(target, { geminiKey: getStoredKey(), force: true })
  }

  const busy = state.status !== 'idle' && state.status !== 'complete' && state.status !== 'failed'
  const showLive = state.status !== 'idle'

  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
        <label
          htmlFor="url"
          className="block text-sm font-medium text-[var(--muted)] mb-2"
        >
          Paste a link
        </label>
        <div className="flex items-center gap-2 bg-white border border-[var(--border)] rounded-2xl pl-4 pr-2 py-2 focus-within:ring-2 focus-within:ring-[var(--accent)]/30 focus-within:border-[var(--accent)] transition">
          <LinkIcon className="w-4 h-4 text-[var(--muted)] shrink-0" />
          <input
            id="url"
            type="url"
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=…  (YouTube only for now)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm py-1.5"
          />
          <button
            type="submit"
            disabled={!url.trim() || busy}
            className={cn(
              'fm-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm',
              !url.trim() || busy
                ? 'bg-[var(--muted-soft)] text-[var(--muted)] cursor-not-allowed'
                : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
            )}
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Working…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Extract
              </>
            )}
          </button>
        </div>

        {showPresets && state.status === 'idle' && (
          <div className="mt-3 flex items-center flex-wrap gap-2">
            <span className="text-[11px] text-[var(--muted)] uppercase tracking-wider font-medium">
              try:
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.url}
                type="button"
                onClick={() => setUrl(p.url)}
                className="fm-btn px-2.5 py-1 rounded-full bg-[var(--muted-soft)] hover:bg-[var(--background-elev)] border border-[var(--border)] hover:border-[var(--accent)]/40 text-xs text-[var(--foreground-soft)] hover:text-[var(--foreground)] transition"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <span className="truncate">
            YouTube only · 1–3 min per video · 5 free/hr on the shared key
          </span>
          <button
            type="button"
            onClick={() => setKeyModalOpen(true)}
            className={cn(
              'shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md transition',
              hasUserKey
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20 hover:ring-[var(--accent)]/40'
                : 'hover:text-[var(--foreground)] hover:bg-[var(--muted-soft)]'
            )}
          >
            <Key className="w-3 h-3" />
            {hasUserKey ? 'using your key' : 'use your own key'}
          </button>
        </div>
        </form>

        <ByokModal
          open={keyModalOpen}
          onClose={() => setKeyModalOpen(false)}
          onChange={setHasUserKey}
        />
      </div>

      {showLive && (
        <div className="mt-6">
          <LiveExtractionView
            state={state}
            onReset={handleReset}
            onForceRefresh={handleForceRefresh}
            onOpenKeyModal={() => setKeyModalOpen(true)}
            hasUserKey={hasUserKey}
          />
        </div>
      )}
    </div>
  )
}
