import Link from 'next/link'
import { SubmitForm } from '@/components/submit-form'
import { VideoCard } from '@/components/video-card'
import { GithubIcon } from '@/components/icons'
import { ActivityMarquee } from '@/components/activity-marquee'
import { ActivityStatLine } from '@/components/activity-statline'
import { getLatestVideos } from '@/lib/videos'
import { getRecentActivity, getSiteStats } from '@/lib/activity'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [videos, activity, stats] = await Promise.all([
    getLatestVideos(24),
    getRecentActivity(24),
    getSiteStats(),
  ])

  return (
    <div className="flex-1">
      {/* Hero: one clear, static value prop. The "alive" lives in the ticker
          below the composer — a single peripheral channel, not the headline. */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-10 sm:pt-14 pb-7">
        <div className="text-center sm:text-left max-w-2xl">
          <h1 className="fm-display text-3xl sm:text-4xl leading-tight">
            Drop a food video, get a map.
          </h1>
          <p className="mt-3 text-base sm:text-lg text-[var(--muted)] leading-relaxed">
            Every place keeps its receipt — the exact quote, the timestamp, and the
            spot it came from.
          </p>
        </div>

        <div className="mt-6">
          <SubmitForm />
        </div>

        <div className="mt-5 flex items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-[11px] text-[var(--muted)] flex-wrap">
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
          <span>no tracking · no ads · no subscription</span>
        </div>
      </section>

      {/* Live activity — the single moving channel. Static stat line above it. */}
      {activity.length > 0 && (
        <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-3">
          <ActivityStatLine stats={stats} />
        </div>
      )}
      {activity.length > 0 && <ActivityMarquee items={activity} showLiveLabel={false} />}

      {/* Video feed — recency-sorted. Skip the top rule when the marquee already
          provides a divider above, to avoid a doubled border. */}
      {videos.length > 0 && (
        <section
          className={`mx-auto max-w-7xl px-4 sm:px-6 py-10 lg:py-14 ${
            activity.length > 0 ? '' : 'border-t border-[var(--border)]'
          }`}
        >
          <div className="flex items-end justify-between mb-5 max-w-4xl">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)] font-semibold">
                Feed
              </p>
              <h2 className="mt-1 text-xl font-semibold">Latest videos parsed.</h2>
            </div>
            <Link
              href="/atlas"
              className="text-sm font-medium text-[var(--foreground-soft)] hover:text-[var(--accent)] hidden sm:inline-flex items-center gap-1"
            >
              all on the map →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
