/**
 * Bring-your-own-key helpers.
 *
 * Stored client-side only (localStorage). The server never receives the
 * key except as the request header on a single extract call. We never
 * persist it server-side, never log it, never associate it with the user.
 */

const KEY = 'crumb.byok.gemini'

export function getStoredKey(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setStoredKey(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, key)
  } catch {
    // ignore (private mode etc.)
  }
}

export function clearStoredKey(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

/** Basic format check — Gemini keys start with AIza... */
export function looksValidGeminiKey(key: string): boolean {
  return /^AIza[A-Za-z0-9_-]{30,}$/.test(key.trim())
}
