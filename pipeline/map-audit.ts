// T0.6: audit the OpenFreeMap Liberty style so the Field and Adventure skins are built on facts.
import { timedFetch, writeReport } from './lib/http.ts'

const STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const report: Record<string, unknown> = {}
const lines: string[] = ['# Map audit (OpenFreeMap Liberty)', '', `Run: ${new Date().toISOString()}`, '']

interface Layer {
  id: string
  type: string
  source?: string
  'source-layer'?: string
  filter?: unknown
  minzoom?: number
}

/** Collect string values compared against "class" in a style filter. */
function classValues(f: unknown, out: Set<string>): void {
  if (!Array.isArray(f)) return
  const [op, a, b] = f as unknown[]
  const isClass = (x: unknown) => x === 'class' || (Array.isArray(x) && x[0] === 'get' && x[1] === 'class')
  if ((op === '==' || op === '!=') && isClass(a) && typeof b === 'string') out.add(b)
  if ((op === 'in' || op === '!in') && (isClass(a) || (Array.isArray(a) && isClass(a)))) {
    for (const v of f.slice(2)) if (typeof v === 'string') out.add(v)
  }
  if (op === 'match' && isClass(a)) for (const v of f.slice(2)) { if (typeof v === 'string') out.add(v); if (Array.isArray(v)) for (const s of v) if (typeof s === 'string') out.add(s) }
  for (const x of f) classValues(x, out)
}

async function main(): Promise<void> {
  const s = await timedFetch(STYLE)
  const style = (s.json ?? {}) as { sources?: Record<string, { type: string; url?: string; tiles?: string[]; attribution?: string }>; layers?: Layer[]; glyphs?: string; sprite?: string; version?: number }
  const layers = style.layers ?? []
  if (!s.ok) process.exitCode = 1 // fail the run rather than save an empty report
  report.style = { error: s.error, status: s.status, ms: s.ms, kb: Math.round(s.bytes / 102.4) / 10, version: style.version, layerCount: layers.length, glyphs: style.glyphs, sprite: style.sprite, sources: style.sources }

  const bySourceLayer: Record<string, { types: string[]; classes: string[]; count: number }> = {}
  for (const l of layers) {
    const k = l['source-layer'] ?? '(none)'
    const e = (bySourceLayer[k] ??= { types: [], classes: [], count: 0 })
    e.count++
    if (!e.types.includes(l.type)) e.types.push(l.type)
    const set = new Set(e.classes)
    classValues(l.filter, set)
    e.classes = [...set].sort()
  }
  report.sourceLayersUsedByStyle = bySourceLayer
  report.layerIdsByType = layers.reduce<Record<string, string[]>>((acc, l) => ((acc[l.type] ??= []).push(l.id), acc), {})

  // TileJSON for the vector source
  const src = Object.values(style.sources ?? {}).find((x) => x.type === 'vector')
  if (src?.url) {
    const tj = await timedFetch(src.url)
    const t = (tj.json ?? {}) as { tiles?: string[]; vector_layers?: { id: string; fields?: Record<string, string> }[]; attribution?: string; minzoom?: number; maxzoom?: number; bounds?: number[] }
    report.tilejson = {
      status: tj.status, ms: tj.ms, attribution: t.attribution, minzoom: t.minzoom, maxzoom: t.maxzoom, tileTemplate: t.tiles?.[0],
      vectorLayers: (t.vector_layers ?? []).map((v) => ({ id: v.id, fields: Object.keys(v.fields ?? {}) })),
    }
    // One real tile near Chorlton at z14 (x/y computed), check size and CORS
    const z = 14
    const lat = 53.4412, lng = -2.2735
    const x = Math.floor(((lng + 180) / 360) * 2 ** z)
    const y = Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z)
    const tpl = t.tiles?.[0]
    if (tpl) {
      const url = tpl.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y))
      const tile = await timedFetch(url, { headers: { Origin: 'https://joneillio.github.io' } }, 'bytes')
      report.tileSample = { z, x, y, status: tile.status, ms: tile.ms, kb: Math.round(tile.bytes / 102.4) / 10, headers: tile.headers }
    }
  }

  // One glyph range for the first font stack found
  const fontStack = layers.map((l) => (l as unknown as { layout?: { 'text-font'?: string[] } }).layout?.['text-font']?.[0]).find(Boolean)
  if (style.glyphs && fontStack) {
    const url = style.glyphs.replace('{fontstack}', encodeURIComponent(fontStack)).replace('{range}', '0-255')
    const g = await timedFetch(url, { headers: { Origin: 'https://joneillio.github.io' } }, 'bytes')
    report.glyphSample = { fontStack, status: g.status, ms: g.ms, kb: Math.round(g.bytes / 102.4) / 10, headers: g.headers }
  }

  lines.push('```json', JSON.stringify(report, null, 1), '```')
  writeReport('map-audit', report, lines.join('\n'))
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e))
  process.exitCode = 1
})
