import Link from 'next/link'
import { Plus } from 'lucide-react'
import { LogoMark } from './logo-mark'
import { GithubIcon } from './icons'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-[var(--background)]/85 backdrop-blur-md border-b border-[var(--border)]/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 fm-btn fm-focus rounded-lg pr-1"
        >
          <LogoMark className="w-7 h-7" />
          <span className="font-semibold text-[var(--foreground)] -tracking-[0.01em]">
            Foodcrawl
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/atlas"
            className="fm-btn fm-focus px-3 py-1.5 rounded-md text-[var(--foreground-soft)] hover:text-[var(--foreground)] hover:bg-[var(--muted-soft)]"
          >
            Atlas
          </Link>
          <Link
            href="/c/mark-wiens"
            className="hidden sm:inline-flex fm-btn fm-focus px-3 py-1.5 rounded-md text-[var(--foreground-soft)] hover:text-[var(--foreground)] hover:bg-[var(--muted-soft)]"
          >
            Creators
          </Link>
          <Link
            href="/submit"
            className="fm-btn fm-focus ml-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[var(--foreground)] hover:bg-[var(--muted-soft)] font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </Link>
          <a
            href="https://github.com/OvergrownBaby/thefoodcrawl"
            target="_blank"
            rel="noreferrer"
            className="fm-btn fm-focus ml-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--border-strong)] hover:bg-[var(--muted-soft)] text-sm"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Source</span>
          </a>
        </nav>
      </div>
    </header>
  )
}
