// Decorative SEO slugs for place URLs, Stack-Overflow style: `/p/{name-city}-{uuid}`.
//
// The trailing 36-char UUID is the real lookup key; the leading slug is purely
// decorative (keywords for search engines + AI crawlers). This lets us put the
// restaurant name and city — the strongest on-page ranking signal — into the URL
// without a DB migration, and WITHOUT breaking old links: a bare `/p/{uuid}` URL
// still resolves because `placeIdFromParam` extracts the trailing UUID (and falls
// back to the whole param when there's no decoration).

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents (combining diacritical marks)
    .replace(/['‘’]/g, '') // drop straight/curly apostrophes: "Pinkerton's" -> "pinkertons"
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Build the canonical, keyword-rich path for a place. Degrades to `/p/{id}`
 *  when name/city are missing so it's always safe to call. */
export function placePath(r: { id: string; name?: string | null; city?: string | null }): string {
  const slug = slugify([r.name, r.city].filter(Boolean).join(' '))
  return slug ? `/p/${slug}-${r.id}` : `/p/${r.id}`
}

/** Recover the canonical UUID from a (possibly decorated) `/p` route param.
 *  `pinkertons-barbecue-houston-9a96...` -> `9a96...`; a bare UUID returns itself. */
export function placeIdFromParam(param: string): string {
  const decoded = decodeURIComponent(param)
  const m = decoded.match(UUID_RE)
  return m ? m[0] : decoded
}
