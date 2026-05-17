'use client'

import { useEffect, useRef } from 'react'
import maplibregl, { Map as MLMap, Marker } from 'maplibre-gl'
import type { Restaurant } from '@/lib/types'

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
  // Draw a dashed polyline connecting pins in the given order
  routeOrder?: string[]
  // Number each pin (e.g. 1,2,3...) in the polyline order
  numbered?: boolean
}

const TILE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        // Carto Voyager — warm, clean, free for non-commercial. Good for v1.
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
  routeOrder,
  numbered = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const markersRef = useRef<Map<string, Marker>>(new Map())

  // Initial map setup — once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const initCenter: [number, number] = center ?? [114.17, 22.30] // HK
    const initZoom = zoom ?? 11

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: TILE_STYLE,
      center: initCenter,
      zoom: initZoom,
      attributionControl: { compact: true },
      interactive,
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
    for (const r of restaurants) {
      seen.add(r.id)
      const existing = markersRef.current.get(r.id)
      if (existing) {
        existing.setLngLat([r.lng, r.lat])
        continue
      }

      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'fm-marker'
      el.title = r.name
      // staggered animation delay so pulses don't sync
      const delay = ((parseInt(r.id.replace(/\D/g, '').slice(-2) || '0', 10)) % 24) / 10
      const order = numbered && routeOrder ? routeOrder.indexOf(r.id) + 1 : 0
      const badge = order > 0 ? `<span class="fm-marker-num">${order}</span>` : ''
      el.innerHTML = `
        <span class="fm-marker-pin">
          <span class="fm-marker-pulse" style="animation-delay:${delay}s"></span>
          <span class="fm-marker-pin-body">${badge}</span>
        </span>
        <span class="fm-marker-label">${escapeHtml(r.name)}</span>
      `
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        onSelect?.(r.id)
      })

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
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

    // Fit bounds if there are markers
    if (restaurants.length > 1 && !selectedId) {
      const bounds = new maplibregl.LngLatBounds()
      for (const r of restaurants) bounds.extend([r.lng, r.lat])
      map.fitBounds(bounds, { padding: 80, duration: 500, maxZoom: 14 })
    } else if (restaurants.length === 1) {
      map.flyTo({ center: [restaurants[0].lng, restaurants[0].lat], zoom: 14, duration: 500 })
    }
  }, [restaurants, onSelect, selectedId, numbered, routeOrder])

  // Route polyline — draw a line in routeOrder
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const draw = () => {
      const byId = new Map(restaurants.map((r) => [r.id, r]))
      const ordered: Restaurant[] = []
      if (routeOrder) {
        for (const id of routeOrder) {
          const r = byId.get(id)
          if (r) ordered.push(r)
        }
      }
      const coords = ordered.map((r) => [r.lng, r.lat] as [number, number])

      const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords },
      }

      const existing = map.getSource('fm-route') as maplibregl.GeoJSONSource | undefined
      if (existing) {
        existing.setData(geojson)
      } else {
        map.addSource('fm-route', { type: 'geojson', data: geojson })
        map.addLayer({
          id: 'fm-route-line',
          type: 'line',
          source: 'fm-route',
          paint: {
            'line-color': '#DA3F2A',
            'line-width': 2.5,
            'line-opacity': 0.65,
            'line-dasharray': [2, 2],
          },
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
        })
      }
    }

    if (map.isStyleLoaded()) draw()
    else map.once('load', draw)
  }, [restaurants, routeOrder])

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
