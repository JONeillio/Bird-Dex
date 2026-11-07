import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { FALLBACK_STYLE, loadBirdQuestStyle } from './mapStyle'
import { MAP_ART, spriteImg } from '../../art/mapAssets'
import { clusterByOverlap } from '../../domain/cluster'
import type { LngLat } from '../../data/published-schema'

/** One birding site on the map. A marker always means a real site; reports never place a bird. */
export interface MapSite {
  id: string
  point: LngLat
  /** Screen-reader text for the marker. */
  label: string
  isTarget: boolean
  /** Distinct species new to the user at this site (used for a de-duplicated total when sites are grouped). */
  newIds: string[]
}

// After bundling, MapLibre can't find its worker next to itself; point it at the emitted file.
maplibregl.setWorkerUrl(workerUrl)

const ATTRIBUTION = [
  'Sightings: <a href="https://ebird.org" target="_blank" rel="noopener">eBird</a>',
  'Drive times © <a href="https://openrouteservice.org" target="_blank" rel="noopener">openrouteservice</a> by HeiGIT | Data from OpenStreetMap',
]

/** From this zoom a street-level view is reached, so markers are never grouped any more. */
const NO_CLUSTER_ZOOM = 15
const MAX_ZOOM_ON_GROUP = 16

/** Map pixels drawn chunky: device pixels per map pixel is a whole number (gotcha 7: integer scales only). */
function chunkyPixelRatio(): number {
  const dpr = window.devicePixelRatio || 1
  return Math.max(0.5, dpr / Math.max(2, Math.round(dpr + 0.4)))
}

// The selected marker: a coral, outlined pixel pin on a 4px grid (56x68) with the featured bird inside.
// The tip is the bottom centre, so it sits on the site's coordinate.
const SELECTED_SVG =
  '<svg class="mk-sel-shape" width="56" height="68" viewBox="0 0 14 17" shape-rendering="crispEdges" aria-hidden="true">' +
  '<polygon fill="#213b32" points="2,0 12,0 14,2 14,11 12,13 11,13 11,14 10,14 10,15 9,15 9,16 8,16 8,17 6,17 6,16 5,16 5,15 4,15 4,14 3,14 3,13 2,13 0,11 0,2"/>' +
  '<polygon fill="#c96e53" points="3,1 11,1 13,3 13,10 11,12 10,12 10,13 9,13 9,14 8,14 8,16 6,16 6,14 5,14 5,13 4,13 4,12 3,12 1,10 1,3"/>' +
  '<rect fill="#fffbef" x="2" y="2" width="10" height="9"/></svg>'

// Marker footprints on screen, used to decide which markers would overlap. Pins and flags are drawn above
// their coordinate, so the centre of the box sits half a marker height above it.
const PIN_HALF_H = 20
const SELECTED_W = 64
const SELECTED_H = 76

export default function MapCanvas({ sites, start, startLabel, centre, zoom, activeId, featuredSrc, onSelect, onOpen, focusNonce, fitKey, insetBottom }: {
  sites: MapSite[]
  start: LngLat
  startLabel: string
  centre: LngLat
  zoom: number
  /** The one selected site (always set when there are sites). */
  activeId: string | null
  /** Image of the selected site's featured bird. */
  featuredSrc: string | null
  onSelect: (siteId: string) => void
  /** Tapping the selected marker opens its details. */
  onOpen: () => void
  /** Bumps when the user picks a site, so the camera brings it into the open part of the map. */
  focusNonce: number
  fitKey: string
  /** Height covered by the bottom card, so framing leaves it clear. */
  insetBottom: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const startMarker = useRef<maplibregl.Marker | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen
  const insetRef = useRef(insetBottom)
  insetRef.current = insetBottom
  const sitesRef = useRef(sites)
  sitesRef.current = sites
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewTick, setViewTick] = useState(0)

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
        // Grouping depends on how far apart sites are on screen, so redo it when the zoom or size changes.
        map.on('zoomend', () => setViewTick((t) => t + 1))
        map.on('resize', () => setViewTick((t) => t + 1))
        mapRef.current = map
      })
      .catch(() => !dead && setError('The map could not start on this device.'))
    return () => {
      dead = true
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
    el.title = `Driving from ${startLabel}`
    el.setAttribute('role', 'img')
    el.setAttribute('aria-label', `Driving from ${startLabel}`)
    startMarker.current = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(start).addTo(map)
  }, [ready, start, startLabel])

  // Site markers: one selected, targets as flags, grouped "N spots" where they would overlap, the rest as pins.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    markers.current.forEach((m) => m.remove())
    markers.current = []
    const add = (el: HTMLElement, at: LngLat, anchor: maplibregl.PositionAnchor = 'bottom') => {
      markers.current.push(new maplibregl.Marker({ element: el, anchor }).setLngLat(at).addTo(map))
    }
    const byId = new Map(sites.map((s) => [s.id, s]))

    // Group the other sites by screen overlap. Nothing is ever drawn underneath the selected marker: a single
    // site it would cover folds into a "+N" chip on the selected marker, and a "N spots" marker is nudged
    // sideways (a group marker is only a count, so its exact position does not matter).
    const active = activeId ? byId.get(activeId) : undefined
    const ap = active ? map.project(active.point) : null
    const keepOut = ap ? { l: ap.x - SELECTED_W / 2, r: ap.x + SELECTED_W / 2, t: ap.y - SELECTED_H, b: ap.y } : null
    const items = sites
      .filter((s) => s.id !== activeId)
      .map((s) => {
        const p = map.project(s.point)
        return { id: s.id, x: p.x, y: p.y - PIN_HALF_H }
      })
    const groups = map.getZoom() >= NO_CLUSTER_ZOOM ? items.map((i) => ({ ids: [i.id], x: i.x, y: i.y })) : clusterByOverlap(items)
    const folded: MapSite[] = []

    for (const g of groups) {
      const members = g.ids.map((id) => byId.get(id)!)
      const single = members.length === 1
      const halfW = single ? 16 : 46
      let gx = g.x
      if (keepOut && gx - halfW < keepOut.r && gx + halfW > keepOut.l && g.y - PIN_HALF_H < keepOut.b && g.y + PIN_HALF_H > keepOut.t) {
        if (single) {
          folded.push(members[0])
          continue
        }
        gx = g.x >= ap!.x ? keepOut.r + halfW + 4 : keepOut.l - halfW - 4
      }
      if (single) {
        const s = members[0]
        const el = document.createElement('button')
        el.type = 'button'
        el.setAttribute('aria-label', s.label)
        el.className = `mk ${s.isTarget ? 'mk-target' : 'mk-site'}`
        el.innerHTML = s.isTarget ? spriteImg(MAP_ART.targetFlag, 2) : spriteImg(MAP_ART.siteMarker, 2)
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          onSelectRef.current(s.id)
        })
        add(el, s.point)
      } else {
        const unique = new Set(members.flatMap((s) => s.newIds)).size
        const hasTarget = members.some((s) => s.isTarget)
        const el = document.createElement('button')
        el.type = 'button'
        el.className = 'mk mk-cluster'
        const text = `${members.length} spots, ${unique} species new to you across them. Tap to zoom in.`
        el.setAttribute('aria-label', text)
        el.title = text
        el.innerHTML = `<span class="cl-body"><b>${members.length}</b><span>spots</span></span>` + (hasTarget ? spriteImg(MAP_ART.targetFlag, 1, 'cl-flag') : '')
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          zoomToGroup(members.map((s) => s.point))
        })
        // Centred where the group's markers are on screen.
        const at = map.unproject([gx, g.y])
        add(el, [at.lng, at.lat], 'center')
      }
    }

    if (active) {
      const el = document.createElement('div')
      el.className = 'mk mk-selected'
      const nearby = folded.length ? ` ${folded.length} more ${folded.length === 1 ? 'spot is' : 'spots are'} close by.` : ''
      el.innerHTML =
        SELECTED_SVG +
        (featuredSrc ? `<img class="sel-bird" src="${featuredSrc}" width="32" height="32" alt="" draggable="false">` : spriteImg(MAP_ART.siteMarker, 2, 'sel-glyph')) +
        (active.isTarget ? spriteImg(MAP_ART.targetFlag, 2, 'sel-flag') : '') +
        '<button type="button" class="sel-hit" aria-current="true"></button>' +
        (folded.length ? `<button type="button" class="sel-more">+${folded.length}</button>` : '')
      // Names come from eBird, so they are set as text attributes, never as markup.
      el.querySelector('.sel-hit')!.setAttribute('aria-label', `${active.label}, selected. Open details.${nearby}`)
      el.querySelector('.sel-more')?.setAttribute('aria-label', `${folded.length} more ${folded.length === 1 ? 'spot' : 'spots'} close by. Tap to zoom in.`)
      el.querySelector('.sel-hit')!.addEventListener('click', (e) => {
        e.stopPropagation()
        onOpenRef.current()
      })
      el.querySelector('.sel-more')?.addEventListener('click', (e) => {
        e.stopPropagation()
        zoomToGroup([active.point, ...folded.map((m) => m.point)])
      })
      add(el, active.point)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sites, activeId, featuredSrc, viewTick])

  /** Zoom in on a group so its sites separate. Always zooms in at least one level, never out. */
  function zoomToGroup(points: LngLat[]) {
    const map = mapRef.current
    if (!map) return
    const b = new maplibregl.LngLatBounds(points[0], points[0])
    points.forEach((p) => b.extend(p))
    const here = map.getZoom()
    const cam = map.cameraForBounds(b, { padding: framePadding(insetRef.current), maxZoom: MAX_ZOOM_ON_GROUP })
    const target = Math.min(MAX_ZOOM_ON_GROUP, Math.max(here + 1, cam?.zoom ?? here + 2))
    map.easeTo({ center: b.getCenter(), zoom: target, offset: [0, -insetRef.current / 2], duration: 500 })
  }

  // Fit the start point and every shown site into the open part of the map (above the card) when the
  // location or filters change.
  const insetKey = Math.round(insetBottom / 12)
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const b = new maplibregl.LngLatBounds(start, start)
    sitesRef.current.forEach((s) => b.extend(s.point))
    map.fitBounds(b, { padding: framePadding(insetRef.current), maxZoom: 13, duration: 700 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitKey, insetKey])

  // When the user picks a site, bring it into the middle of the open part of the map.
  useEffect(() => {
    const map = mapRef.current
    const s = sitesRef.current.find((x) => x.id === activeId)
    if (!ready || !map || !s || focusNonce === 0) return
    map.easeTo({ center: s.point, zoom: Math.max(map.getZoom(), 11), offset: [0, -insetRef.current / 2 + 24], duration: 600 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, focusNonce])

  return (
    <div className="map-box">
      <div ref={box} className="map-canvas" />
      {!ready && !error && <div className="map-note">Loading the map…</div>}
      {error && <div className="map-note map-error">{error}</div>}
    </div>
  )
}

/** Edge padding that keeps markers clear of the card, the credits button and the screen edges. */
function framePadding(inset: number): maplibregl.PaddingOptions {
  return { top: 76, bottom: inset + 28, left: 44, right: 44 }
}
