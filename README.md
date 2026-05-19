<div align="center">

<img src=".github/assets/banner.svg" alt="Foodcrawl — restaurants from the people you actually trust" width="100%" />

<br/>

<p>
  <a href="https://thefoodcrawl.com"><img alt="Live demo" src="https://img.shields.io/badge/demo-thefoodcrawl.com-DA3F2A?style=flat-square" /></a>
  <a href="LICENSE"><img alt="License: AGPL v3" src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square" /></a>
  <img alt="Status" src="https://img.shields.io/badge/status-alpha-F2A93B?style=flat-square" />
  <img alt="Built with" src="https://img.shields.io/badge/built_with-Next.js%20%C2%B7%20Supabase%20%C2%B7%20Gemini%20%C2%B7%20Claude-1A1814?style=flat-square" />
</p>

<p>
  <a href="#-quick-start">Quick start</a> ·
  <a href="#-how-it-works">How it works</a> ·
  <a href="#-roadmap">Roadmap</a> ·
  <a href="#-contributing">Contributing</a>
</p>

</div>

---

## What is Foodcrawl?

You watch a Mark Wiens video. He raves about a noodle shop. You forget the
name. Three months later you're in Hong Kong and you can't find it.

**Foodcrawl fixes that.** Drop a YouTube link with a restaurant in it and the
AI watches the video, finds every restaurant mentioned, and drops them on a
map. Each pin keeps the *verbatim quote and timestamp* from the source, so
you can hear the creator say it before you go.

> Built so I'd stop forgetting where Mark Wiens told me to eat.

---

## 🚀 Quick start

```bash
git clone https://github.com/OvergrownBaby/thefoodcrawl
cd thefoodcrawl
npm install
cp .env.example .env.local   # then fill in keys
npm run dev
```

You'll need free-tier accounts on:

- **[Gemini](https://aistudio.google.com/app/apikey)** — for watching videos
- **[Anthropic](https://console.anthropic.com)** — for reading articles
- **[Google Places](https://console.cloud.google.com)** — for geocoding (Places API New + Geocoding API)
- **[Supabase](https://supabase.com/dashboard)** — for storing pins

Smoke-test the full pipeline against one URL:

```bash
npm run seed:one -- https://www.youtube.com/watch?v=z-iAddtjM7A
```

---

## 🧠 How it works

```
                ┌────────────┐
   any URL ───▶ │ classifier │
                └─────┬──────┘
                      │
       ┌──────────────┼──────────────┬─────────────────┐
       ▼              ▼              ▼                 ▼
   ┌───────┐    ┌─────────┐    ┌──────────┐      ┌─────────┐
   │YouTube│    │ Reddit  │    │ Article  │      │ Maps    │
   │       │    │ (.json) │    │(readabil-│      │ list    │
   │       │    │         │    │  ity)    │      │         │
   └───┬───┘    └────┬────┘    └────┬─────┘      └────┬────┘
       │             │              │                  │
       └─────────────┴──────┬───────┴──────────────────┘
                            ▼
                  ┌─────────────────────┐
                  │  Restaurant         │
                  │  extractor          │
                  │  · Gemini 2.5 Flash │  → JSON list with verbatim
                  │    for video        │     quotes from the source
                  │  · Claude Haiku 4.5 │
                  │    for text         │
                  └──────────┬──────────┘
                             │
                             ▼
                   ┌────────────────────┐
                   │ Quote validator    │  → drop any restaurant whose
                   │ (substring match)  │     "quote" isn't in the source
                   └──────────┬─────────┘
                              │
                              ▼
                   ┌────────────────────┐
                   │ Geocoder           │  → Google Places Text Search
                   │ (cached, dedupes   │     with Postgres cache
                   │  by name+city)     │
                   └──────────┬─────────┘
                              │
                              ▼
                   ┌────────────────────┐
                   │ Supabase upsert    │  → restaurants + mentions tables
                   └────────────────────┘
```

The **quote validator** is the anti-hallucination defense. The LLM has to
output a verbatim substring of the source text for every restaurant it
claims to find. If the quote can't be located in the source, the restaurant
is dropped. This kills the failure mode where the LLM invents a restaurant
and a plausible-sounding quote to justify it.

For long-form YouTube videos (1h+), `mediaResolution: LOW` keeps token counts
inside Gemini Flash's 1M context window. Videos over ~1 hour synchronous
still hit Google's 270s edge-timeout — chunking via `startOffset`/`endOffset`
is the [v1.5 fix](#-roadmap).

---

## 🧱 Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server components + API routes in one repo |
| Styling | Tailwind CSS v4 | Fast, no design system overhead |
| Map | MapLibre GL + Carto tiles | Open-source, no Mapbox bill |
| DB | Supabase Postgres | RLS, pg_trgm for fuzzy dedup, free tier |
| Video AI | Gemini 2.5 Flash | Direct YouTube URL ingestion, $0.10–0.30/video |
| Text AI | Claude Haiku 4.5 | Cheap, fast, great structured output |
| Geocoding | Google Places API (New) | Business-name search beats Mapbox/OSM for restaurants |
| Hosting | Vercel | One-command deploy, free tier |

---

## ✅ Status

| Feature | Status |
|---|---|
| YouTube ingestion pipeline | ✅ live |
| Verbatim-quote anti-hallucination | ✅ live |
| Geocoding + Postgres cache | ✅ live |
| Photos via Google Places (proxied) | ✅ live |
| Map with numbered pins | ✅ live |
| Reddit + article fetchers | 🚧 code exists, gated off at launch |
| TikTok / Instagram Reels | ⏳ needs yt-dlp + residential proxies |
| Long-form video chunking (>1h) | ⏳ v1.5 |
| Browser extension (one-click from YouTube) | 📅 v2 |
| Mobile native (iOS share-sheet) | 📅 v2 |
| Creator-claim flow (creators "own" their pages) | 📅 v2 |

---

## 🛣 Roadmap

- [ ] **Chunking for long videos** — split via `startOffset`/`endOffset`, ingest in parallel, merge results. Unblocks Mark Wiens documentaries.
- [ ] **TikTok / Reels** — yt-dlp + residential-proxy fetcher, Gemini Files API upload.
- [ ] **Browser extension** — one-click pin from any YouTube page (uses the user's session, bypasses bot detection).
- [ ] **Creator claim flow** — verified creator badges + control over their own pin pages.
- [ ] **Public REST API** — let others build atop the data.
- [ ] **City "tour" routes** — auto-suggest a walking order for nearby pins.

Have ideas? [Open an issue](https://github.com/OvergrownBaby/thefoodcrawl/issues) or send a PR.

---

## 🤝 Contributing

PRs welcome, especially on:

- New source fetchers (TikTok, Instagram, Bilibili, Xiaohongshu)
- Better restaurant deduplication (across spelling variants)
- Map style improvements
- Better hallucination defenses
- Internationalization

Just `npm install && npm run dev`. Schema lives in
`/supabase/migrations` (or apply via the [Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp)).
Quick smoke-test path: `npm run seed:one -- <url>`.

### Creator removal policy

If you're a creator and want a pin or your channel removed from Foodcrawl,
[open an issue](https://github.com/OvergrownBaby/thefoodcrawl/issues) and we'll
remove it within 24 hours. No questions, no friction. This isn't a fight.

---

## 📜 License

[AGPL-3.0-or-later](LICENSE). You can use, modify, and self-host Foodcrawl for
any purpose — including commercial — but if you run a modified version as a
network service, you must publish your modifications under the same license.

This means a hobbyist can fork Foodcrawl and host it for themselves freely, but a
VC-backed clone that wants to slap a paywall on top has to share their
improvements back with the community.

---

<div align="center">
  <sub>Made by <a href="https://github.com/OvergrownBaby">@OvergrownBaby</a> on a weekend.</sub><br/>
  <sub>No tracking. No ads. No subscription.</sub>
</div>
