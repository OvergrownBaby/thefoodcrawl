'use client'

import { useEffect, useState } from 'react'
import { X, Key, Check, ExternalLink } from 'lucide-react'
import { getStoredKey, setStoredKey, clearStoredKey, looksValidGeminiKey } from '@/lib/byok'

export function ByokModal({
  open,
  onClose,
  onChange,
}: {
  open: boolean
  onClose: () => void
  onChange?: (hasKey: boolean) => void
}) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInput(getStoredKey() ?? '')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(null)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaved(false)
    }
  }, [open])

  if (!open) return null

  function save() {
    const trimmed = input.trim()
    if (!trimmed) {
      clearStoredKey()
      setSaved(false)
      onChange?.(false)
      onClose()
      return
    }
    if (!looksValidGeminiKey(trimmed)) {
      setError('That doesn’t look like a Gemini API key. They start with "AIza".')
      return
    }
    setStoredKey(trimmed)
    setSaved(true)
    onChange?.(true)
    setTimeout(onClose, 500)
  }

  function clear() {
    setInput('')
    clearStoredKey()
    onChange?.(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--card)] rounded-2xl shadow-2xl border border-[var(--border-strong)] w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="inline-flex items-center gap-2">
            <Key className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-bold text-lg">Use your own Gemini key</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--foreground)] -m-1 p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[var(--muted)] leading-relaxed mb-4">
          By default Crumb extracts video content with my Gemini key — which has a low
          daily limit so the bill stays reasonable. Paste your own key here and your
          submissions skip the rate limit and don&apos;t cost me anything. The key
          lives in your browser only, never on a server.
        </p>

        <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1.5">
          Gemini API Key
        </label>
        <input
          type="password"
          autoFocus
          spellCheck={false}
          autoComplete="off"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
          }}
          placeholder="AIza..."
          className="w-full bg-white border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] outline-none"
        />
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-3 text-xs text-[var(--muted)]">
          Free at{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--accent)] hover:underline inline-flex items-center gap-0.5"
          >
            aistudio.google.com/app/apikey
            <ExternalLink className="w-3 h-3" />
          </a>
          . Free-tier keys also work — they just have stricter rate limits.
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={save}
            className="fm-btn flex-1 inline-flex items-center justify-center gap-1.5 bg-[var(--accent)] text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-[var(--accent-hover)]"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved
              </>
            ) : input.trim() ? (
              'Save'
            ) : (
              'Use server default'
            )}
          </button>
          {getStoredKey() && input.trim() !== '' && (
            <button
              onClick={clear}
              className="fm-btn px-4 py-2.5 rounded-lg border border-[var(--border)] hover:border-[var(--foreground)] text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
