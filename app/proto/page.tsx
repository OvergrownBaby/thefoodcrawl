import {
  getRecentActivity,
  getSiteStats,
  getCreatorNames,
  getDishCityPhrases,
  type ActivityItem,
  type SiteStats,
} from '@/lib/activity'
import { FauxComposer } from '@/components/proto/faux-composer'
import { ActivityMarquee, LiveBadge } from '@/components/activity-marquee'
import { ActivityStats } from '@/components/proto/activity-stats'
import { RotatingWord } from '@/components/proto/rotating-word'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Prototypes — homepage hero & activity' }

// Fallback data so the prototypes always look populated, even on a cold DB.
const MOCK_ACTIVITY: ActivityItem[] = [
  { kind: 'place', id: 'm1', name: 'Yat Lok', city: 'Hong Kong', country: 'HK', photoName: null, at: new Date(Date.now() - 120_000).toISOString() },
  { kind: 'video', id: 'm2', pathSlug: 'demo', title: 'Texas BBQ Tour', creatorName: 'Mark Wiens', placeCount: 9, at: new Date(Date.now() - 300_000).toISOString() },
  { kind: 'place', id: 'm3', name: 'Joy Hing Roasted Meat', city: 'Hong Kong', country: 'HK', photoName: null, at: new Date(Date.now() - 600_000).toISOString() },
  { kind: 'place', id: 'm4', name: 'Tsuta', city: 'Tokyo', country: 'JP', photoName: null, at: new Date(Date.now() - 900_000).toISOString() },
  { kind: 'video', id: 'm5', pathSlug: 'demo2', title: 'Best Street Food in Shenzhen', creatorName: 'Blondie', placeCount: 14, at: new Date(Date.now() - 1_200_000).toISOString() },
  { kind: 'place', id: 'm6', name: 'Guelaguetza', city: 'Los Angeles', country: 'US', photoName: null, at: new Date(Date.now() - 1_500_000).toISOString() },
  { kind: 'place', id: 'm7', name: 'Maido', city: 'Lima', country: 'PE', photoName: null, at: new Date(Date.now() - 1_800_000).toISOString() },
]
const MOCK_STATS: SiteStats = { places: 1240, videos: 318, creators: 47, countries: 22 }
const MOCK_CREATORS = ['Mark Wiens', 'Best Ever Food Review Show', 'Strictly Dumpling', 'Blondie', 'The Food Ranger']
const MOCK_DISHCITY = ['char siu in Hong Kong', 'birria in Los Angeles', 'ramen in Tokyo', 'ceviche in Lima', 'khachapuri in Tbilisi']

export default async function ProtoPage() {
  const [activityRaw, statsRaw, creatorsRaw, dishCityRaw] = await Promise.all([
    getRecentActivity(24),
    getSiteStats(),
    getCreatorNames(12),
    getDishCityPhrases(12),
  ])

  const activity = activityRaw.length >= 4 ? activityRaw : MOCK_ACTIVITY
  const stats = statsRaw.places > 0 ? statsRaw : MOCK_STATS
  const creators = creatorsRaw.length >= 3 ? creatorsRaw : MOCK_CREATORS
  const dishCity = dishCityRaw.length >= 3 ? dishCityRaw : MOCK_DISHCITY
  const latest = activity[0] ?? null
  const usingMock = activityRaw.length < 4

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <p className="fm-label">Internal</p>
        <h1 className="mt-1 fm-display text-3xl">Homepage prototypes</h1>
        <p className="mt-2 text-sm text-[var(--muted)] max-w-2xl">
          Four full hero + live-activity compositions to compare. Marquees pause on hover;
          chips are real links. {usingMock && <span className="text-[var(--accent)]">Showing mock data (DB looks sparse).</span>}
        </p>
      </div>

      <Variant
        tag="A"
        title="Still headline + scrolling marquee"
        note="No tagline rotation. The ticker carries the “alive”. My default pick."
      >
        <Hero
          headline={
            <>
              Every pin keeps the <span className="text-[var(--accent)]">receipt</span>.
              <span className="block text-[var(--muted)] text-lg sm:text-xl mt-1 font-normal">
                The exact quote, the timestamp, the place it came from.
              </span>
            </>
          }
        />
        <ActivityMarquee items={activity} />
      </Variant>

      <Variant
        tag="B"
        title="Still headline + stat counters"
        note="Restrained. Animated totals + the single most recent add. No looping motion."
      >
        <Hero
          headline={
            <>
              Every pin keeps the <span className="text-[var(--accent)]">receipt</span>.
              <span className="block text-[var(--muted)] text-lg sm:text-xl mt-1 font-normal">
                The exact quote, the timestamp, the place it came from.
              </span>
            </>
          }
        />
        <div className="mx-auto max-w-2xl mt-6">
          <ActivityStats stats={stats} latest={latest} />
        </div>
      </Variant>

      <Variant
        tag="C"
        title="Rotate real creators + stat line + marquee"
        note="Most “alive”. Tagline cycles creators you’ve actually parsed; thin stat strip; ticker below."
      >
        <Hero
          headline={
            <>
              Restaurants from{' '}
              <RotatingWord words={creators} className="text-[var(--accent)]" />
              <span className="block text-[var(--muted)] text-lg sm:text-xl mt-1 font-normal">
                pinned with the receipts.
              </span>
            </>
          }
        />
        <div className="mx-auto max-w-2xl mt-5 mb-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
          <LiveBadge />
          <span className="font-semibold text-[var(--foreground-soft)]">{stats.places.toLocaleString()}</span> places
          <span className="opacity-40">·</span>
          <span className="font-semibold text-[var(--foreground-soft)]">{stats.videos.toLocaleString()}</span> videos
          <span className="opacity-40">·</span>
          <span className="font-semibold text-[var(--foreground-soft)]">{stats.creators}</span> creators
          <span className="opacity-40">·</span>
          <span className="font-semibold text-[var(--foreground-soft)]">{stats.countries}</span> countries
        </div>
        <ActivityMarquee items={activity} showLiveLabel={false} />
      </Variant>

      <Variant
        tag="D"
        title="Rotate dish + city + marquee"
        note="Tagline cycles real dish/city pairs from your data; ticker below."
      >
        <Hero
          headline={
            <>
              Find the{' '}
              <RotatingWord words={dishCity} className="text-[var(--accent)]" intervalMs={2600} />
              <span className="block text-[var(--muted)] text-lg sm:text-xl mt-1 font-normal">
                locals actually rate.
              </span>
            </>
          }
        />
        <ActivityMarquee items={activity} />
      </Variant>
    </div>
  )
}

function Variant({
  tag,
  title,
  note,
  children,
}: {
  tag: string
  title: string
  note: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-[var(--border)] bg-[var(--background)] py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-5 flex items-baseline gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--foreground)] text-[var(--background)] text-sm font-bold">
            {tag}
          </span>
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-xs text-[var(--muted)]">{note}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background-elev)]/40 overflow-hidden">
          {children}
        </div>
      </div>
    </section>
  )
}

function Hero({ headline }: { headline: React.ReactNode }) {
  return (
    <div className="px-4 sm:px-8 pt-10 pb-8">
      <h1 className="fm-display text-2xl sm:text-3xl leading-tight text-center sm:text-left mb-6">
        {headline}
      </h1>
      <FauxComposer />
    </div>
  )
}
