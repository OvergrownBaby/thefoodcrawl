import type { Restaurant, Creator, Mention } from './types'
import { placePath } from './place-url'

// Structured data (schema.org / JSON-LD). This is the GEO lever: it lets
// Google show rich results AND lets answer engines (ChatGPT, Perplexity,
// Gemini) cite Foodcrawl as a clean, machine-readable source for
// "restaurants {creator} recommends in {city}".

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thefoodcrawl.com').replace(/\/+$/, '')
const PRICE: Record<number, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }

function abs(path?: string | null): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//.test(path)) return path
  return SITE + (path.startsWith('/') ? path : '/' + path)
}

function img(photoName?: string | null): string | undefined {
  return photoName ? abs(`/api/photo/${photoName}?h=800`) : undefined
}

type RestaurantLike = {
  id: string
  name: string
  nameLocal?: string | null
  city: string
  country: string
  lat?: number | null
  lng?: number | null
  cuisine?: string | null
  priceLevel?: number | null
  photoName?: string | null
}

type CreatorLike = { slug: string; name: string; url?: string | null; avatarUrl?: string | null }

function restaurantNode(r: RestaurantLike): Record<string, unknown> {
  const node: Record<string, unknown> = {
    '@type': 'Restaurant',
    '@id': `${SITE}${placePath(r)}#restaurant`,
    name: r.name,
    url: `${SITE}${placePath(r)}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: r.city,
      addressCountry: r.country,
    },
  }
  if (r.nameLocal) node.alternateName = r.nameLocal
  if (r.cuisine) node.servesCuisine = r.cuisine
  if (r.priceLevel && PRICE[r.priceLevel]) node.priceRange = PRICE[r.priceLevel]
  if (typeof r.lat === 'number' && typeof r.lng === 'number') {
    node.geo = { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lng }
  }
  const image = img(r.photoName)
  if (image) node.image = image
  return node
}

function personNode(c: CreatorLike): Record<string, unknown> {
  const node: Record<string, unknown> = {
    '@type': 'Person',
    '@id': `${SITE}/c/${c.slug}#person`,
    name: c.name,
    url: `${SITE}/c/${c.slug}`,
  }
  if (c.url) node.sameAs = c.url
  if (c.avatarUrl) node.image = c.avatarUrl
  return node
}

function itemList(restaurants: RestaurantLike[], name: string): Record<string, unknown> {
  return {
    '@type': 'ItemList',
    name,
    numberOfItems: restaurants.length,
    itemListElement: restaurants.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: restaurantNode(r),
    })),
  }
}

function graph(nodes: object[]): object {
  return { '@context': 'https://schema.org', '@graph': nodes }
}

// ---- Page-level builders ----

/** /p/[place] — one Restaurant + the videos that recommend it. */
export function placeJsonLd(restaurant: Restaurant, mentions: Mention[]): object {
  const node = restaurantNode(restaurant)
  const seen = new Set<string>()
  const videos: object[] = []
  for (const m of mentions) {
    const s = m.source
    if (!s?.url || seen.has(s.url)) continue
    seen.add(s.url)
    const v: Record<string, unknown> = { '@type': 'VideoObject', name: s.title ?? 'Food video', url: s.url }
    if (s.thumbnailUrl) v.thumbnailUrl = s.thumbnailUrl
    if (s.publishedAt) v.uploadDate = s.publishedAt
    if (s.creator) v.author = personNode(s.creator)
    videos.push(v)
  }
  if (videos.length) node.subjectOf = videos
  return graph([node])
}

/** /c/[creator] — the creator (Person) + a list of all their restaurants. */
export function creatorJsonLd(creator: Creator, restaurants: Restaurant[]): object {
  return graph([personNode(creator), itemList(restaurants, `Restaurants recommended by ${creator.name}`)])
}

/** /c/[creator]/[city] — the goldmine: "restaurants {creator} recommends in {city}". */
export function creatorCityJsonLd(creator: Creator, city: string, restaurants: Restaurant[]): object {
  return graph([itemList(restaurants, `Restaurants in ${city} recommended by ${creator.name}`)])
}

/** /v/[videoId] — the VideoObject + the restaurants it features. Fed raw rows. */
export function videoJsonLd(args: {
  videoUrl: string
  title?: string | null
  thumbnailUrl?: string | null
  uploadDate?: string | null
  youtubeId?: string | null
  creator?: CreatorLike | null
  restaurants: RestaurantLike[]
}): object {
  const v: Record<string, unknown> = { '@type': 'VideoObject', name: args.title ?? 'Food video', url: args.videoUrl }
  if (args.thumbnailUrl) v.thumbnailUrl = args.thumbnailUrl
  if (args.uploadDate) v.uploadDate = args.uploadDate
  if (args.youtubeId) v.embedUrl = `https://www.youtube.com/embed/${args.youtubeId}`
  if (args.creator) v.author = personNode(args.creator)
  return graph([v, itemList(args.restaurants, `Restaurants featured in ${args.title ?? 'this video'}`)])
}
