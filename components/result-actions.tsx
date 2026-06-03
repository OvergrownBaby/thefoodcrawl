'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Download, Link2, List, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  copyToClipboard,
  downloadTextFile,
  exportSlug,
  toCsv,
  toDetailsText,
  toNamesText,
  type ExportItem,
} from '@/lib/export-extraction'

/**
 * Share + export controls for an extraction result. Shared by the live
 * extraction view (on complete) and the saved video page.
 *
 *  - Share: copies the public `/v/...` link (uses the native share sheet on
 *    devices that support it).
 *  - Copy: a small menu — names only, names + details, or download CSV.
 */
export function ResultActions({
  items,
  shareUrl,
  shareTitle,
  className,
  variant = 'full',
}: {
  items: ExportItem[]
  shareUrl?: string | null
  shareTitle?: string | null
  className?: string
  /** 'full' = labelled buttons (live view); 'compact' = icon buttons (page header). */
  variant?: 'full' | 'compact'
}) {
  const compact = variant === 'compact'
  const disabled = items.length === 0

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {shareUrl && <ShareButton url={shareUrl} title={shareTitle} compact={compact} />}
      <CopyMenu items={items} shareTitle={shareTitle} shareUrl={shareUrl} compact={compact} disabled={disabled} />
    </div>
  )
}

function ShareButton({
  url,
  title,
  compact,
}: {
  url: string
  title?: string | null
  compact: boolean
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  async function onShare() {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined
    if (nav && 'share' in nav && typeof nav.share === 'function') {
      try {
        await nav.share({ title: title ?? 'Foodcrawl', url })
        return
      } catch {
        // user cancelled or unsupported payload — fall back to copy
      }
    }
    const ok = await copyToClipboard(url)
    if (ok) {
      setCopied(true)
      timer.current = setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      className={cn(
        'fm-btn inline-flex items-center gap-1.5 rounded-xl font-semibold transition',
        compact
          ? 'px-2.5 py-2 text-xs border border-[var(--border)] hover:border-[var(--foreground)]'
          : 'px-4 py-2.5 text-sm bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
      )}
      aria-label="Share results"
    >
      {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      {!compact && <span>{copied ? 'Link copied' : 'Share'}</span>}
    </button>
  )
}

type CopyAction = 'names' | 'details' | 'csv'

function CopyMenu({
  items,
  shareTitle,
  shareUrl,
  compact,
  disabled,
}: {
  items: ExportItem[]
  shareTitle?: string | null
  shareUrl?: string | null
  compact: boolean
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState<CopyAction | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  // Close on outside click / escape.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function flash(action: CopyAction) {
    setDone(action)
    timer.current = setTimeout(() => setDone(null), 1600)
  }

  async function run(action: CopyAction) {
    if (action === 'csv') {
      downloadTextFile(`${exportSlug(shareTitle)}.csv`, toCsv(items), 'text/csv')
      flash('csv')
      setOpen(false)
      return
    }
    const text =
      action === 'names'
        ? toNamesText(items)
        : toDetailsText(items, { title: shareTitle ?? undefined, url: shareUrl ?? undefined })
    const ok = await copyToClipboard(text)
    if (ok) flash(action)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'fm-btn inline-flex items-center gap-1.5 rounded-xl font-semibold transition',
          compact
            ? 'px-2.5 py-2 text-xs border border-[var(--border)] hover:border-[var(--foreground)]'
            : 'px-4 py-2.5 text-sm border border-[var(--border)] hover:border-[var(--foreground)]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {done ? <Check className="w-4 h-4 text-[var(--accent)]" /> : <Copy className="w-4 h-4" />}
        {!compact && <span>{done ? 'Copied' : 'Copy list'}</span>}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-56 rounded-xl border border-[var(--border)] bg-white p-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.3)]"
        >
          <MenuItem icon={<List className="w-3.5 h-3.5" />} title="Copy names" hint="One per line" onClick={() => run('names')} />
          <MenuItem icon={<Copy className="w-3.5 h-3.5" />} title="Copy with details" hint="City, time & quote" onClick={() => run('details')} />
          <MenuItem icon={<Download className="w-3.5 h-3.5" />} title="Download CSV" hint="Spreadsheet" onClick={() => run('csv')} />
          {shareUrl && (
            <MenuItem
              icon={<Link2 className="w-3.5 h-3.5" />}
              title="Copy link"
              hint="Public page"
              onClick={async () => {
                const ok = await copyToClipboard(shareUrl)
                if (ok) flash('names')
                setOpen(false)
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--muted-soft)] transition"
    >
      <span className="text-[var(--muted)]">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium leading-tight">{title}</span>
        <span className="block text-[11px] text-[var(--muted)]">{hint}</span>
      </span>
    </button>
  )
}
