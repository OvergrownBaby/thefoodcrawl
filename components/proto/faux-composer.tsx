import { Link as LinkIcon, Sparkles } from 'lucide-react'

/** Non-functional visual stand-in for SubmitForm — for layout prototypes. */
export function FauxComposer() {
  return (
    <div className="max-w-2xl mx-auto">
      <label className="block text-sm font-medium text-[var(--muted)] mb-2">Paste a link</label>
      <div className="flex items-center gap-2 bg-white border border-[var(--border)] rounded-2xl pl-4 pr-2 py-2">
        <LinkIcon className="w-4 h-4 text-[var(--muted)] shrink-0" />
        <span className="flex-1 min-w-0 text-sm py-1.5 text-[var(--muted)]">
          https://www.youtube.com/watch?v=…
        </span>
        <span className="fm-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm bg-[var(--accent)] text-white">
          <Sparkles className="w-4 h-4" />
          Extract
        </span>
      </div>
    </div>
  )
}
