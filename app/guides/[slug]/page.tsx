import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GUIDES, getGuide } from '@/lib/guides'
import { JsonLd } from '@/components/json-ld'
import { faqJsonLd, breadcrumbJsonLd } from '@/lib/jsonld'
import { SubmitForm } from '@/components/submit-form'

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const g = getGuide(slug)
  if (!g) return { title: 'Not found' }
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
  }
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const g = getGuide(slug)
  if (!g) notFound()

  return (
    <div className="flex-1">
      <JsonLd data={faqJsonLd(g.faqs)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: g.h1, url: `/guides/${g.slug}` },
        ])}
      />

      <article className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <div className="fm-label">Guide</div>
        <h1 className="fm-display mt-1 text-3xl sm:text-4xl leading-tight">{g.h1}</h1>
        <p className="mt-4 text-lg text-[var(--muted)] leading-relaxed">{g.intro}</p>

        <div className="mt-8">
          <SubmitForm />
        </div>

        <section className="mt-12">
          <h2 className="fm-display text-2xl mb-6">Step by step</h2>
          <ol className="space-y-5">
            {g.steps.map((s, i) => (
              <li key={s.h} className="flex gap-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white text-sm font-bold fm-num">
                  {i + 1}
                </span>
                <div>
                  <div className="font-semibold text-[var(--foreground)]">{s.h}</div>
                  <p className="mt-1 text-[var(--muted)] leading-relaxed">{s.p}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="fm-display text-2xl mb-6">FAQ</h2>
          <dl className="space-y-6">
            {g.faqs.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold text-[var(--foreground)]">{f.q}</dt>
                <dd className="mt-1.5 text-[var(--muted)] leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-12 text-sm">
          <Link href="/atlas" className="text-[var(--accent)] hover:underline">
            Browse the full map →
          </Link>
        </div>
      </article>
    </div>
  )
}
