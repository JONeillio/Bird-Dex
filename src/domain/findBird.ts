// "Where's this bird been seen?" Species-first lookups over the published region data. Pure and tested.
// A bird is keyed by its Starter Dex id, or "ebird:<code>" for birds outside the Dex (rarities included),
// so a search can find any bird in the reports, not only the 104 in the Dex.
import type { RegionData, Report, Site } from '../data/published-schema'
import { driveMinutes } from './ranking'
import { bestBand, daysReported } from './reliability'
import type { TimeBand } from './time'

export const birdKey = (r: Pick<Report, 'speciesId' | 'ebirdCode'>): string => r.speciesId ?? `ebird:${r.ebirdCode}`

export interface BirdHit {
  key: string
  speciesId: string | null
  name: string
  sciName: string
  /** Sites in the region with a report in the window. */
  sites: number
  latest: string
  /** Shortest drive to any of those sites, null if none is known. */
  nearestMin: number | null
  /** Flagged by eBird as rare for the area at least once. */
  notable: boolean
}

export interface Sighting {
  site: Site
  report: Report
  minutes: number | null
  /** Days of the last 14 it was reported here (null = no history yet). Set by whereSeen. */
  days?: number | null
  /** The part of the day most of its reports here come in, when clear. Set by whereSeen. */
  bestBand?: TimeBand | null
}

/** Every reported bird in the region, one entry each. */
export function birdIndex(region: RegionData, startId: string): BirdHit[] {
  const drive = region.drive.byStart[startId] ?? {}
  const m = new Map<string, BirdHit>()
  for (const site of region.sites) {
    const min = driveMinutes(drive[site.id])
    for (const r of site.reports) {
      const key = birdKey(r)
      const h = m.get(key) ?? { key, speciesId: r.speciesId, name: r.name, sciName: r.sciName, sites: 0, latest: r.obsDate, nearestMin: null, notable: false }
      h.sites++
      if (r.obsDate > h.latest) h.latest = r.obsDate
      if (min !== null && (h.nearestMin === null || min < h.nearestMin)) h.nearestMin = min
      if (r.notable) h.notable = true
      m.set(key, h)
    }
  }
  return [...m.values()]
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Matches a typed query against common and scientific names. Every word must match the start of a word
 * ("gr wag" finds Grey Wagtail). Names starting with the query come first, then rarities, then newest.
 */
export function searchBirds(index: readonly BirdHit[], query: string, dexNames: ReadonlyMap<string, string> = new Map()): BirdHit[] {
  const q = norm(query)
  if (!q) return []
  const words = q.split(' ')
  const scored: { h: BirdHit; score: number }[] = []
  for (const h of index) {
    const names = [h.name, h.sciName, h.speciesId ? dexNames.get(h.speciesId) ?? '' : ''].map(norm).filter(Boolean)
    let best = -1
    for (const n of names) {
      const parts = n.split(' ')
      if (!words.every((w) => parts.some((p) => p.startsWith(w)))) continue
      best = Math.max(best, n.startsWith(q) ? 2 : 1)
    }
    if (best >= 0) scored.push({ h, score: best })
  }
  return scored
    .sort((a, b) => b.score - a.score || Number(b.h.notable) - Number(a.h.notable) || b.h.latest.localeCompare(a.h.latest) || a.h.name.localeCompare(b.h.name))
    .map((x) => x.h)
}

/**
 * Where one bird was reported. With report history: the places it turns up on most days first, then newest, then nearest.
 * Without any history yet: newest first, then nearest. Unknown drive times come last among equals.
 */
export function whereSeen(region: RegionData, startId: string, key: string): Sighting[] {
  const drive = region.drive.byStart[startId] ?? {}
  const out: Sighting[] = []
  for (const site of region.sites) {
    const report = site.reports.find((r) => birdKey(r) === key)
    if (report) out.push({ site, report, minutes: driveMinutes(drive[site.id]), days: daysReported(report.days), bestBand: bestBand(report.bands) })
  }
  const anyHistory = out.some((x) => x.days !== null)
  return out.sort(
    (a, b) =>
      (anyHistory ? (b.days ?? 0) - (a.days ?? 0) : 0) || b.report.obsDate.localeCompare(a.report.obsDate) || (a.minutes ?? 1e9) - (b.minutes ?? 1e9),
  )
}

/** Rarities flagged by eBird in the window, newest first, one row per bird per site. */
export function rarities(region: RegionData, startId: string): Sighting[] {
  const drive = region.drive.byStart[startId] ?? {}
  const out: Sighting[] = []
  for (const site of region.sites) for (const report of site.reports) if (report.notable) out.push({ site, report, minutes: driveMinutes(drive[site.id]) })
  return out.sort((a, b) => b.report.obsDate.localeCompare(a.report.obsDate) || (a.minutes ?? 1e9) - (b.minutes ?? 1e9))
}

/** Display name for a bird key, from the region's reports. */
export function nameForKey(region: RegionData, key: string): string | null {
  for (const s of region.sites) for (const r of s.reports) if (birdKey(r) === key) return r.name
  return null
}

/** Smallest drive-limit chip that includes this many minutes, or null if beyond the largest. */
export function limitFor(minutes: number | null, limits: readonly number[] = [30, 60, 90]): number | null {
  if (minutes === null) return null
  return limits.find((l) => minutes <= l) ?? null
}
