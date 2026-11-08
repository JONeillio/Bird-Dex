// The Field Report: "how did I do" for each outing (one day at one place), from your own logged or imported
// sightings only. Points come from rarity, lifers, firsts of the year, Bond and exploring somewhere new.
// Pure; one chronological pass so a 12,000-sighting history is fast.
import { dexById } from '../data/catalogue'
import type { Encounter } from '../data/personal-schema'
import type { RegionData } from '../data/published-schema'
import { bondRun, chronological, RANKS, type RankName } from './bond'
import { binomialOf, rarityOf, sciNameFor, type RarityTable, type RarityTier } from './rarity'
import { siteKey, UNKNOWN_SITE } from './siteKey'
import { validSiteId } from '../data/personal-schema'

export const LIFER_POINTS = 20
export const FIRST_OF_YEAR_POINTS = 5
export const EXPLORER_POINTS = 15

export interface ReportBird {
  /** Species id (Starter Dex id, or `x-...` for a bird outside the Dex). */
  key: string
  name: string
  tier: RarityTier
  /** Rarity + lifer + first of year + the Bond this outing earned for the bird. */
  points: number
  lifer: boolean
  firstOfYear: boolean
  /** Set when the bird's Bond rank rose during this outing (never for a lifer). */
  rankUp: { from: RankName; to: RankName } | null
}

export interface FieldReport {
  outingKey: string
  date: string
  place: string
  siteId: string | null
  /** True when every sighting came from the sample history. Reports are shown, but nothing is ever awarded. */
  sample: boolean
  speciesCount: number
  /** Sorted by points (highest first), then name. */
  birds: ReportBird[]
  points: { rarity: number; lifers: number; firstsOfYear: number; bond: number; explorer: number; total: number }
  bestBird: string | null
  /**
   * What other birders reported at this hotspot in the data window, when it is in the region data.
   * `found` = how many of those you logged; `extra` = species ids you logged that nobody reported there.
   */
  par: { par: number; found: number; extra: string[] } | null
  /** `previous` = most species on any earlier outing at the same place; null on a first visit or unknown place. */
  siteBest: { previous: number | null; isNewBest: boolean }
  firstVisit: boolean
}

export interface ReportContext {
  rarity: RarityTable
  region: RegionData | null
}

interface BirdAcc {
  key: string
  name: string
  sciName: string | null
  lifer: boolean
  firstOfYear: boolean
  bond: number
  rankFrom: number | null
  rankTo: number
}

interface OutingAcc {
  key: string
  date: string
  siteKey: string
  siteId: string | null
  place: string
  sample: boolean
  birds: Map<string, BirdAcc>
}

function nameFor(e: Encounter): string {
  return dexById(e.speciesId)?.name ?? e.name ?? e.speciesId
}

/**
 * Every outing's report, newest outing first. Dated sightings only: an undated sighting still earns Bond
 * but cannot belong to an outing and is never a lifer or a first of the year.
 */
export function allFieldReports(encounters: readonly Encounter[], ctx: ReportContext): FieldReport[] {
  const { awards } = bondRun(encounters)
  const sorted = encounters.filter((e) => e.date !== null).sort(chronological)

  const seenEver = new Set<string>()
  const seenYear = new Set<string>()
  const lastRank = new Map<string, number>()
  const outings = new Map<string, OutingAcc>()
  const order: OutingAcc[] = []

  for (const e of sorted) {
    const date = e.date!
    const site = siteKey(e)
    const key = `${date}|${site}`
    let o = outings.get(key)
    if (!o) {
      o = { key, date, siteKey: site, siteId: null, place: '', sample: true, birds: new Map() }
      outings.set(key, o)
      order.push(o)
    }
    if (!o.siteId) o.siteId = validSiteId(e.siteId)
    if (!o.place && e.place.trim()) o.place = e.place.trim()
    if (e.source !== 'sample') o.sample = false

    const award = awards.get(e.id)!
    let b = o.birds.get(e.speciesId)
    if (!b) {
      const yearKey = `${e.speciesId}|${date.slice(0, 4)}`
      const lifer = !seenEver.has(e.speciesId)
      const firstOfYear = !lifer && !seenYear.has(yearKey)
      seenEver.add(e.speciesId)
      seenYear.add(yearKey)
      b = {
        key: e.speciesId,
        name: nameFor(e),
        sciName: sciNameFor(e.speciesId, e.sciName),
        lifer,
        firstOfYear,
        bond: 0,
        rankFrom: lastRank.get(e.speciesId) ?? null,
        rankTo: award.rankIndex,
      }
      o.birds.set(e.speciesId, b)
    }
    b.bond += award.points
    b.rankTo = award.rankIndex
    lastRank.set(e.speciesId, award.rankIndex)
  }

  // Par lookup: binomials reported at each hotspot in the data window.
  const reportedAt = new Map<string, Set<string>>()
  if (ctx.region) for (const s of ctx.region.sites) reportedAt.set(s.id, new Set(s.reports.map((r) => binomialOf(r.sciName))))

  const bestAtSite = new Map<string, number>()
  const reports: FieldReport[] = []
  for (const o of order) {
    const known = o.siteKey !== UNKNOWN_SITE
    const previous = known ? (bestAtSite.get(o.siteKey) ?? null) : null
    const firstVisit = known && previous === null
    const speciesCount = o.birds.size

    const birds: ReportBird[] = []
    let rarityPts = 0, liferPts = 0, firstPts = 0, bondPts = 0
    for (const b of o.birds.values()) {
      const r = rarityOf(ctx.rarity, b.sciName)
      const lifer = b.lifer ? LIFER_POINTS : 0
      const first = b.firstOfYear ? FIRST_OF_YEAR_POINTS : 0
      rarityPts += r.points
      liferPts += lifer
      firstPts += first
      bondPts += b.bond
      const rankUp =
        !b.lifer && b.rankFrom !== null && b.rankTo > b.rankFrom ? { from: RANKS[b.rankFrom], to: RANKS[b.rankTo] } : null
      birds.push({ key: b.key, name: b.name, tier: r.tier, points: r.points + lifer + first + b.bond, lifer: b.lifer, firstOfYear: b.firstOfYear, rankUp })
    }
    birds.sort((x, y) => y.points - x.points || x.name.localeCompare(y.name))
    const explorer = firstVisit ? EXPLORER_POINTS : 0

    let par: FieldReport['par'] = null
    const listed = o.siteId ? reportedAt.get(o.siteId) : undefined
    if (listed) {
      const extra: string[] = []
      let found = 0
      for (const b of o.birds.values()) {
        if (b.sciName && listed.has(binomialOf(b.sciName))) found += 1
        else extra.push(b.key)
      }
      par = { par: listed.size, found, extra }
    }

    reports.push({
      outingKey: o.key,
      date: o.date,
      place: o.place,
      siteId: o.siteId,
      sample: o.sample,
      speciesCount,
      birds,
      points: { rarity: rarityPts, lifers: liferPts, firstsOfYear: firstPts, bond: bondPts, explorer, total: rarityPts + liferPts + firstPts + bondPts + explorer },
      bestBird: birds[0]?.key ?? null,
      par,
      siteBest: { previous, isNewBest: previous !== null && speciesCount > previous },
      firstVisit,
    })
    if (known) bestAtSite.set(o.siteKey, Math.max(previous ?? 0, speciesCount))
  }
  return reports.reverse()
}

/** One outing's report, or null when there is no such outing. */
export function fieldReportFor(outingKey: string, encounters: readonly Encounter[], ctx: ReportContext): FieldReport | null {
  return allFieldReports(encounters, ctx).find((r) => r.outingKey === outingKey) ?? null
}
