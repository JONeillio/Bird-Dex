// Map logic, pure and tested: drive filter, site ranking (Today's Quest) and lure choice.
import type { DriveEntry, RegionData, Report, Site } from '../data/published-schema'

/** Whole minutes, rounded up. null means "Drive time unknown" (never 0). */
export function driveMinutes(e: DriveEntry | undefined): number | null {
  return e && e.status === 'ok' ? Math.max(1, Math.ceil(e.s / 60)) : null
}

export interface SiteView {
  site: Site
  minutes: number | null
  /** Distinct Starter Dex species reported here that the user hasn't recorded. */
  newIds: string[]
  /** Newest report date at the site. */
  newest: string | null
  lure: Report | null
}

export interface FilterOpts {
  startId: string
  limitMin: number
  recorded: ReadonlySet<string>
  targets: readonly string[]
  newOnly: boolean
  focusSpeciesId: string | null
}

/** How many sites in the region reported each Dex species (fewer = scarcer). */
export function scarcity(region: RegionData): Map<string, number> {
  const m = new Map<string, number>()
  for (const s of region.sites)
    for (const id of new Set(s.reports.map((r) => r.speciesId).filter((x): x is string => !!x))) m.set(id, (m.get(id) ?? 0) + 1)
  return m
}

/** The bird drawn on the pin: your target if reported; else the scarcest new bird; ties -> newest. */
export function chooseLure(site: Site, recorded: ReadonlySet<string>, targets: readonly string[], scarce: Map<string, number>, focus: string | null = null): Report | null {
  const dex = site.reports.filter((r) => r.speciesId)
  if (focus) {
    const f = dex.find((r) => r.speciesId === focus)
    if (f) return f
  }
  const t = dex.filter((r) => targets.includes(r.speciesId!))
  if (t.length) return t.sort((a, b) => b.obsDate.localeCompare(a.obsDate))[0]
  const fresh = dex.filter((r) => !recorded.has(r.speciesId!))
  const pool = fresh.length ? fresh : dex
  if (!pool.length) return null
  return [...pool].sort(
    (a, b) => (scarce.get(a.speciesId!) ?? 99) - (scarce.get(b.speciesId!) ?? 99) || b.obsDate.localeCompare(a.obsDate),
  )[0]
}

export interface Filtered {
  shown: SiteView[]
  /** Sites hidden only because their drive time is unknown (counted, never treated as 0). */
  unknownDrive: number
}

export function filterSites(region: RegionData, o: FilterOpts): Filtered {
  const drive = region.drive.byStart[o.startId] ?? {}
  const scarce = scarcity(region)
  let unknownDrive = 0
  const shown: SiteView[] = []
  for (const site of region.sites) {
    const minutes = driveMinutes(drive[site.id])
    if (o.focusSpeciesId && !site.reports.some((r) => r.speciesId === o.focusSpeciesId)) continue
    const newIds = [...new Set(site.reports.map((r) => r.speciesId).filter((x): x is string => !!x && !o.recorded.has(x)))]
    if (o.newOnly && !o.focusSpeciesId && newIds.length === 0) continue
    if (minutes === null) {
      unknownDrive++
      continue
    }
    if (minutes > o.limitMin) continue
    const newest = site.reports.reduce<string | null>((m, r) => (!m || r.obsDate > m ? r.obsDate : m), null)
    shown.push({ site, minutes, newIds, newest, lure: chooseLure(site, o.recorded, o.targets, scarce, o.focusSpeciesId) })
  }
  return { shown: rankSites(shown, o.targets), unknownDrive }
}

/** Quest order: targets reported, then most new birds, then newest report, then shortest drive. */
export function rankSites(views: SiteView[], targets: readonly string[] = []): SiteView[] {
  const hasTarget = (v: SiteView) => (v.site.reports.some((r) => r.speciesId && targets.includes(r.speciesId)) ? 1 : 0)
  return [...views].sort(
    (a, b) =>
      hasTarget(b) - hasTarget(a) ||
      b.newIds.length - a.newIds.length ||
      (b.newest ?? '').localeCompare(a.newest ?? '') ||
      (a.minutes ?? 1e9) - (b.minutes ?? 1e9),
  )
}

export interface BirdChip {
  speciesId: string
  obsDate: string
  isNew: boolean
}

/**
 * Starter Dex birds reported at a site, for the card's collection strip: species new to you first, then the
 * rest, each group newest report first. One entry per species. Reports are not live positions.
 */
export function recentBirds(site: Site, recorded: ReadonlySet<string>): BirdChip[] {
  const seen = new Set<string>()
  const out: BirdChip[] = []
  for (const r of site.reports) {
    if (!r.speciesId || seen.has(r.speciesId)) continue
    seen.add(r.speciesId)
    out.push({ speciesId: r.speciesId, obsDate: r.obsDate, isNew: !recorded.has(r.speciesId) })
  }
  return out.sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.obsDate.localeCompare(a.obsDate) || a.speciesId.localeCompare(b.speciesId))
}

/** Distinct species new to you across several sites: a bird reported at three sites counts once. */
export function uniqueNewCount(views: readonly SiteView[]): number {
  return new Set(views.flatMap((v) => v.newIds)).size
}

/** Distinct Starter Dex species reported at one site. */
export function reportedCount(site: Site): number {
  return new Set(site.reports.map((r) => r.speciesId).filter(Boolean)).size
}

/** "today", "yesterday", "3 days ago" from an ISO date, relative to `now`. */
export function daysAgo(date: string, now: Date = new Date()): string {
  const d = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10))
  const t = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const n = Math.round((t - d) / 86_400_000)
  if (n <= 0) return 'today'
  if (n === 1) return 'yesterday'
  return `${n} days ago`
}

/** "updated 3 h ago" style age for generatedAt timestamps. */
export function ageLabel(iso: string, now: Date = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000))
  if (mins < 60) return `${mins} min ago`
  const h = Math.round(mins / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.round(h / 24)} days ago`
}
