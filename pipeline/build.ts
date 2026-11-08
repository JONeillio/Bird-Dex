// Pure transforms from provider responses to the published D1 shape. No network, no disk: tested with
// synthetic fixtures in tests/pipeline.test.ts. Only whitelisted fields are copied; observer names never are.
import type { Between, DriveEntry, LngLat, RegionData, Report, Site } from '../src/data/published-schema.ts'
import { dexIdFor, isNotASpecies } from '../src/domain/taxon.ts'

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
  locId?: unknown
  locName?: unknown
  lat?: unknown
  lng?: unknown
  locationPrivate?: unknown
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

export function toReports(raw: RawObs[], dexBySci: ReadonlyMap<string, string>, opts: { notable?: boolean } = {}): Report[] {
  const out = new Map<string, Report>()
  for (const r of raw) {
    const code = str(r.speciesCode)
    const sci = str(r.sciName)
    const name = str(r.comName)
    const when = splitObsDt(r.obsDt)
    if (!code || !sci || !name || !when) continue
    // Ordinary reports: only valid ones. Rarities: keep records still awaiting review, labelled unconfirmed.
    if (r.obsValid === false && !opts.notable) continue
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
      ...(opts.notable ? { notable: true, unconfirmed: r.obsValid !== true } : {}),
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

/**
 * Merge eBird's notable (rare for the area) records into the sites. A rarity at a site we already list marks
 * that bird as notable (keeping the newer record). A rarity at a public hotspot we don't list adds that hotspot,
 * newest first, up to `maxExtra`. Private locations (often gardens) are never published.
 */
export function mergeNotable(sites: Site[], raw: RawObs[], dexBySci: ReadonlyMap<string, string>, maxExtra: number): { sites: Site[]; added: number; skippedPrivate: number } {
  const byLoc = new Map<string, RawObs[]>()
  let skippedPrivate = 0
  for (const o of raw) {
    const loc = str(o.locId)
    if (!loc || o.locationPrivate !== false) {
      skippedPrivate++
      continue
    }
    byLoc.set(loc, [...(byLoc.get(loc) ?? []), o])
  }
  const out = sites.map((s) => ({ ...s, reports: [...s.reports] }))
  const index = new Map(out.map((s, i) => [s.id, i]))
  const extra: Site[] = []
  for (const [loc, obs] of byLoc) {
    const rare = toReports(obs, dexBySci, { notable: true })
    if (rare.length === 0) continue
    const i = index.get(loc)
    if (i !== undefined) {
      const site = out[i]
      for (const r of rare) {
        const j = site.reports.findIndex((x) => x.ebirdCode === r.ebirdCode)
        if (j < 0) site.reports.push(r)
        // The ordinary feed only holds accepted records, so a same-day or newer one there is confirmed.
        else if (site.reports[j].obsDate >= r.obsDate) site.reports[j] = { ...site.reports[j], notable: true, unconfirmed: false }
        else site.reports[j] = r
      }
      site.reports.sort((a, b) => b.obsDate.localeCompare(a.obsDate) || a.name.localeCompare(b.name))
      continue
    }
    const h = cleanHotspot({ locId: loc, locName: obs[0].locName, lat: obs[0].lat, lng: obs[0].lng, latestObsDt: rare[0].obsDate })
    if (h) extra.push(toSite(h, rare))
  }
  extra.sort((a, b) => (b.latestObsDate ?? '').localeCompare(a.latestObsDate ?? ''))
  const kept = extra.slice(0, maxExtra)
  return { sites: [...out, ...kept], added: kept.length, skippedPrivate }
}

/** How many sites go into the site-to-site matrix (40 x 40 = 1,600 routes, well under ORS's 3,500 per request). */
export const BETWEEN_MAX = 40

/** The sites with the most distinct Starter Dex species reported (ties: id), at most `max`. */
export function pickBetweenSites(sites: Site[], max = BETWEEN_MAX): Site[] {
  const dexCount = (s: Site) => new Set(s.reports.map((r) => r.speciesId).filter((id): id is string => !!id)).size
  return [...sites].sort((a, b) => dexCount(b) - dexCount(a) || (a.id < b.id ? -1 : 1)).slice(0, max)
}

/**
 * ORS duration matrix -> published `between`. Seconds, rounded. A null, missing or non-finite entry is unknown (null),
 * never 0. The diagonal (a site to itself) is 0 because it is genuinely the same place.
 */
export function toBetween(ids: string[], durations: (number | null)[][] | undefined): Between {
  return {
    ids,
    s: ids.map((_, i) =>
      ids.map((_, j) => {
        if (i === j) return 0
        const v = durations?.[i]?.[j]
        return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : null
      }),
    ),
  }
}
