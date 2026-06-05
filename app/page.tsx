import Link from 'next/link'
import { SubmitForm } from '@/components/submit-form'
import { VideoCard } from '@/components/video-card'
import { GithubIcon } from '@/components/icons'
import { ActivityStatLine } from '@/components/activity-statline'
import { getLatestVideos } from '@/lib/videos'
import { getSiteStats } from '@/lib/activity'
import { JsonLd } from '@/components/json-ld'
import { siteJsonLd, faqJsonLd } from '@/lib/jsonld'

export const dynamic = 'force-dynamic'

export const metadata = {
  alternates: { canonical: '/' },
}

// Visible FAQ + FAQPage schema, aimed squarely at the queries AI answers with
// "no tool exists": convert a YouTube food video to a map / Google Maps list,
// find restaurants mentioned in a vlog, map every place a creator visited.
const HOME_FAQS = [
  {
    q: 'How do I find the restaurants mentioned in a food video?',
    a: 'Paste the video link into Foodcrawl. It reads the transcript, pulls out every restaurant named, and drops them on a map — each with the exact quote and the timestamp it was said. Works with YouTube, TikTok, Reddit threads and articles.',
  },
  {
    q: 'Can I turn a YouTube food video into a Google Maps list?',
    a: "Yes. Paste the YouTube link and Foodcrawl extracts each restaurant with its location — open any pin in Google Maps in one tap. It's free, runs in the browser, and needs no app.",
  },
  {
    q: 'Is there a tool to map every restaurant a YouTuber visited?',
    a: 'Foodcrawl builds a map per creator: every restaurant across all of their parsed videos, grouped by city. Browse the creators page, or paste more of their videos to keep adding to it.',
  },
  {
    q: 'Is Foodcrawl free?',
    a: 'Yes — it is open-source (AGPL-3.0), with no ads, no subscription, and no account required.',
  },
]

export default async function HomePage() {
  const [videos, stats] = await Promise.all([getLatestVideos(24), getSiteStats()])

  return (
    <div className="flex-1">
      <JsonLd data={siteJsonLd()} />
      <JsonLd data={faqJsonLd(HOME_FAQS)} />
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

      {/* Static social proof — legible, near-zero motion. */}
      {stats.places > 0 && (
        <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-2">
          <ActivityStatLine stats={stats} />
        </div>
      )}

      {/* Video feed — recency-sorted */}
      {videos.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10 lg:py-14 border-t border-[var(--border)]">
          <div className="flex items-end justify-between mb-5">
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

      {/* FAQ — visible Q&A backing the FAQPage schema; targets the "no tool
          exists" queries directly on the highest-authority page. */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-12 border-t border-[var(--border)]">
        <h2 className="fm-display text-2xl mb-6">Questions</h2>
        <dl className="space-y-6">
          {HOME_FAQS.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold text-[var(--foreground)]">{f.q}</dt>
              <dd className="mt-1.5 text-[var(--muted)] leading-relaxed">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
