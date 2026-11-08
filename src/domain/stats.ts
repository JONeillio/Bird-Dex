// Numbers about your whole history: totals, favourites, best days, years and a weekly streak.
// Pure. Sample records count here (they are only statistics) but the result says when any were used.
import { dexById } from '../data/catalogue'
import type { Encounter } from '../data/personal-schema'
import type { Bond, RankName } from './bond'
import type { FieldReport } from './fieldReport'
import { rarityOf, sciNameFor, type RarityTable, type RarityTier } from './rarity'
import { siteKey, UNKNOWN_SITE } from './siteKey'
import { isOutsideId } from './taxon'

export interface CountedBird { key: string; name: string; sightings: number }
export interface BondedBird { key: string; name: string; points: number; rank: RankName }
export interface RareBird { key: string; name: string; points: number; tier: RarityTier; sightings: number }
export interface YearStats { year: number; species: number; lifers: number; outings: number }

export interface CollectionStats {
  totals: { sightings: number; species: number; dexSpecies: number; outings: number; sites: number }
  /** Top 10 by number of sightings. */
  mostSeen: CountedBird[]
  /** Top 10 by Bond points. */
  topBond: BondedBird[]
  /** Top 10 recorded birds by rarity points, ties by fewest sightings. */
  coolest: RareBird[]
  /** Newest year first. Only dated sightings. */
  years: YearStats[]
  /** Top 5 reports by total points (ties: newer first). */
  bestOutings: FieldReport[]
  /** ISO weeks (Monday start) with at least one outing. `current` counts back from this week, or last week if this one is empty. */
  streak: { currentWeeks: number; bestWeeks: number }
  /** True if any sample-history records were included. */
  sample: boolean
}

/** Whole ISO-style weeks since 1970-01-05 (a Monday) for a YYYY-MM-DD date. */
export function weekIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const days = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
  return Math.floor((days - 4) / 7)
}

export function streakOf(outingDates: readonly string[], today: string): { currentWeeks: number; bestWeeks: number } {
  const weeks = [...new Set(outingDates.map(weekIndex))].sort((a, b) => a - b)
  if (weeks.length === 0) return { currentWeeks: 0, bestWeeks: 0 }
  let best = 1
  let run = 1
  for (let i = 1; i < weeks.length; i++) {
    run = weeks[i] === weeks[i - 1] + 1 ? run + 1 : 1
    if (run > best) best = run
  }
  const have = new Set(weeks)
  const thisWeek = weekIndex(today)
  let w = have.has(thisWeek) ? thisWeek : thisWeek - 1
  let current = 0
  while (have.has(w)) {
    current += 1
    w -= 1
  }
  return { currentWeeks: current, bestWeeks: best }
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name)

export function collectionStats(
  encounters: readonly Encounter[],
  reports: readonly FieldReport[],
  bond: ReadonlyMap<string, Bond>,
  rarity: RarityTable,
  today: string,
): CollectionStats {
  const count = new Map<string, number>()
  const names = new Map<string, string>()
  const sci = new Map<string, string | null>()
  const sites = new Set<string>()
  let sample = false
  for (const e of encounters) {
    count.set(e.speciesId, (count.get(e.speciesId) ?? 0) + 1)
    if (!names.has(e.speciesId)) {
      names.set(e.speciesId, dexById(e.speciesId)?.name ?? e.name ?? e.speciesId)
      sci.set(e.speciesId, sciNameFor(e.speciesId, e.sciName))
    }
    const k = siteKey(e)
    if (k !== UNKNOWN_SITE) sites.add(k)
    if (e.source === 'sample') sample = true
  }
  const ids = [...count.keys()]
  const nameOf = (id: string) => names.get(id) ?? id

  const mostSeen = ids
    .map((key) => ({ key, name: nameOf(key), sightings: count.get(key)! }))
    .sort((a, b) => b.sightings - a.sightings || byName(a, b))
    .slice(0, 10)

  const topBond = ids
    .map((key) => ({ key, name: nameOf(key), points: bond.get(key)?.points ?? 0, rank: bond.get(key)?.rank ?? ('Spotted' as RankName) }))
    .sort((a, b) => b.points - a.points || byName(a, b))
    .slice(0, 10)

  const coolest = ids
    .map((key) => {
      const r = rarityOf(rarity, sci.get(key))
      return { key, name: nameOf(key), points: r.points, tier: r.tier, sightings: count.get(key)! }
    })
    .sort((a, b) => b.points - a.points || a.sightings - b.sightings || byName(a, b))
    .slice(0, 10)

  const perYear = new Map<number, { species: Set<string>; lifers: number; outings: number }>()
  const slot = (y: number) => {
    let s = perYear.get(y)
    if (!s) perYear.set(y, (s = { species: new Set(), lifers: 0, outings: 0 }))
    return s
  }
  for (const e of encounters) if (e.date) slot(Number(e.date.slice(0, 4))).species.add(e.speciesId)
  for (const r of reports) {
    const s = slot(Number(r.date.slice(0, 4)))
    s.outings += 1
    s.lifers += r.birds.filter((b) => b.lifer).length
  }
  const years = [...perYear.entries()]
    .map(([year, s]) => ({ year, species: s.species.size, lifers: s.lifers, outings: s.outings }))
    .sort((a, b) => b.year - a.year)

  const bestOutings = [...reports]
    .sort((a, b) => b.points.total - a.points.total || (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 5)

  return {
    totals: {
      sightings: encounters.length,
      species: ids.length,
      dexSpecies: ids.filter((id) => !isOutsideId(id)).length,
      outings: reports.length,
      sites: sites.size,
    },
    mostSeen,
    topBond,
    coolest,
    years,
    bestOutings,
    streak: streakOf(reports.map((r) => r.date), today),
    sample,
  }
}
