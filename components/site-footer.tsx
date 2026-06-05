'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart } from 'lucide-react'
import { GithubIcon } from './icons'

export function SiteFooter() {
  const pathname = usePathname()
  if (pathname === '/atlas') return null

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--background)]/40 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid sm:grid-cols-3 gap-6 text-sm">
        <div>
          <div className="font-semibold">Foodcrawl</div>
          <p className="mt-1.5 text-[var(--muted)] leading-relaxed">
            A community map of restaurants recommended by food creators. Built so I&apos;d stop
            forgetting where Mark Wiens told me to eat.
          </p>
          <div className="mt-3 fm-label">
            AGPL v3 &middot; no tracking &middot; no ads &middot; no subscription
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-2 text-sm">
          <div>
            <div className="fm-label mb-2">Product</div>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/atlas"
                  className="text-[var(--foreground-soft)] hover:text-[var(--accent)]"
                >
                  Atlas
                </Link>
              </li>
              <li>
                <Link
                  href="/submit"
                  className="text-[var(--foreground-soft)] hover:text-[var(--accent)]"
                >
                  Add a link
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="fm-label mb-2">Project</div>
            <ul className="space-y-1.5">
              <li>
                <a
                  href="https://github.com/OvergrownBaby/thefoodcrawl"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--foreground-soft)] hover:text-[var(--accent)] inline-flex items-center gap-1"
                >
                  <GithubIcon className="w-3 h-3" /> Source
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/sponsors/OvergrownBaby"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--foreground-soft)] hover:text-[var(--accent)] inline-flex items-center gap-1"
                >
                  <Heart className="w-3 h-3" /> Sponsor
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/OvergrownBaby/thefoodcrawl/issues"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--foreground-soft)] hover:text-[var(--accent)]"
                >
                  Report an issue
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="fm-label mb-2">Guides</div>
            <ul className="space-y-1.5">
              <li><Link href="/guides/convert-youtube-food-video-to-google-maps" className="text-[var(--foreground-soft)] hover:text-[var(--accent)]">YouTube → Google Maps</Link></li>
              <li><Link href="/guides/find-restaurants-mentioned-in-a-food-vlog" className="text-[var(--foreground-soft)] hover:text-[var(--accent)]">Find places in a vlog</Link></li>
              <li><Link href="/guides/map-every-restaurant-a-youtuber-visited" className="text-[var(--foreground-soft)] hover:text-[var(--accent)]">Map a creator&apos;s spots</Link></li>
            </ul>
          </div>
          <div>
            <div className="fm-label mb-2">Compare</div>
            <ul className="space-y-1.5">
              <li><Link href="/vs/eatlect-alternative" className="text-[var(--foreground-soft)] hover:text-[var(--accent)]">vs Eatlect</Link></li>
              <li><Link href="/vs/rezz-alternative" className="text-[var(--foreground-soft)] hover:text-[var(--accent)]">vs Rezz</Link></li>
              <li><Link href="/vs/navia-alternative" className="text-[var(--foreground-soft)] hover:text-[var(--accent)]">vs Navia</Link></li>
              <li><Link href="/vs/tvfoodmaps-alternative" className="text-[var(--foreground-soft)] hover:text-[var(--accent)]">vs TVFoodMaps</Link></li>
            </ul>
          </div>
        </div>

        <div className="text-[var(--muted)] text-xs leading-relaxed">
          Made by{' '}
          <a
            href="https://github.com/OvergrownBaby"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[var(--foreground)] underline decoration-[var(--accent)] decoration-2 underline-offset-2"
          >
            @OvergrownBaby
          </a>{' '}
          on a weekend.
          <br />
          Restaurant data extracted from public videos with attribution. If you&apos;re a
          creator and want a pin removed, open an issue.
        </div>
      </div>
    </footer>
  )
}
