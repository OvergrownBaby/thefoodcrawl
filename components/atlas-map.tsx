'use client'

import { useEffect, useRef } from 'react'
import maplibregl, { Map as MLMap, Marker } from 'maplibre-gl'
import type { Restaurant } from '@/lib/types'
import { photoUrl } from '@/lib/photo'

type Props = {
  restaurants: Restaurant[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  // Initial view
  center?: [number, number]
  zoom?: number
  // Visual mode for hero embeds
  interactive?: boolean
  className?: string
  // Number each pin (1,2,3...) by its index in `restaurants`.
  numbered?: boolean
  // Render as a 3D globe (Radio Garden style) instead of flat Mercator.
  // Useful when pins span multiple continents.
  globe?: boolean
}

const TILE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        // Carto Voyager — muted-colour editorial basemap. Soft green parks,
        // pale blue water, beige roads — distinct enough to read as a real
        // city, neutral enough that cinnabar pins still pop. Used by NYT,
        // Eater regional sites, several food media maps.
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors · © CARTO',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
}

export function AtlasMap({
  restaurants,
  selectedId,
  onSelect,
  center,
  zoom,
  interactive = true,
  className,
  numbered = false,
  globe = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const markersRef = useRef<Map<string, Marker>>(new Map())

  // Initial map setup — once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Globe defaults: zoom out and center over food-content gravity (SE Asia).
    // 2D defaults: HK at street-level zoom.
    const initCenter: [number, number] = center ?? (globe ? [100, 15] : [114.17, 22.30])
    const initZoom = zoom ?? (globe ? 1.8 : 11)

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: TILE_STYLE,
      center: initCenter,
      zoom: initZoom,
      attributionControl: { compact: true },
      interactive,
      renderWorldCopies: false,
      // Radio Garden style: spinnable 3D globe for cross-continent atlases.
      ...(globe ? { projection: { type: 'globe' as const } } : {}),
    })

    if (interactive) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    }

    mapRef.current = map
    const markers = markersRef.current

    return () => {
      markers.forEach((m) => m.remove())
      markers.clear()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync markers to restaurants list
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const seen = new Set<string>()
    let idx = 0
    for (const r of restaurants) {
      idx++
      seen.add(r.id)
      const existing = markersRef.current.get(r.id)
      if (existing) {
        existing.setLngLat([r.lng, r.lat])
        continue
      }

      const badge = numbered ? `<span class="fm-marker-num">${idx}</span>` : ''

      // If a selection handler is wired, use a button. Otherwise default to
      // a link that navigates to the place detail page — keeps every map
      // view's pins clickable without forcing every caller to wire onSelect.
      const el = onSelect
        ? document.createElement('button')
        : document.createElement('a')
      if (el instanceof HTMLButtonElement) el.type = 'button'
      if (el instanceof HTMLAnchorElement) el.href = `/p/${r.id}`
      el.className = 'fm-marker'
      el.title = r.name

      const photoSrc = photoUrl(r.photoName, 400)
      const photoBlock = photoSrc
        ? `<span class="fm-marker-card-photo"><img data-src="${photoSrc}" alt="" loading="lazy" /></span>`
        : ''

      el.innerHTML = `
        <span class="fm-marker-pin">${badge}</span>
        <span class="fm-marker-card">
          ${photoBlock}
          <span class="fm-marker-card-meta">
            <span class="fm-marker-card-name">${escapeHtml(r.name)}</span>
            <span class="fm-marker-card-city">${escapeHtml(r.city)}</span>
          </span>
        </span>
      `

      // Lazy-load the photo only when the user actually hovers, so a map with
      // 100+ pins doesn't fetch 100+ images on initial render.
      if (photoSrc) {
        const onceLoad = () => {
          const img = el.querySelector('img[data-src]') as HTMLImageElement | null
          if (img?.dataset.src) {
            img.src = img.dataset.src
            delete img.dataset.src
          }
        }
        el.addEventListener('mouseenter', onceLoad, { once: true })
        el.addEventListener('focus', onceLoad, { once: true })
      }

      if (onSelect) {
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          onSelect(r.id)
        })
      }

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([r.lng, r.lat])
        .addTo(map)
      markersRef.current.set(r.id, marker)
    }

    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
      }
    }

    // Fit bounds if there are markers — but on a globe, skip the fit when
    // pins span continents. Otherwise Mercator's auto-fit zooms out and
    // squashes everything into a horizontal strip. Keep the spinnable
    // default view and let the user rotate to find their region.
    if (restaurants.length > 1 && !selectedId) {
      const lngs = restaurants.map((r) => r.lng)
      const lats = restaurants.map((r) => r.lat)
      const lngSpan = Math.max(...lngs) - Math.min(...lngs)
      const latSpan = Math.max(...lats) - Math.min(...lats)
      const tooSpread = globe && (lngSpan > 30 || latSpan > 30)
      if (!tooSpread) {
        const bounds = new maplibregl.LngLatBounds()
        for (const r of restaurants) bounds.extend([r.lng, r.lat])
        map.fitBounds(bounds, { padding: 80, duration: 500, maxZoom: 14 })
      }
    } else if (restaurants.length === 1) {
      map.flyTo({ center: [restaurants[0].lng, restaurants[0].lat], zoom: 14, duration: 500 })
    }
  }, [restaurants, onSelect, selectedId, numbered])

  // Highlight selected
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const el = marker.getElement()
      if (id === selectedId) {
        el.classList.add('fm-marker-selected')
        const r = restaurants.find((x) => x.id === id)
        if (r) mapRef.current?.flyTo({ center: [r.lng, r.lat], zoom: 15, duration: 600 })
      } else {
        el.classList.remove('fm-marker-selected')
      }
    }
  }, [selectedId, restaurants])

  return (
    <div className={className}>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!))
}
