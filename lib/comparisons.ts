// Config-driven comparison / "alternative" pages at /vs/[slug]. These capture
// competitor-brand searches ("eatlect alternative", "free Rezz alternative")
// and the "what's a free/open-source tool that…" prompts AI loves to answer.
//
// Honesty rule: every claim here must be defensible. We describe competitors by
// their public positioning and never fabricate weaknesses — the real, verifiable
// differences (self-serve vs curated, web vs app, YouTube-first, open-source,
// timestamped clips) are enough.

export type Comparison = {
  slug: string
  competitor: string
  competitorUrl?: string
  title: string
  description: string
  intro: string
  table: Array<{ dim: string; them: string; us: string }>
  faqs: Array<{ q: string; a: string }>
}

const US = 'Foodcrawl'

export const COMPARISONS: Comparison[] = [
  {
    slug: 'eatlect-alternative',
    competitor: 'Eatlect',
    competitorUrl: 'https://eatlect.com',
    title: 'Foodcrawl vs Eatlect — a self-serve, open-source alternative',
    description:
      'Eatlect is a hand-curated catalog of restaurants from a handful of famous food influencers. Foodcrawl lets you paste any food video and extract the restaurants yourself, on a free open-source map.',
    intro:
      'Eatlect curates a browse-only catalog of restaurants reviewed by a small set of well-known creators. Foodcrawl is the self-serve version: paste any food video — from any creator — and it pulls out every restaurant, with the quote and timestamp each came from.',
    table: [
      { dim: 'How places get added', them: 'Hand-picked by their team', us: 'Paste any link — auto-extracted' },
      { dim: 'Creators covered', them: 'A small set of famous names', us: 'Any creator, including small ones' },
      { dim: 'Sources', them: 'Selected reviews', us: 'YouTube, TikTok, Reddit, articles' },
      { dim: 'Per-restaurant receipts', them: 'Summary text', us: 'Verbatim quote + timestamped clip' },
      { dim: 'Open source', them: 'No', us: 'Yes (AGPL-3.0)' },
      { dim: 'Price', them: 'Free', us: 'Free, no ads, no account' },
    ],
    faqs: [
      {
        q: 'Is there a free alternative to Eatlect?',
        a: `${US} is free and open-source. Unlike a curated catalog, you paste any food video and it extracts the restaurants for you — so you are not limited to the creators someone else chose to add.`,
      },
      {
        q: 'Can I look up a creator Eatlect does not cover?',
        a: `Yes — paste any of that creator's videos into ${US} and it builds their map automatically, restaurant by restaurant.`,
      },
    ],
  },
  {
    slug: 'rezz-alternative',
    competitor: 'Rezz',
    title: 'Foodcrawl vs Rezz — a web, YouTube-first alternative',
    description:
      'Rezz is an iOS app for saving restaurants from TikTok and Instagram. Foodcrawl runs in the browser, works best with YouTube food vlogs, and is open-source.',
    intro:
      'Rezz is a phone app focused on short-form TikTok and Instagram videos. Foodcrawl runs in any browser — no app install — and is built for YouTube long-form food vlogs, where the transcript is richest and extraction is most accurate.',
    table: [
      { dim: 'Platform', them: 'iOS app', us: 'Web — no install' },
      { dim: 'Best for', them: 'TikTok / Instagram', us: 'YouTube long-form vlogs' },
      { dim: 'Per-restaurant receipts', them: 'Pin + label', us: 'Verbatim quote + timestamped clip' },
      { dim: 'Crawlable pages', them: 'In-app only', us: 'Public pages, indexable & shareable' },
      { dim: 'Open source', them: 'No', us: 'Yes (AGPL-3.0)' },
    ],
    faqs: [
      {
        q: 'Is there a Rezz alternative for YouTube?',
        a: `${US} is YouTube-first: paste a YouTube food video and it reads the transcript to extract every restaurant with the exact quote and timestamp. No app required.`,
      },
      {
        q: 'Is there a Rezz alternative that works in a browser?',
        a: `Yes — ${US} runs entirely on the web. Paste a link and get a shareable map page, nothing to install.`,
      },
    ],
  },
  {
    slug: 'navia-alternative',
    competitor: 'Navia',
    title: 'Foodcrawl vs Navia — YouTube food vlogs to a map',
    description:
      'Navia extracts places from TikTok videos. Foodcrawl focuses on YouTube food vlogs, adds verbatim quotes and timestamps, and is open-source and free.',
    intro:
      'Navia is built around TikTok. Foodcrawl handles YouTube long-form food vlogs — the format with the most spoken detail — and keeps a receipt for every place: the exact quote and the moment in the video it was mentioned.',
    table: [
      { dim: 'Best for', them: 'TikTok', us: 'YouTube long-form vlogs' },
      { dim: 'Platform', them: 'App', us: 'Web — no install' },
      { dim: 'Per-restaurant receipts', them: 'Place card', us: 'Verbatim quote + timestamped clip' },
      { dim: 'Open source', them: 'No', us: 'Yes (AGPL-3.0)' },
    ],
    faqs: [
      {
        q: 'What is a good Navia alternative for YouTube food videos?',
        a: `${US} is purpose-built for YouTube food vlogs and is free and open-source. Paste a link and it maps every restaurant with quotes and timestamps.`,
      },
    ],
  },
  {
    slug: 'tvfoodmaps-alternative',
    competitor: 'TVFoodMaps',
    title: 'Foodcrawl vs TVFoodMaps — for online creators, not TV shows',
    description:
      'TVFoodMaps maps restaurants featured on TV shows like Diners, Drive-Ins and Dives. Foodcrawl maps restaurants from online food creators and lets you add any video yourself.',
    intro:
      'TVFoodMaps catalogs restaurants seen on television food shows. Foodcrawl is for the internet era: it maps restaurants from YouTube, TikTok and online food creators, and anyone can add a new video by pasting a link.',
    table: [
      { dim: 'Source', them: 'TV shows', us: 'Online food creators' },
      { dim: 'Add your own', them: 'No', us: 'Paste any link' },
      { dim: 'Per-restaurant receipts', them: 'Show + episode', us: 'Verbatim quote + timestamped clip' },
      { dim: 'Open source', them: 'No', us: 'Yes (AGPL-3.0)' },
    ],
    faqs: [
      {
        q: 'Is there a TVFoodMaps for YouTube creators?',
        a: `${US} does for online food creators what TVFoodMaps does for TV: it maps the restaurants from their videos — and you can add any creator by pasting their videos.`,
      },
    ],
  },
]

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug)
}
