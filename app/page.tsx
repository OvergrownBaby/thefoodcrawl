import Link from 'next/link'
import { SubmitForm } from '@/components/submit-form'
import { RotatingText } from '@/components/rotating-text'
import { ListCard } from '@/components/list-card'
import { GithubIcon } from '@/components/icons'
import { getCuratedLists } from '@/lib/lists'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const lists = await getCuratedLists(12)

  return (
    <div className="flex-1">
      {/* Hero — composer-first, single voice */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 pt-16 pb-12 lg:pt-24 lg:pb-16">
        <h1 className="fm-display text-3xl sm:text-5xl lg:text-6xl leading-[1.05] sm:leading-[1.02]">
          Restaurants from <RotatingText /> you <em>actually</em> trust.
        </h1>
        <p className="mt-5 text-[var(--muted)] max-w-xl leading-relaxed">
          Paste a YouTube video, a Reddit thread, an Eater list. We watch or read
          it, find every restaurant, pin them on a map — with the exact line and
          timestamp it was said.
        </p>

        <div className="mt-8">
          <SubmitForm />
        </div>

        <div className="mt-5 flex items-center gap-x-3 gap-y-1 text-[11px] text-[var(--muted)] flex-wrap">
          <a
            href="https://github.com/OvergrownBaby/thefoodcrawl"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-[var(--accent)]"
          >
            <GithubIcon className="w-3 h-3" />
            <span>open source</span>
          </a>
          <span className="opacity-40">·</span>
          <span>agpl-3.0</span>
          <span className="opacity-40">·</span>
          <span>no tracking, no ads, no subscription</span>
        </div>
      </section>

      {/* Lists by people — the browse hook */}
      {lists.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10 lg:py-14 border-t border-[var(--border)]">
          <div className="flex items-end justify-between mb-6 max-w-4xl">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)] font-semibold">
                The Issue
              </p>
              <h2 className="fm-display text-3xl lg:text-4xl mt-1">
                What they ate, where.
              </h2>
            </div>
            <Link
              href="/atlas"
              className="text-sm font-medium text-[var(--foreground-soft)] hover:text-[var(--accent)] hidden sm:inline-flex items-center gap-1"
            >
              everything on a map →
            </Link>
          </div>

          {/* Asymmetric grid — featured 2x2 hero card + smaller siblings. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:auto-rows-fr">
            {lists.map((l, i) => (
              <div
                key={`${l.creatorSlug}-${l.city}`}
                className={i === 0 ? 'sm:col-span-2 sm:row-span-2 lg:col-span-2 lg:row-span-2' : ''}
              >
                <ListCard list={l} featured={i === 0} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
