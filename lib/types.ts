export type SourceKind =
  | 'youtube'
  | 'tiktok'
  | 'reddit'
  | 'article'
  | 'maps_list'
  | 'text_paste'

export type Platform =
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'reddit'
  | 'web'

export type Creator = {
  slug: string
  name: string
  platform: Platform
  avatarUrl?: string
  url?: string
  videoCount: number
  restaurantCount: number
}

export type Source = {
  kind: SourceKind
  url: string
  title?: string
  thumbnailUrl?: string
  publishedAt?: string
  creator?: Creator
}

export type Restaurant = {
  id: string
  name: string
  nameLocal?: string
  city: string
  country: string
  lat: number
  lng: number
  cuisine?: string
  priceLevel?: 1 | 2 | 3 | 4
  placesId?: string
  photoName?: string
  mentionCount: number
  topCreators: Creator[]
}

export type Mention = {
  id: string
  restaurantId: string
  source: Source
  dish?: string
  quote: string
  timestampSec?: number
  anchor?: string
  createdAt: string
}

export type AtlasFilters = {
  creator?: string
  city?: string
  country?: string
  sourceKind?: SourceKind[]
}

export type JobStatus =
  | 'queued'
  | 'fetching'
  | 'extracting'
  | 'geocoding'
  | 'done'
  | 'failed'

export type ExtractJob = {
  id: string
  url: string
  status: JobStatus
  progress?: string
  result?: { restaurants: Restaurant[]; mentions: Mention[] }
  error?: string
}
