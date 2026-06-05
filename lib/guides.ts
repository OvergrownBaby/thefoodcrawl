// Guide / landing pages at /guides/[slug], each targeting a query that AI
// currently answers with "no tool exists" — verified in our SERP + fan-out
// research (convert a YouTube food video to a map / Google Maps list, find the
// restaurants in a vlog, map every place a creator visited). Keyword in the
// slug, H1, first sentence; FAQ schema for AI citation; SubmitForm to convert.

export type Guide = {
  slug: string
  title: string
  description: string
  h1: string
  intro: string
  steps: Array<{ h: string; p: string }>
  faqs: Array<{ q: string; a: string }>
}

export const GUIDES: Guide[] = [
  {
    slug: 'convert-youtube-food-video-to-google-maps',
    title: 'Convert a YouTube food video into a Google Maps list',
    description:
      'Turn any YouTube food video into a map of restaurants in seconds. Paste the link, Foodcrawl extracts every place, and you open each one in Google Maps — free, no app.',
    h1: 'Convert a YouTube food video into a Google Maps list',
    intro:
      'To convert a YouTube food video into a Google Maps list, paste the video link into Foodcrawl. It reads the transcript, finds every restaurant mentioned, and puts them on a map — each place opens in Google Maps in one tap.',
    steps: [
      { h: 'Copy the YouTube link', p: 'Open the food video on YouTube and copy its URL — a full vlog with spoken restaurant names works best.' },
      { h: 'Paste it into Foodcrawl', p: 'Drop the link in the box above. Foodcrawl reads the transcript and extracts each restaurant with the exact quote and timestamp.' },
      { h: 'Open any pin in Google Maps', p: 'Every restaurant has an “Open in Google Maps” button, so you can save it to your own list or get directions instantly.' },
    ],
    faqs: [
      {
        q: 'Is there a tool to convert a YouTube video into a Google Maps list?',
        a: 'Foodcrawl does this: paste a YouTube food video and it extracts every restaurant onto a map, with a one-tap Google Maps link for each. It is free and runs in the browser.',
      },
      {
        q: 'Does it work without the creator listing addresses in the description?',
        a: 'Yes. Foodcrawl reads what is said in the video itself (the transcript), so it finds restaurants even when they are only mentioned out loud and never written in the description.',
      },
      {
        q: 'Is it free?',
        a: 'Yes — Foodcrawl is open-source (AGPL-3.0), with no ads, no subscription, and no account required.',
      },
    ],
  },
  {
    slug: 'find-restaurants-mentioned-in-a-food-vlog',
    title: 'How to find the restaurants mentioned in a food vlog',
    description:
      'A reliable way to find every restaurant mentioned in a food vlog: paste the video into Foodcrawl and it lists each place with the exact quote and timestamp, on a map.',
    h1: 'How to find the restaurants mentioned in a food vlog',
    intro:
      'The fastest way to find the restaurants mentioned in a food vlog is to paste the video link into Foodcrawl — it reads the transcript and lists every restaurant with the exact quote and the timestamp it was said, plotted on a map.',
    steps: [
      { h: 'Grab the video link', p: 'Copy the URL of the food vlog from YouTube, TikTok, a Reddit thread, or an article.' },
      { h: 'Let Foodcrawl read it', p: 'Paste the link. Foodcrawl transcribes the video and pulls out each restaurant by name, with the surrounding quote.' },
      { h: 'Jump to the moment', p: 'Each place keeps a timestamp, so you can jump straight to where it is talked about — no scrubbing the whole video.' },
    ],
    faqs: [
      {
        q: 'How do I find a restaurant from a video if the name was only said out loud?',
        a: 'Foodcrawl works from the transcript, so it captures restaurants that are only spoken — not just the ones written in the description or comments.',
      },
      {
        q: 'Can I find restaurants from a TikTok or a Reddit thread too?',
        a: 'Yes — Foodcrawl accepts YouTube, TikTok, Reddit threads and articles, and extracts the restaurants from each.',
      },
    ],
  },
  {
    slug: 'map-every-restaurant-a-youtuber-visited',
    title: 'Map every restaurant a YouTuber has visited',
    description:
      'See every restaurant a YouTuber has visited on one map. Foodcrawl aggregates a creator’s videos into a single map, grouped by city, with quotes and timestamps.',
    h1: 'Map every restaurant a YouTuber has visited',
    intro:
      'To map every restaurant a YouTuber has visited, Foodcrawl aggregates all of their parsed videos into one creator map, grouped by city — each restaurant carrying the quote and timestamp it came from.',
    steps: [
      { h: 'Find the creator', p: 'Browse the creators page to see if the YouTuber is already mapped, or paste any of their videos to start.' },
      { h: 'Add more videos', p: 'Each video you paste adds its restaurants to that creator’s map, so coverage grows the more you add.' },
      { h: 'Explore by city', p: 'The creator map groups restaurants by city, so you can see everywhere they have eaten in one place.' },
    ],
    faqs: [
      {
        q: 'Is there a tool that shows every restaurant a YouTuber has been to?',
        a: 'Foodcrawl builds a per-creator map: every restaurant across all of their parsed videos, grouped by city. You can extend it by pasting more of their videos.',
      },
      {
        q: 'What if the creator is not famous?',
        a: 'It does not matter — Foodcrawl works for any creator. Paste their videos and it builds the map automatically, even for small channels no catalog covers.',
      },
    ],
  },
]

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug)
}
