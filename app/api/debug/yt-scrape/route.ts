/**
 * TEMPORARY: verify the YouTube watch-page scrape works from a Vercel IP.
 * Hit with ?url=<youtube-url>. Returns what fetchYouTube extracts. Remove
 * after the consent-cookie fix is confirmed.
 */
import { fetchYouTube } from '@/lib/fetchers/youtube'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url')
  if (!url) return Response.json({ error: 'pass ?url=' }, { status: 400 })

  try {
    const result = await fetchYouTube(url)
    return Response.json({
      title: result.title,
      channelName: 'channelName' in result ? result.channelName : null,
      channelId: 'channelId' in result ? result.channelId : null,
      descriptionLen: 'description' in result ? (result.description?.length ?? 0) : 0,
      descriptionSnippet:
        'description' in result ? result.description?.slice(0, 200) ?? null : null,
    })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
