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
