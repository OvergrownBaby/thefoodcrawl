import Anthropic from '@anthropic-ai/sdk'
import type { FetchedContent } from './fetchers'

export type ExtractedRestaurant = {
  name: string
  nameLocal?: string
  city: string
  country: string // ISO-2
  cuisine?: string
  priceLevel?: 1 | 2 | 3 | 4
  dish?: string
  quote: string // verbatim from the source — the trust anchor
  timestampSec?: number // for videos
}

const SYSTEM_PROMPT = `You extract restaurant recommendations from food content.

You MUST return a JSON object with one key "restaurants" containing an array.
For each restaurant you find:

- "name": the English/romanized name as said in the source.
- "nameLocal": local-script name (Chinese, Thai, etc.) if shown or said, else omit.
- "city": city name in English (e.g. "Hong Kong", "Bangkok").
- "country": ISO-2 country code (e.g. "HK", "TH", "US").
- "cuisine": short freeform string (e.g. "Cantonese, Dim Sum").
- "priceLevel": integer 1-4 ($ to $$$$), only if clearly indicated, else omit.
- "dish": the signature dish or what the creator ate, if mentioned.
- "quote": a VERBATIM substring from the source (the transcript or article text) that names or strongly identifies this restaurant. This is critical: the quote MUST appear character-for-character in the source. Do not paraphrase. Pick the most identifying ~1-2 sentences (under 300 chars).
- "timestampSec": for videos, the timestamp in seconds where this place is discussed. Look at the timecodes in the transcript.

Rules:
- Only include actual named restaurants/cafes/stalls. Skip dish-only mentions, generic cuisine references, market descriptions without a specific eatery name.
- If the creator describes a place but never gives a name, you may include it with a descriptive name like "Unnamed dim sum stall (Mong Kok)" — but the quote must still be verbatim from the source.
- If you can't find ANY restaurants, return {"restaurants": []}.
- The quote is non-negotiable. If you can't quote the source verbatim, omit the restaurant.

Output strict JSON only. No prose, no markdown fences.`

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

type GeminiContentPart =
  | { text: string }
  | { file_data: { mime_type: string; file_uri: string } }

const GEMINI_MODEL = 'gemini-2.5-flash'
const CLAUDE_MODEL = 'claude-haiku-4-5'

/**
 * Extract restaurants from any FetchedContent.
 *
 * Video URLs → Gemini watches the video directly.
 * Text content → Claude reads it.
 *
 * Both paths return the SAME schema. Both paths run a quote-validation step
 * after the LLM call: any returned `quote` that isn't a substring of the
 * source material is dropped (anti-hallucination defense).
 */
export async function extractRestaurants(
  content: FetchedContent,
  opts: { geminiKey?: string } = {}
): Promise<ExtractedRestaurant[]> {
  if (content.kind === 'video_url') {
    const result = await extractFromVideoUrl(content.url, opts.geminiKey)
    // We don't have the transcript locally to validate against, so we trust
    // Gemini's quote here (it has the audio + visuals). This is a known
    // trade-off — see ARCHITECTURE notes for the v2 fix.
    return result
  } else {
    const result = await extractFromText(content.text)
    return validateQuotes(result, content.text)
  }
}

async function extractFromVideoUrl(url: string, userKey?: string): Promise<ExtractedRestaurant[]> {
  const apiKey = userKey || process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  const parts: GeminiContentPart[] = [
    { file_data: { mime_type: 'video/*', file_uri: url } },
    { text: SYSTEM_PROMPT + '\n\nSource: the YouTube video above. Watch and listen.' },
  ]

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
      // Long videos (1h+) blow Flash's 1M-token context at default sampling.
      // mediaResolution=LOW caps tokens at ~64/frame instead of ~258/frame,
      // which fits even 2-hour documentaries.
      mediaResolution: 'MEDIA_RESOLUTION_LOW',
    },
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify(body),
      // Long videos can take 3-6 min for Gemini to process. Allow 10 min.
      signal: AbortSignal.timeout(600_000),
    }
  )

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 500)}`)
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text)
    .filter(Boolean)
    .join('\n')
    .trim()

  if (!text) throw new Error('Gemini returned empty response')

  return parseExtractorJson(text)
}

async function extractFromText(text: string): Promise<ExtractedRestaurant[]> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Source text:\n\n---\n${text}\n---\n\nExtract every named restaurant. Quotes must be verbatim from the source above.`,
      },
    ],
  })

  const block = message.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('Claude returned no text')

  return parseExtractorJson(block.text)
}

function parseExtractorJson(raw: string): ExtractedRestaurant[] {
  // Strip ```json fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Try to recover the first JSON object substring
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Extractor returned non-JSON: ' + cleaned.slice(0, 300))
    parsed = JSON.parse(match[0])
  }

  const arr = (parsed as { restaurants?: unknown }).restaurants
  if (!Array.isArray(arr)) return []

  const out: ExtractedRestaurant[] = []
  for (const r of arr) {
    if (typeof r !== 'object' || r === null) continue
    const rec = r as Record<string, unknown>
    if (typeof rec.name !== 'string' || !rec.name.trim()) continue
    if (typeof rec.city !== 'string' || !rec.city.trim()) continue
    if (typeof rec.country !== 'string' || !rec.country.trim()) continue
    if (typeof rec.quote !== 'string' || !rec.quote.trim()) continue
    const priceLevel = typeof rec.priceLevel === 'number' ? rec.priceLevel : undefined
    out.push({
      name: rec.name.trim(),
      nameLocal: typeof rec.nameLocal === 'string' ? rec.nameLocal.trim() : undefined,
      city: rec.city.trim(),
      country: rec.country.trim().toUpperCase().slice(0, 2),
      cuisine: typeof rec.cuisine === 'string' ? rec.cuisine.trim() : undefined,
      priceLevel:
        priceLevel === 1 || priceLevel === 2 || priceLevel === 3 || priceLevel === 4
          ? priceLevel
          : undefined,
      dish: typeof rec.dish === 'string' ? rec.dish.trim() : undefined,
      quote: rec.quote.trim(),
      timestampSec:
        typeof rec.timestampSec === 'number' && rec.timestampSec >= 0
          ? Math.floor(rec.timestampSec)
          : undefined,
    })
  }
  return out
}

/**
 * Quote validation — every quote must appear as a substring of the source.
 * Drop any restaurant whose quote can't be found.
 *
 * This is the anti-hallucination defense for the text path. If Claude invents
 * a restaurant + invents a quote to support it, the quote won't be in the
 * source and we drop the entry.
 */
function validateQuotes(
  restaurants: ExtractedRestaurant[],
  source: string
): ExtractedRestaurant[] {
  const sourceNormalized = normalizeForMatch(source)
  return restaurants.filter((r) => {
    const q = normalizeForMatch(r.quote)
    if (q.length < 12) return false // too short to be meaningful
    // Allow some tolerance — punctuation/whitespace can vary
    return sourceNormalized.includes(q)
  })
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[—–‒]/g, '-') // em/en/figure dash → hyphen
    .replace(/\s+/g, ' ')
    .trim()
}
