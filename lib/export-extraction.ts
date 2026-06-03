/**
 * Plaintext / CSV export helpers for an extraction result.
 *
 * Shared by the live extraction view and the saved video page so both
 * surfaces offer the same "copy the list" affordances.
 */

import { formatTimestamp } from './utils'

export type ExportItem = {
  name: string
  nameLocal?: string | null
  city?: string | null
  country?: string | null
  cuisine?: string | null
  dish?: string | null
  quote?: string | null
  timestampSec?: number | null
}

/** One restaurant name per line. The simplest copy-paste. */
export function toNamesText(items: ExportItem[]): string {
  return items.map((r) => r.name).join('\n')
}

/** Human-readable, numbered list with city, cuisine, timestamp and quote. */
export function toDetailsText(items: ExportItem[], opts: { title?: string; url?: string } = {}): string {
  const lines: string[] = []
  if (opts.title) lines.push(opts.title)
  if (opts.url) lines.push(opts.url)
  if (lines.length) lines.push('')

  items.forEach((r, i) => {
    const local = r.nameLocal ? ` (${r.nameLocal})` : ''
    const meta = [r.cuisine, r.city].filter(Boolean).join(' · ')
    lines.push(`${i + 1}. ${r.name}${local}${meta ? ` — ${meta}` : ''}`)
    const ts = r.timestampSec != null ? formatTimestamp(r.timestampSec) : null
    if (r.quote) lines.push(`   ${ts ? `[${ts}] ` : ''}"${r.quote.trim()}"`)
    else if (ts) lines.push(`   [${ts}]`)
  })
  return lines.join('\n')
}

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(items: ExportItem[]): string {
  const header = ['name', 'name_local', 'city', 'country', 'cuisine', 'dish', 'timestamp', 'quote']
  const rows = items.map((r) =>
    [
      r.name,
      r.nameLocal ?? '',
      r.city ?? '',
      r.country ?? '',
      r.cuisine ?? '',
      r.dish ?? '',
      r.timestampSec != null ? formatTimestamp(r.timestampSec) ?? '' : '',
      r.quote ?? '',
    ]
      .map(csvCell)
      .join(',')
  )
  return [header.join(','), ...rows].join('\n')
}

/** Copy text to the clipboard with a legacy fallback. Returns success. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/** Trigger a client-side file download of `text`. */
export function downloadTextFile(filename: string, text: string, mime = 'text/plain'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** A filesystem-safe slug for export filenames. */
export function exportSlug(title: string | null | undefined, fallback = 'foodcrawl'): string {
  const base = (title ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return base.slice(0, 60) || fallback
}
