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

const SITE_URL = 'https://thefoodcrawl.com'
const BRAND = 'Extracted with Foodcrawl'

/** Attribution mark appended to the end of every export / share. */
export function exportMark(url?: string | null): string {
  return `— ${BRAND} · ${url || SITE_URL}`
}

/** Link with the brand mark below it — for the Share button / "Copy link". */
export function shareLinkText(url: string): string {
  return `${url}\n\n— ${BRAND}`
}

/** Append the attribution mark as a footer, separated by a blank line. */
function withMark(body: string, url?: string | null): string {
  return `${body}\n\n${exportMark(url)}`
}

/** One restaurant name per line. The simplest copy-paste. */
export function toNamesText(items: ExportItem[], opts: { url?: string | null } = {}): string {
  return withMark(items.map((r) => r.name).join('\n'), opts.url)
}

/** "Name — m:ss" per line. Name only when there's no timestamp. */
export function toNamesAndTimesText(items: ExportItem[], opts: { url?: string | null } = {}): string {
  const body = items
    .map((r) => {
      const ts = r.timestampSec != null ? formatTimestamp(r.timestampSec) : null
      return ts ? `${r.name} — ${ts}` : r.name
    })
    .join('\n')
  return withMark(body, opts.url)
}

/** Human-readable, numbered list with city, cuisine, timestamp and quote. */
export function toDetailsText(items: ExportItem[], opts: { title?: string; url?: string | null } = {}): string {
  const lines: string[] = []
  if (opts.title) lines.push(opts.title, '')

  items.forEach((r, i) => {
    const local = r.nameLocal ? ` (${r.nameLocal})` : ''
    const meta = [r.cuisine, r.city].filter(Boolean).join(' · ')
    lines.push(`${i + 1}. ${r.name}${local}${meta ? ` — ${meta}` : ''}`)
    const ts = r.timestampSec != null ? formatTimestamp(r.timestampSec) : null
    if (r.quote) lines.push(`   ${ts ? `[${ts}] ` : ''}"${r.quote.trim()}"`)
    else if (ts) lines.push(`   [${ts}]`)
  })
  return withMark(lines.join('\n'), opts.url)
}

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(items: ExportItem[], opts: { url?: string | null } = {}): string {
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
  return [header.join(','), ...rows, '', csvCell(exportMark(opts.url))].join('\n')
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
