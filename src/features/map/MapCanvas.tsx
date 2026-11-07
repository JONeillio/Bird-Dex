import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { FALLBACK_STYLE, loadBirdQuestStyle } from './mapStyle'
import { BirdLife, type LifeSite } from './birdLife'
import { MAP_ART, spriteImg } from '../../art/mapAssets'
import type { LngLat } from '../../data/published-schema'
import type { SiteView } from '../../domain/ranking'

export interface PinView {
  view: SiteView
  lureSrc: string | null
  label: string
  isTarget: boolean
  /** Lower-ranked sites are drawn as small dots to keep the map readable. */
  compact: boolean
}

// After bundling, MapLibre can't find its worker next to itself; point it at the emitted file.
maplibregl.setWorkerUrl(workerUrl)

const ATTRIBUTION = [
  'Sightings: <a href="https://ebird.org" target="_blank" rel="noopener">eBird</a>',
  'Drive times © <a href="https://openrouteservice.org" target="_blank" rel="noopener">openrouteservice</a> by HeiGIT | Data from OpenStreetMap',
]

/** Map pixels drawn chunky: device pixels per map pixel is a whole number (gotcha 7: integer scales only). */
function chunkyPixelRatio(): number {
  const dpr = window.devicePixelRatio || 1
  return Math.max(0.5, dpr / Math.max(2, Math.round(dpr + 0.4)))
}

export default function MapCanvas({ centre, zoom, start, startLabel, pins, life, selectedId, onSelect, fitKey }: {
  centre: LngLat
  zoom: number
  start: LngLat
  startLabel: string
  pins: PinView[]
  life: LifeSite[]
  selectedId: string | null
  onSelect: (siteId: string | null) => void
  fitKey: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const lifeRef = useRef<BirdLife | null>(null)
  const pinMarkers = useRef<maplibregl.Marker[]>([])
  const startMarker = useRef<maplibregl.Marker | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create the map once.
  useEffect(() => {
    let dead = false
    let map: maplibregl.Map | null = null
    loadBirdQuestStyle()
      .catch(() => {
        if (!dead) setError('Map tiles could not load, so streets are hidden. Sites and birds still work.')
        return FALLBACK_STYLE
      })
      .then((style) => {
        if (dead || !box.current) return
        map = new maplibregl.Map({
          container: box.current,
          style,
          center: centre,
          zoom,
          pixelRatio: chunkyPixelRatio(),
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          maxPitch: 0,
        })
        map.touchZoomRotate.disableRotation()
        map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: ATTRIBUTION }), 'top-right')
        map.on('load', () => {
          if (dead) return
          // Start with the credits folded behind the (i) button so they don't cover the map.
          box.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
          setReady(true)
        })
        map.on('click', () => onSelectRef.current(null))
        mapRef.current = map
        lifeRef.current = new BirdLife(map, (id) => onSelectRef.current(id))
      })
      .catch(() => !dead && setError('The map could not start on this device.'))
    return () => {
      dead = true
      lifeRef.current?.destroy()
      lifeRef.current = null
      map?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Start point marker.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    startMarker.current?.remove()
    const el = document.createElement('div')
    el.className = 'start-pin'
    el.textContent = startLabel
    startMarker.current = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(start).addTo(map)
  }, [ready, start, startLabel])

  // Site pins.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    pinMarkers.current.forEach((m) => m.remove())
    pinMarkers.current = pins.map((p) => {
      const el = document.createElement('button')
      el.type = 'button'
      const sel = p.view.site.id === selectedId
      el.setAttribute('aria-label', p.label)
      if (p.compact) {
        // Lower-ranked sites: the small pixel binoculars pin (tip = the coordinate). Selected beats target
        // beats normal: the selected art carries a ring; a flag keeps marking a target.
        el.className = `mini${sel ? ' selected' : ''}${p.isTarget ? ' target' : ''}`
        el.innerHTML = spriteImg(sel ? MAP_ART.siteMarkerSelected : MAP_ART.siteMarker, 2) + (p.isTarget ? spriteImg(MAP_ART.targetFlag, 1, 'mini-flag') : '')
      } else {
        el.className = `pin${sel ? ' selected' : ''}${p.isTarget ? ' target' : ''}`
        const n = p.view.newIds.length
        el.innerHTML =
          `<span class="pin-body">${p.lureSrc ? `<img src="${p.lureSrc}" width="32" height="32" alt="" draggable="false">` : ''}</span>` +
          (n ? `<span class="pin-badge">${n} NEW</span>` : '') +
          (p.isTarget ? spriteImg(MAP_ART.targetFlag, 2, 'pin-flag') : '')
      }
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        onSelectRef.current(p.view.site.id)
      })
      return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(p.view.site.point).addTo(map)
    })
  }, [ready, pins, selectedId])

  // Bird sprites.
  useEffect(() => {
    if (ready) lifeRef.current?.setSites(life)
  }, [ready, life])

  // Fit to the start point and every shown site when the location or filters change.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const b = new maplibregl.LngLatBounds(start, start)
    pins.forEach((p) => b.extend(p.view.site.point))
    map.fitBounds(b, { padding: { top: 50, bottom: 190, left: 40, right: 40 }, maxZoom: 13, duration: 700 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitKey])

  // Centre the selected site above the sheet.
  useEffect(() => {
    const map = mapRef.current
    const p = pins.find((x) => x.view.site.id === selectedId)
    if (!ready || !map || !p) return
    map.easeTo({ center: p.view.site.point, zoom: Math.max(map.getZoom(), 12), offset: [0, -120], duration: 600 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedId])

  return (
    <div className="map-box">
      <div ref={box} className="map-canvas" />
      {!ready && !error && <div className="map-note">Loading the map…</div>}
      {error && <div className="map-note map-error">{error}</div>}
    </div>
  )
}
