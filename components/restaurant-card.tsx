import Link from 'next/link'
import type { Restaurant } from '@/lib/types'
import { CreatorAvatar } from './creator-avatar'
import { priceDots } from '@/lib/utils'
import { photoUrl } from '@/lib/photo'

export function RestaurantCard({
  restaurant,
  compact = false,
}: {
  restaurant: Restaurant
  compact?: boolean
}) {
  const photo = photoUrl(restaurant.photoName, 400)
  return (
    <Link
      href={`/p/${restaurant.id}`}
      className="card-soft group block overflow-hidden"
    >
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={restaurant.name}
          className="w-full h-32 object-cover bg-[var(--muted-soft)] fm-photo"
          loading="lazy"
        />
      )}
      <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="fm-display text-xl leading-tight group-hover:text-[var(--accent)] transition truncate">
            {restaurant.name}
          </h3>
          {restaurant.nameLocal && (
            <p className="text-sm text-[var(--muted)] truncate font-medium">
              {restaurant.nameLocal}
            </p>
          )}
        </div>
        {restaurant.priceLevel && (
          <span className="font-mono text-[11px] text-[var(--muted)] tracking-wide shrink-0 pt-1">
            {priceDots(restaurant.priceLevel)}
          </span>
        )}
      </div>

      {restaurant.cuisine && (
        <p className="mt-1.5 text-xs text-[var(--muted)] truncate">
          <span className="opacity-70">·</span> {restaurant.cuisine}
        </p>
      )}

      {!compact && (
        <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-dashed border-[var(--border)]">
          <span className="text-[11px] text-[var(--muted)] uppercase tracking-wider font-medium">
            {restaurant.city}
            <span className="mx-1.5 opacity-50">/</span>
            {restaurant.mentionCount} {restaurant.mentionCount === 1 ? 'mention' : 'mentions'}
          </span>
          <div className="flex -space-x-2">
            {restaurant.topCreators.slice(0, 3).map((c) => (
              <span key={c.slug} className="fm-avatar-tilt inline-flex">
                <CreatorAvatar creator={c} size="sm" link={false} />
              </span>
            ))}
          </div>
        </div>
      )}
      </div>
    </Link>
  )
}
