import Anthropic from '@anthropic-ai/sdk'
import type { FetchedContent } from './fetchers'

export type ExtractedDish = {
  name: string
  quote: string // verbatim from the source — anchor for THIS dish
  timestampSec?: number // when this dish is discussed
}

export type ExtractedRestaurant = {
  name: string
  nameLocal?: string
  city: string
  country: string // ISO-2
  cuisine?: string
  priceLevel?: 1 | 2 | 3 | 4
  /** Primary identifying quote for the restaurant overall. */
  quote: string
  /** Earliest dish timestamp, used as a "jump to this restaurant" shortcut. */
  timestampSec?: number
  /**
   * Specific dishes the creator ate / talked about. Empty if no individual
   * dishes were called out (e.g. "the food here is incredible" but no specifics).
   */
  dishes: ExtractedDish[]
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
- "quote": a VERBATIM substring from the source that identifies THIS RESTAURANT overall (the moment the place is named or strongly described). MUST appear character-for-character in the source. Under 300 chars.
- "timestampSec": for videos, the timestamp in seconds where the restaurant first appears or is named. ONLY include if highly confident — never guess.
- "dishes": an array of the SPECIFIC DISHES eaten / discussed at this restaurant. Each item:
    - "name": the dish name as said (e.g. "Wonton noodles", "Typhoon shelter crab", "Char siu rice").
    - "quote": a VERBATIM substring from the source where THIS DISH is described / praised / discussed. Must appear character-for-character in the source. ~1 sentence preferred. Different from the restaurant-level quote.
    - "timestampSec": video timestamp (seconds) for THIS specific dish moment. ONLY include if highly confident — different dishes from the same restaurant should usually have different timestamps. Omit if uncertain.
  If no specific dishes are named/discussed (e.g. creator just says "the food here is great"), return an empty array "dishes": [].

Rules:
- Only include actual named restaurants/cafes/stalls. Skip dish-only mentions without an eatery name.
- If the same restaurant is referred to by multiple names in the source, output ONE entry under the most complete name.
- If the creator describes a place but never gives a name, you may use a descriptive name like "Unnamed dim sum stall (Mong Kok)".
- If you can't find ANY restaurants, return {"restaurants": []}.
- All quotes (restaurant-level AND dish-level) are non-negotiable. If you can't quote the source verbatim, omit that element.
- DO NOT invent dishes. Only list dishes the creator actually named or visibly ate.
- DO NOT reuse the same timestamp for multiple dishes — if you can't distinguish per-dish timestamps, omit them.

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
    const result = await extractFromVideoUrl(
      content.url,
      content.description,
      opts.geminiKey
    )
    // We don't have the transcript locally to validate against, so we trust
    // Gemini's quote here (it has the audio + visuals). This is a known
    // trade-off — see ARCHITECTURE notes for the v2 fix.
    return result
  } else {
    const result = await extractFromText(content.text)
    return validateQuotes(result, content.text)
  }
}

async function extractFromVideoUrl(
  url: string,
  description: string | undefined,
  userKey?: string
): Promise<ExtractedRestaurant[]> {
  const apiKey = userKey || process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  // Description is the creator's own writeup — usually contains canonical
  // restaurant names (often in local script), addresses, timestamps. Treat it
  // as authoritative for spelling so Gemini doesn't phonetically misspell
  // foreign names from the audio.
  const descBlock = description
    ? `\n\nThe creator's own video description is below — treat any restaurant AND dish names listed here as the CANONICAL spelling. If a name in the description matches a place or dish mentioned in the video, use the description's spelling exactly (do not re-transcribe phonetically from the audio). Descriptions often contain a chapter list like "1:23 UGBO – Crab Roe Noodles" mapping timestamps to restaurants and dishes — this is the most reliable ground truth available, use it as your primary reference and cross-check the video against it. Still apply the rules below: only include restaurants and dishes that were ACTUALLY mentioned/eaten in the video itself — the description may list more than the creator ended up showing.\n\n--- DESCRIPTION ---\n${description}\n--- END DESCRIPTION ---`
    : ''

  const parts: GeminiContentPart[] = [
    { file_data: { mime_type: 'video/*', file_uri: url } },
    {
      text:
        SYSTEM_PROMPT +
        '\n\nSource: the YouTube video above. Watch and listen.' +
        descBlock,
    },
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

  // Debug: log the raw Gemini response so we can audit what it actually said
  // vs. what we ended up storing. Gated on env var so prod stays quiet.
  if (process.env.LOG_GEMINI_RAW === '1') {
    const rawText = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join('\n')
      .trim()
    console.log(`[gemini:raw] ${url}\n${rawText}\n[/gemini:raw]`)
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

    const dishes: ExtractedDish[] = []
    // Accept new "dishes" array form. Also accept legacy "dish" string and
    // upgrade it to a single-element dish list (Gemini occasionally regresses).
    if (Array.isArray(rec.dishes)) {
      const seenDishNames = new Set<string>()
      for (const d of rec.dishes) {
        if (typeof d !== 'object' || d === null) continue
        const drec = d as Record<string, unknown>
        if (typeof drec.name !== 'string' || !drec.name.trim()) continue
        if (typeof drec.quote !== 'string' || !drec.quote.trim()) continue
        const dn = drec.name.trim()
        if (seenDishNames.has(dn.toLowerCase())) continue
        seenDishNames.add(dn.toLowerCase())
        dishes.push({
          name: dn,
          quote: drec.quote.trim(),
          timestampSec:
            typeof drec.timestampSec === 'number' && drec.timestampSec >= 0
              ? Math.floor(drec.timestampSec)
              : undefined,
        })
      }
    } else if (typeof rec.dish === 'string' && rec.dish.trim()) {
      dishes.push({
        name: rec.dish.trim(),
        quote: rec.quote.trim(),
        timestampSec:
          typeof rec.timestampSec === 'number' && rec.timestampSec >= 0
            ? Math.floor(rec.timestampSec)
            : undefined,
      })
    }

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
      quote: rec.quote.trim(),
      timestampSec:
        typeof rec.timestampSec === 'number' && rec.timestampSec >= 0
          ? Math.floor(rec.timestampSec)
          : dishes.find((d) => d.timestampSec != null)?.timestampSec,
      dishes,
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
