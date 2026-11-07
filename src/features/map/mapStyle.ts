// Builds the map style: OpenFreeMap's Liberty style (vector tiles, CORS-open, no key), recoloured to the
// BirdQuest palette. Only colours and visibility change, so the layers keep working when Liberty updates.
// Source layers and classes come from the map audit (CLAUDE.md "Facts learned").
import type { StyleSpecification, LayerSpecification } from 'maplibre-gl'

export const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

const C = {
  grass: '#c9de97',
  park: '#a8cf78',
  wood: '#6da553',
  wetland: '#9cc9a0',
  sand: '#efe0a6',
  water: '#6fb7cf',
  waterLine: '#3f8eac',
  residential: '#efe6c2',
  civic: '#ead7b0',
  road: '#fbf4d8',
  majorRoad: '#f6e3a8',
  casing: '#b99a68',
  path: '#fbf4d8',
  rail: '#9a8f7a',
  building: '#e5b497',
  buildingLine: '#9c6449',
  ink: '#213b32',
  halo: '#fffbef',
}

type AnyLayer = LayerSpecification & { 'source-layer'?: string; paint?: Record<string, unknown>; layout?: Record<string, unknown> }

const hide = (l: AnyLayer): AnyLayer => ({ ...l, layout: { ...(l.layout ?? {}), visibility: 'none' } })
const paint = (l: AnyLayer, p: Record<string, unknown>): AnyLayer => ({ ...l, paint: { ...(l.paint ?? {}), ...p } }) as AnyLayer

function restyleLayer(l: AnyLayer): AnyLayer | null {
  const src = l['source-layer'] ?? ''
  const id = l.id
  switch (l.type) {
    case 'background':
      return paint(l, { 'background-color': C.grass })
    case 'raster':
      return hide(l)
    case 'fill-extrusion':
      return null // no 3D buildings
    case 'fill':
      if (src === 'water') return paint(l, { 'fill-color': C.water, 'fill-outline-color': C.waterLine, 'fill-opacity': 1 })
      if (src === 'park') return paint(l, { 'fill-color': C.park, 'fill-opacity': 1, 'fill-outline-color': C.wood })
      if (src === 'landcover')
        return paint(l, {
          'fill-color': ['match', ['get', 'class'], 'wood', C.wood, 'wetland', C.wetland, 'sand', C.sand, 'ice', '#f2f4f2', C.park],
          'fill-opacity': 1,
        })
      if (src === 'landuse')
        return paint(l, {
          'fill-color': ['match', ['get', 'class'], 'residential', C.residential, 'cemetery', C.park, 'pitch', C.park, 'track', C.park, C.civic],
          'fill-opacity': 0.9,
        })
      if (src === 'building') return paint(l, { 'fill-color': C.building, 'fill-outline-color': C.buildingLine, 'fill-opacity': 1 })
      if (src === 'aeroway') return paint(l, { 'fill-color': C.civic })
      return l
    case 'line':
      if (src === 'waterway') return paint(l, { 'line-color': C.water })
      if (src === 'boundary') return hide(l)
      if (src === 'transportation') {
        if (/rail|transit/.test(id)) return paint(l, { 'line-color': C.rail })
        if (/casing/.test(id)) return paint(l, { 'line-color': C.casing })
        if (/path|pedestrian|track|footway|cycleway/.test(id)) return paint(l, { 'line-color': C.path })
        if (/motorway|trunk|primary/.test(id)) return paint(l, { 'line-color': C.majorRoad })
        return paint(l, { 'line-color': C.road })
      }
      return l
    case 'symbol':
      if (src === 'place' || src === 'water_name')
        return paint(l, { 'text-color': src === 'water_name' ? C.waterLine : C.ink, 'text-halo-color': C.halo, 'text-halo-width': 1.6 })
      return hide(l) // POIs, road names, shields, airports: keep the map quiet so the birds stand out
    default:
      return l
  }
}

export async function loadBirdQuestStyle(): Promise<StyleSpecification> {
  const r = await fetch(STYLE_URL)
  if (!r.ok) throw new Error(`map style ${r.status}`)
  const style = (await r.json()) as StyleSpecification
  const layers = (style.layers as AnyLayer[]).map(restyleLayer).filter((l): l is AnyLayer => !!l)
  return { ...style, layers: layers as LayerSpecification[] }
}

/** Used when the tiles can't be reached: plain grass, so pins, birds and the quest card still work. */
export const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': C.grass } }],
}
