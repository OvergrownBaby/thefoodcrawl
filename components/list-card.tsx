import Link from 'next/link'
import { photoUrl } from '@/lib/photo'
import type { CuratedList } from '@/lib/lists'
import { cn } from '@/lib/utils'

/**
 * A curated list = (creator × city). Shows actual restaurant names,
 * the source video title, and a hero photo. Featured variant fills a
 * 2x2 grid cell with a bigger photo + more restaurant rows visible.
 */
export function ListCard({
  list,
  featured = false,
}: {
  list: CuratedList
  featured?: boolean
}) {
  const hero = photoUrl(list.restaurants[0]?.photoName ?? null, featured ? 1200 : 400)
  const subtitle =
    list.videoCount === 1 && list.videoTitles[0]
      ? list.videoTitles[0]
      : list.videoCount > 1
        ? `From ${list.videoCount} videos`
        : `${list.count} ${list.count === 1 ? 'place' : 'places'}`
  const visible = featured ? 6 : 4

  return (
    <Link
      href={`/c/${list.creatorSlug}/${encodeURIComponent(list.city)}`}
      className={cn(
        'group block bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden hover:border-[var(--accent)]/40 hover:shadow-md transition flex flex-col h-full'
      )}
    >
      {hero ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hero}
          alt={list.restaurants[0]?.name ?? list.city}
          className={cn(
            'w-full object-cover bg-[var(--muted-soft)] fm-photo',
            featured ? 'h-72 sm:h-80' : 'h-40'
          )}
          loading="lazy"
        />
      ) : (
        <div className={cn('w-full bg-[var(--muted-soft)]', featured ? 'h-72' : 'h-40')} />
      )}

      <div className={cn('p-4 flex-1 flex flex-col', featured && 'p-6')}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          {list.creatorName}&apos;s
        </div>
        <h3
          className={cn(
            'fm-display mt-0.5 text-[var(--foreground)] leading-tight group-hover:text-[var(--accent)] transition',
            featured ? 'text-3xl sm:text-4xl' : 'text-xl'
          )}
        >
          {list.city}
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)] line-clamp-1 italic">
          {subtitle}
        </p>

        <ul className={cn('mt-3 space-y-1 text-sm text-[var(--foreground-soft)]', featured && 'mt-4 text-base')}>
          {list.restaurants.slice(0, visible).map((r, idx) => (
            <li key={r.id} className="flex items-baseline gap-2">
              <span className="text-[10px] text-[var(--muted)] fm-num shrink-0 w-3">
                {idx + 1}
              </span>
              <span className="truncate">{r.name}</span>
            </li>
          ))}
          {list.count > visible && (
            <li className="text-xs text-[var(--muted)] pl-5">+ {list.count - visible} more</li>
          )}
        </ul>
      </div>
    </Link>
  )
}
