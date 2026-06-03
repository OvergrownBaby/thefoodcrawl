import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimestamp(sec: number | undefined): string | null {
  if (sec == null) return null
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function priceDots(level: 1 | 2 | 3 | 4 | undefined): string {
  if (!level) return ''
  return '$'.repeat(level)
}

/** Public page for a video's extraction results. Strips the `yt:` id prefix. */
export function videoSharePath(videoId: string): string {
  return `/v/${videoId.startsWith('yt:') ? videoId.slice(3) : videoId}`
}

// CJK ideographs + Japanese kana + Korean hangul.
const CJK_RE = /[㐀-䶿一-鿿぀-ヿ가-힯]/
const CJK_RE_G = /[㐀-䶿一-鿿぀-ヿ가-힯]/g

export function hasCJK(s: string | null | undefined): boolean {
  return !!s && CJK_RE.test(s)
}

/** Fraction of non-space characters that are CJK — how "native" a label reads. */
function cjkRatio(s: string): number {
  const len = s.replace(/\s/g, '').length
  if (!len) return 0
  return (s.match(CJK_RE_G)?.length ?? 0) / len
}

/**
 * Choose the primary vs. secondary label for a place. The more-native label
 * leads — for a Chinese place that's the native-script name, which is what it's
 * actually called. The romanized form becomes the secondary. Falls back to the
 * main name when there's no distinct local name.
 */
export function placeTitle(
  name: string,
  nameLocal?: string | null
): { primary: string; secondary: string | null } {
  if (!nameLocal || nameLocal === name) return { primary: name, secondary: null }
  // Lead with whichever label is more native-script.
  if (cjkRatio(nameLocal) > cjkRatio(name)) {
    return { primary: nameLocal, secondary: name }
  }
  return { primary: name, secondary: nameLocal }
}
