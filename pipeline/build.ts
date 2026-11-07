// Pure transforms from provider responses to the published D1 shape. No network, no disk: tested with
// synthetic fixtures in tests/pipeline.test.ts. Only whitelisted fields are copied; observer names never are.
import type { DriveEntry, LngLat, RegionData, Report, Site } from '../src/data/published-schema.ts'

export interface RawHotspot {
  locId?: unknown
  locName?: unknown
  lat?: unknown
  lng?: unknown
  latestObsDt?: unknown
  numSpeciesAllTime?: unknown
}

export interface RawObs {
  speciesCode?: unknown
  comName?: unknown
  sciName?: unknown
  obsDt?: unknown
  howMany?: unknown
  obsValid?: unknown
  obsReviewed?: unknown
  subId?: unknown
}

export interface CleanHotspot {
  id: string
  name: string
  point: LngLat
  latestObsDate: string | null
  speciesAllTime: number | null
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** "2026-11-05 08:10" or "2026-11-05" -> date and optional time. Never invents midnight. */
export function splitObsDt(v: unknown): { date: string; time: string | null } | null {
  const s = str(v)
  if (!s) return null
  const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/.exec(s)
  return m ? { date: m[1], time: m[2] ?? null } : null
}

/** eBird gives lat/lng fields; we publish [lng, lat]. Converted here, at the edge, only. */
export function cleanHotspot(h: RawHotspot): CleanHotspot | null {
  const id = str(h.locId)
  const name = str(h.locName)
  const lat = num(h.lat)
  const lng = num(h.lng)
  if (!id || !name || lat === null || lng === null) return null
  return {
    id,
    name,
    point: [lng, lat],
    latestObsDate: splitObsDt(h.latestObsDt)?.date ?? null,
    speciesAllTime: num(h.numSpeciesAllTime),
  }
}

/** Busiest sites first (most species ever recorded), then most recently active. */
export function rankHotspots(hs: CleanHotspot[], max: number): CleanHotspot[] {
  return [...hs]
    .sort((a, b) => (b.speciesAllTime ?? 0) - (a.speciesAllTime ?? 0) || (b.latestObsDate ?? '').localeCompare(a.latestObsDate ?? ''))
    .slice(0, max)
}

/** Not a single species: "gull sp.", "Carrion/Hooded Crow", hybrids, domestic types. */
export function isNotASpecies(sciName: string, comName: string): boolean {
  return / sp\.$/.test(sciName) || sciName.includes('/') || / x /.test(sciName) || /domestic/i.test(comName)
}

/** Join to the Starter Dex by scientific name; subspecies forms fall back to the two-word binomial. */
export function dexIdFor(sciName: string, dexBySci: ReadonlyMap<string, string>): string | null {
  const exact = dexBySci.get(sciName)
  if (exact) return exact
  const binomial = sciName.split(' ').slice(0, 2).join(' ')
  return dexBySci.get(binomial) ?? null
}

export function toReports(raw: RawObs[], dexBySci: ReadonlyMap<string, string>): Report[] {
  const out = new Map<string, Report>()
  for (const r of raw) {
    const code = str(r.speciesCode)
    const sci = str(r.sciName)
    const name = str(r.comName)
    const when = splitObsDt(r.obsDt)
    if (!code || !sci || !name || !when) continue
    if (r.obsValid === false) continue
    if (isNotASpecies(sci, name)) continue
    const howMany = num(r.howMany)
    const sub = str(r.subId)
    const report: Report = {
      speciesId: dexIdFor(sci, dexBySci),
      ebirdCode: code,
      name,
      sciName: sci,
      obsDate: when.date,
      obsTime: when.time,
      count: howMany !== null && Number.isInteger(howMany) ? howMany : null, // "X" (present, not counted) -> null
      checklistUrl: sub && /^S\d+$/.test(sub) ? `https://ebird.org/checklist/${sub}` : null,
      reviewed: r.obsReviewed === true,
    }
    const prev = out.get(code)
    if (!prev || prev.obsDate < report.obsDate) out.set(code, report) // keep the newest per species
  }
  return [...out.values()].sort((a, b) => b.obsDate.localeCompare(a.obsDate) || a.name.localeCompare(b.name))
}

export function toSite(h: CleanHotspot, reports: Report[]): Site {
  return {
    id: h.id,
    name: h.name,
    point: h.point,
    url: /^L\d+$/.test(h.id) ? `https://ebird.org/hotspot/${h.id}` : null,
    latestObsDate: h.latestObsDate,
    speciesAllTime: h.speciesAllTime,
    access: 'unknown',
    reports,
  }
}

/** ORS matrix row -> drive entries. null or missing is "unknown", never 0. */
export function toDrive(siteIds: string[], durations: (number | null)[] | undefined, distances: (number | null)[] | undefined): Record<string, DriveEntry> {
  const out: Record<string, DriveEntry> = {}
  siteIds.forEach((id, i) => {
    const s = durations?.[i]
    const m = distances?.[i]
    out[id] = typeof s === 'number' && Number.isFinite(s) ? { status: 'ok', s: Math.round(s), m: typeof m === 'number' ? Math.round(m) : 0 } : { status: 'unknown' }
  })
  return out
}

export function unmatched(sites: Site[]): RegionData['unmatchedSpecies'] {
  const byCode = new Map<string, { sciName: string; name: string; sites: number }>()
  for (const s of sites)
    for (const r of s.reports) {
      if (r.speciesId) continue
      const e = byCode.get(r.ebirdCode) ?? { sciName: r.sciName, name: r.name, sites: 0 }
      e.sites++
      byCode.set(r.ebirdCode, e)
    }
  return [...byCode.values()].sort((a, b) => b.sites - a.sites)
}
