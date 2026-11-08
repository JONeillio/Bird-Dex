// "Bird News": what is worth knowing within your drive limit, worked out from the published reports (AUTOPILOT P8).
// Pure. Everything is "reported", never "there now"; unknown drive times are never treated as inside the limit.
import type { RegionData, Report } from '../data/published-schema'
import { birdKey, type Sighting } from './findBird'
import { driveMinutes } from './ranking'
import { rarityOf, type RarityTable } from './rarity'
import { daysReported, bestBand } from './reliability'
import type { TimeBand } from './time'

export const NEWS_RARE_MAX = 5

export interface NewsSighting extends Sighting {
  /** For a target: "Most Kingfisher reports here come at dawn", when the time of day is clear. */
  tip?: string | null
}

export interface BirdNews {
  /** Distinct Starter Dex species reported within the limit that you have not recorded. */
  newToYou: number
  /** Rare or scarce birds (or ones eBird flagged) reported within the limit, newest first, one row per bird, at most 5. Unconfirmed ones carry `report.unconfirmed`. */
  rareScarce: NewsSighting[]
  /** Each wanted bird you have not recorded, at the place within the limit where it is reported most reliably (then nearest). */
  targetsReported: NewsSighting[]
  /** Reports within the limit newer than `lastSeenAt` (0 when there is no last look yet). */
  sinceLastLook: number
  /** Places with reports whose drive time is unknown, so they are not counted above. */
  unknownDrive: number
  generatedAt: string
}

export interface NewsOptions {
  region: RegionData
  startId: string
  limitMin: number
  recorded: ReadonlySet<string>
  /** Starter Dex ids you want to find. */
  targets: readonly string[]
  rarity: RarityTable
  /** When you last opened Bird News (ISO), or null the first time. */
  lastSeenAt: string | null
  now: Date
}

const BAND_PHRASE: Record<TimeBand, string> = { dawn: 'at dawn', day: 'during the day', dusk: 'at dusk', night: 'at night' }

/** The report's own time as a sortable local-clock string; a missing time counts as the end of the day. */
const stamp = (r: Report): string => `${r.obsDate}T${r.obsTime ?? '23:59'}`

/** Newer than a UTC "YYYY-MM-DDTHH:MM"? A report with no time counts only when it is on a later day. */
const newerThan = (r: Report, since: string): boolean => (r.obsTime ? stamp(r) > since : r.obsDate > since.slice(0, 10))

export function bandTip(name: string, band: TimeBand | null | undefined): string | null {
  return band ? `Most ${name} reports here come ${BAND_PHRASE[band]}` : null
}

export function birdNews(o: NewsOptions): BirdNews {
  const drive = o.region.drive.byStart[o.startId] ?? {}
  // eBird dates are local; lastSeenAt is UTC. The gap is at most an hour in the UK, which is fine for "since you last looked".
  const since = o.lastSeenAt ? o.lastSeenAt.slice(0, 16) : null
  const nowStamp = o.now.toISOString().slice(0, 16)

  const inside: { site: RegionData['sites'][number]; minutes: number }[] = []
  let unknownDrive = 0
  for (const site of o.region.sites) {
    if (site.reports.length === 0) continue
    const m = driveMinutes(drive[site.id])
    if (m === null) unknownDrive++
    else if (m <= o.limitMin) inside.push({ site, minutes: m })
  }

  const fresh = new Set<string>()
  const rare = new Map<string, NewsSighting>()
  let sinceLastLook = 0
  for (const { site, minutes } of inside) {
    for (const report of site.reports) {
      if (report.speciesId && !o.recorded.has(report.speciesId)) fresh.add(report.speciesId)
      if (since !== null && newerThan(report, since) && report.obsDate <= nowStamp.slice(0, 10)) sinceLastLook++
      const tier = rarityOf(o.rarity, report.sciName).tier
      if (tier === 'rare' || tier === 'scarce' || report.notable) {
        const key = birdKey(report)
        const have = rare.get(key)
        const better = !have || stamp(report) > stamp(have.report) || (stamp(report) === stamp(have.report) && minutes < (have.minutes ?? 1e9))
        if (better) rare.set(key, { site, report, minutes, days: daysReported(report.days), bestBand: bestBand(report.bands) })
      }
    }
  }
  const rareScarce = [...rare.values()]
    .sort((a, b) => stamp(b.report).localeCompare(stamp(a.report)) || (a.minutes ?? 1e9) - (b.minutes ?? 1e9) || a.report.name.localeCompare(b.report.name))
    .slice(0, NEWS_RARE_MAX)

  const targetsReported: NewsSighting[] = []
  for (const t of o.targets) {
    if (o.recorded.has(t)) continue
    let best: NewsSighting | null = null
    for (const { site, minutes } of inside) {
      const report = site.reports.find((r) => birdKey(r) === t)
      if (!report) continue
      const days = daysReported(report.days)
      const cand: NewsSighting = { site, report, minutes, days, bestBand: bestBand(report.bands) }
      if (!best || (cand.days ?? 0) > (best.days ?? 0) || ((cand.days ?? 0) === (best.days ?? 0) && minutes < (best.minutes ?? 1e9))) best = cand
    }
    if (best) targetsReported.push({ ...best, tip: bandTip(best.report.name, best.bestBand) })
  }

  return { newToYou: fresh.size, rareScarce, targetsReported, sinceLastLook, unknownDrive, generatedAt: o.region.generatedAt }
}
