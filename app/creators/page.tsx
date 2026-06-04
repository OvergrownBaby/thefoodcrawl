import Link from 'next/link'
import { listCreators } from '@/lib/data'
import { CreatorAvatar } from '@/components/creator-avatar'
import type { Creator } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Creators',
  description: 'Every food creator whose picks have been mapped on Foodcrawl.',
  alternates: { canonical: '/creators' },
}

export default async function CreatorsPage() {
  const all = await listCreators()
  // Drop creators with no parsed restaurants — they add noise. Sort by reach.
  const creators = all
    .filter((c) => c.restaurantCount > 0)
    .sort((a, b) => b.restaurantCount - a.restaurantCount)

  return (
    <div className="flex-1">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-12 pb-6">
        <p className="fm-label">Roster</p>
        <h1 className="mt-2 fm-display text-3xl lg:text-4xl">Creators.</h1>
        <p className="mt-3 max-w-xl text-[var(--muted)] leading-relaxed">
          The food creators whose picks we&apos;ve watched, transcribed, and pinned. Each one
          links to their full map of recommendations.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-16">
        {creators.length === 0 ? (
          <p className="text-sm text-[var(--muted)] italic">No creators yet. Drop a link to seed.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {creators.map((c) => (
              <CreatorCard key={c.slug} creator={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function CreatorCard({ creator }: { creator: Creator }) {
  const cityCount = creator.cityCount ?? 0
  return (
    <Link
      href={`/c/${creator.slug}`}
      className="card-soft group block p-5 hover:border-[var(--accent)]/40 transition"
    >
      <div className="flex items-start gap-4">
        <span className="fm-avatar-tilt inline-flex shrink-0">
          <CreatorAvatar creator={creator} size="lg" link={false} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="fm-display text-lg leading-tight group-hover:text-[var(--accent)] transition truncate">
            {creator.name}
          </h2>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)] font-semibold">
            {creator.platform}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-dashed border-[var(--border)] flex items-baseline gap-3 text-[11px] uppercase tracking-wider text-[var(--muted)] font-medium">
        <span>
          <span className="fm-num text-[var(--foreground)] font-semibold text-sm">
            {creator.restaurantCount}
          </span>{' '}
          {creator.restaurantCount === 1 ? 'place' : 'places'}
        </span>
        <span className="opacity-50">·</span>
        <span>
          <span className="fm-num text-[var(--foreground)] font-semibold text-sm">
            {creator.videoCount}
          </span>{' '}
          {creator.videoCount === 1 ? 'video' : 'videos'}
        </span>
        {cityCount > 0 && (
          <>
            <span className="opacity-50">·</span>
            <span>
              <span className="fm-num text-[var(--foreground)] font-semibold text-sm">
                {cityCount}
              </span>{' '}
              {cityCount === 1 ? 'city' : 'cities'}
            </span>
          </>
        )}
      </div>
    </Link>
  )
}
