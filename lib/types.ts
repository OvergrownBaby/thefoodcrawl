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

export type RestaurantVideo = {
  id: string
  url: string
  sourceKind: SourceKind
  title?: string
  thumbnailUrl?: string
  channelName?: string
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
  /** Most recent source video for this restaurant — used by atlas list hover preview. */
  primaryVideo?: RestaurantVideo
}

export type DishMention = {
  id: string
  name: string
  quote: string
  timestampSec?: number
}

export type Mention = {
  id: string
  restaurantId: string
  source: Source
  /** Legacy single dish — use `dishes` instead. */
  dish?: string
  quote: string
  timestampSec?: number
  anchor?: string
  createdAt: string
  dishes: DishMention[]
}

export type AtlasFilters = {
  creator?: string
  city?: string
  country?: string
  sourceKind?: SourceKind[]
}

