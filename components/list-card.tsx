import Link from 'next/link'
import { photoUrl } from '@/lib/photo'
import type { CuratedList } from '@/lib/lists'

/**
 * A curated list = (creator × city). Shows actual restaurant names,
 * the source video title, and a hero photo so the card has body — not
 * just an empty "Hong Kong" label.
 */
export function ListCard({ list }: { list: CuratedList }) {
  const hero = photoUrl(list.restaurants[0]?.photoName ?? null, 800)
  const subtitle =
    list.videoCount === 1 && list.videoTitles[0]
      ? list.videoTitles[0]
      : list.videoCount > 1
        ? `From ${list.videoCount} videos`
        : `${list.count} ${list.count === 1 ? 'place' : 'places'}`

  return (
    <Link
      href={`/c/${list.creatorSlug}?city=${encodeURIComponent(list.city)}`}
      className="group block bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden hover:border-[var(--accent)]/40 hover:shadow-md transition flex flex-col"
    >
      {hero ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hero}
          alt={list.restaurants[0]?.name ?? list.city}
          className="w-full h-40 object-cover bg-[var(--muted-soft)]"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-40 bg-[var(--muted-soft)]" />
      )}

      <div className="p-4 flex-1 flex flex-col">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          {list.creatorName}&apos;s
        </div>
        <h3 className="mt-0.5 text-lg font-semibold text-[var(--foreground)] -tracking-[0.01em] leading-tight group-hover:text-[var(--accent)] transition">
          {list.city}
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)] line-clamp-1 italic">
          {subtitle}
        </p>

        <ul className="mt-3 space-y-1 text-sm text-[var(--foreground-soft)]">
          {list.restaurants.slice(0, 4).map((r, idx) => (
            <li key={r.id} className="flex items-baseline gap-2">
              <span className="text-[10px] text-[var(--muted)] fm-num shrink-0 w-3">
                {idx + 1}
              </span>
              <span className="truncate">{r.name}</span>
            </li>
          ))}
          {list.count > 4 && (
            <li className="text-xs text-[var(--muted)] pl-5">+ {list.count - 4} more</li>
          )}
        </ul>
      </div>
    </Link>
  )
}
