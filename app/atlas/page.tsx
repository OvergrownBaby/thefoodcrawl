import { getAtlas, listCreators } from '@/lib/data'
import { AtlasView } from '@/components/atlas-view'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Atlas — Foodcrawl',
}

export default async function AtlasPage() {
  const [restaurants, creators] = await Promise.all([getAtlas(), listCreators()])
  return (
    <div className="h-[calc(100dvh-3.5rem)] flex">
      <AtlasView restaurants={restaurants} creators={creators} />
    </div>
  )
}
