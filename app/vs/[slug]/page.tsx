import { notFound } from 'next/navigation'
import Link from 'next/link'
import { COMPARISONS, getComparison } from '@/lib/comparisons'
import { JsonLd } from '@/components/json-ld'
import { faqJsonLd, breadcrumbJsonLd } from '@/lib/jsonld'
import { SubmitForm } from '@/components/submit-form'

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = getComparison(slug)
  if (!c) return { title: 'Not found' }
  return {
    title: c.title,
    description: c.description,
    alternates: { canonical: `/vs/${c.slug}` },
  }
}

export default async function ComparisonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = getComparison(slug)
  if (!c) notFound()

  return (
    <div className="flex-1">
      <JsonLd data={faqJsonLd(c.faqs)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: `vs ${c.competitor}`, url: `/vs/${c.slug}` },
        ])}
      />

      <article className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <div className="fm-label">Compare</div>
        <h1 className="fm-display mt-1 text-3xl sm:text-4xl leading-tight">
          Foodcrawl vs {c.competitor}
        </h1>
        <p className="mt-4 text-lg text-[var(--muted)] leading-relaxed">{c.intro}</p>

        <div className="mt-8">
          <SubmitForm />
        </div>

        <div className="mt-12 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 pr-4 font-semibold" />
                <th className="text-left py-2 px-4 font-semibold">{c.competitor}</th>
                <th className="text-left py-2 pl-4 font-semibold text-[var(--accent)]">Foodcrawl</th>
              </tr>
            </thead>
            <tbody>
              {c.table.map((row) => (
                <tr key={row.dim} className="border-b border-[var(--border)]">
                  <td className="py-3 pr-4 font-medium text-[var(--foreground)]">{row.dim}</td>
                  <td className="py-3 px-4 text-[var(--muted)]">{row.them}</td>
                  <td className="py-3 pl-4 text-[var(--foreground)]">{row.us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-12">
          <h2 className="fm-display text-2xl mb-6">FAQ</h2>
          <dl className="space-y-6">
            {c.faqs.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold text-[var(--foreground)]">{f.q}</dt>
                <dd className="mt-1.5 text-[var(--muted)] leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-12 text-sm flex gap-4">
          <Link href="/atlas" className="text-[var(--accent)] hover:underline">
            Browse the full map →
          </Link>
          {c.competitorUrl && (
            <a
              href={c.competitorUrl}
              target="_blank"
              rel="noreferrer nofollow"
              className="text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Visit {c.competitor}
            </a>
          )}
        </div>
      </article>
    </div>
  )
}
