import type { MetadataRoute } from 'next'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thefoodcrawl.com').replace(/\/+$/, '')

// Answer-engine / AI crawlers we explicitly welcome — this is the GEO play.
// If these can't crawl the per-creator/city/place pages, Foodcrawl can't get
// cited when someone asks ChatGPT/Perplexity/Gemini "where did X eat in Y".
const AI_BOTS = [
  'GPTBot',           // OpenAI training
  'OAI-SearchBot',    // ChatGPT search
  'ChatGPT-User',     // ChatGPT browsing on a user's behalf
  'ClaudeBot',        // Anthropic
  'anthropic-ai',
  'Claude-User',
  'PerplexityBot',    // Perplexity index
  'Perplexity-User',  // Perplexity live fetch
  'Google-Extended',  // Gemini / Google AI surfaces
  'Applebot-Extended',
  'CCBot',            // Common Crawl (feeds many open models)
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/proto'] },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: '/', disallow: ['/api/'] })),
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
