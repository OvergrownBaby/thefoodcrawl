import { SubmitForm } from '@/components/submit-form'
import { SourceBadge } from '@/components/source-badge'

export const metadata = {
  title: 'Drop a link',
  description: 'Paste any YouTube, TikTok, Reddit or article link and we map every restaurant in it.',
  alternates: { canonical: '/submit' },
}

export default function SubmitPage() {
  return (
    <div className="flex-1">
      <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-12 pb-6">
        <p className="fm-label">Contribute</p>
        <h1 className="mt-2 fm-display text-3xl lg:text-4xl">Add a link.</h1>
        <p className="mt-3 text-[var(--muted)] max-w-xl leading-relaxed">
          Paste anything with restaurants in it. Gemini watches the video or Claude reads the
          text, finds the places, and pins them. Every pin keeps the verbatim quote &amp;
          timestamp.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 pb-20">
        <SubmitForm />

        <div className="mt-10 grid sm:grid-cols-2 gap-4 text-sm">
          <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--background-elev)]">
            <div className="fm-label mb-2.5">Works today</div>
            <ul className="space-y-1.5 text-[var(--foreground-soft)]">
              <li className="flex items-center gap-2">
                <SourceBadge kind="youtube" size="sm" /> Videos, Shorts, documentaries
              </li>
            </ul>

            <div className="fm-label mt-5 mb-2.5">Coming soon</div>
            <ul className="space-y-1.5 text-[var(--muted)]">
              <li className="flex items-center gap-2 opacity-70">
                <SourceBadge kind="tiktok" size="sm" /> TikTok &amp; Reels
              </li>
              <li className="flex items-center gap-2 opacity-70">
                <span className="inline-flex items-center gap-1 rounded-full ring-1 ring-inset ring-pink-200 bg-pink-50 text-pink-700 font-semibold text-[10px] px-1.5 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                  <svg viewBox="0 0 16 16" className="w-3 h-3" aria-hidden>
                    <rect x="2" y="2" width="12" height="12" rx="3.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
                    <circle cx="8" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.3" fill="none" />
                    <circle cx="11.4" cy="4.6" r="0.7" fill="currentColor" />
                  </svg>
                  <span className="tracking-wide">Instagram</span>
                </span>{' '}
                Reels &amp; posts
              </li>
              <li className="flex items-center gap-2 opacity-70">
                <SourceBadge kind="article" size="sm" /> Eater, Infatuation, blogs
              </li>
              <li className="flex items-center gap-2 opacity-70">
                <SourceBadge kind="reddit" size="sm" /> Threads &amp; AMAs
              </li>
              <li className="flex items-center gap-2 opacity-70">
                <SourceBadge kind="maps_list" size="sm" /> Google Maps lists
              </li>
            </ul>
          </div>
          <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--background-elev)]">
            <div className="fm-label mb-2.5">How it stays honest</div>
            <p className="text-[var(--foreground-soft)] leading-relaxed">
              Every pin keeps the verbatim quote it came from. If a video says
              &ldquo;Yat Lok&rdquo; at 1:13:50, the pin remembers that. No quote → no pin.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
