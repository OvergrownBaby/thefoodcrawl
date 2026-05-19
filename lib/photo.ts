/**
 * Build the proxied URL for a Google Places photo.
 * Pass to <img src> or background-image.
 */
export function photoUrl(photoName: string | undefined | null, height: 200 | 400 | 800 | 1200 = 400): string | null {
  if (!photoName) return null
  return `/api/photo/${photoName}?h=${height}`
}
