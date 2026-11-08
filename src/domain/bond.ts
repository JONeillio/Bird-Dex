// Field Bond: how well you know each bird, grown only by your own logged or imported sightings.
// Pure functions (no clock, no storage). Public reports never feed this; callers pass encounters only.
import type { Encounter } from '../data/personal-schema'
import { monthOf, timeBand, type TimeBand } from './time'
import { siteKey, UNKNOWN_SITE } from './siteKey'

export const RANKS = ['Spotted', 'Known', 'Familiar', 'Seasoned', 'Old Friend'] as const
export type RankName = (typeof RANKS)[number]
/** Bond points needed for each rank, in the same order as RANKS. */
export const RANK_THRESHOLDS = [0, 15, 40, 80, 150] as const

export const BOND_POINTS = {
  first: 10,
  newSite: 5,
  newMonth: 4,
  newBand: 3,
  firstHeard: 3,
  newYear: 3,
  other: 1,
} as const

export interface Bond {
  points: number
  rank: RankName
  /** 0-4, index into RANKS. */
  rankIndex: number
  /** Points at which the next rank starts, or null at Old Friend. */
  nextRankAt: number | null
  /** Earliest dated sighting, or null if none had a date. */
  firstDate: string | null
  /** Every sighting logged or imported for this bird (including ones that earned nothing). */
  sightings: number
  /** Distinct known places (an unknown place is never counted). */
  sites: number
  months: number
  bands: number
  /** True once the bird has been heard (heard-only or seen and heard). */
  heard: boolean
}

/** What one sighting earned, and where the bird stood just after it. */
export interface Award {
  speciesId: string
  points: number
  /** Cumulative Bond for the species after this sighting. */
  total: number
  rankIndex: number
}

export interface BondRun {
  bonds: Map<string, Bond>
  /** Keyed by encounter id. */
  awards: Map<string, Award>
}

export function rankIndexFor(points: number): number {
  let idx = 0
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) if (points >= RANK_THRESHOLDS[i]) idx = i
  return idx
}

/** Date (nulls last), then time (nulls last), then createdAt, then id so the order is always the same. */
export function chronological(a: Encounter, b: Encounter): number {
  if (a.date !== b.date) {
    if (a.date === null) return 1
    if (b.date === null) return -1
    return a.date < b.date ? -1 : 1
  }
  const ta = a.time ?? null
  const tb = b.time ?? null
  if (ta !== tb) {
    if (ta === null) return 1
    if (tb === null) return -1
    return ta < tb ? -1 : 1
  }
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

interface Acc {
  points: number
  sightings: number
  firstDate: string | null
  sites: Set<string>
  months: Set<number>
  bands: Set<TimeBand>
  years: Set<string>
  used: Set<string>
  heardOnly: boolean
  heardAny: boolean
  seenFirst: boolean
}

function newAcc(): Acc {
  return {
    points: 0,
    sightings: 0,
    firstDate: null,
    sites: new Set(),
    months: new Set(),
    bands: new Set(),
    years: new Set(),
    used: new Set(),
    heardOnly: false,
    heardAny: false,
    seenFirst: false,
  }
}

/**
 * Score every encounter once, in order. Rules (GAME_DESIGN / AUTOPILOT C1):
 * - the first ever sighting of a bird is +10 and nothing else;
 * - later ones add: new place +5, new month +4, new time band +3, first heard-only +3, first of a new year +3;
 * - if none of those apply it is +1;
 * - one sighting per bird per place per day earns Bond (more are kept but earn 0).
 * An unknown place, a missing date or a missing time simply cannot earn the matching bonus.
 */
export function bondRun(encounters: readonly Encounter[]): BondRun {
  const sorted = [...encounters].sort(chronological)
  const accs = new Map<string, Acc>()
  const awards = new Map<string, Award>()

  for (const e of sorted) {
    let acc = accs.get(e.speciesId)
    if (!acc) {
      acc = newAcc()
      accs.set(e.speciesId, acc)
    }
    acc.sightings += 1
    const site = siteKey(e)
    const knownSite = site !== UNKNOWN_SITE
    const month = monthOf(e.date)
    const band = timeBand(e.time)
    const year = e.date ? e.date.slice(0, 4) : null
    const mode = e.mode
    const usedKey = `${site}|${e.date ?? 'nodate'}`

    let earned = 0
    if (acc.used.has(usedKey)) {
      earned = 0 // already counted today at this place
    } else {
      acc.used.add(usedKey)
      if (!acc.seenFirst) {
        earned = BOND_POINTS.first
      } else {
        if (knownSite && !acc.sites.has(site)) earned += BOND_POINTS.newSite
        if (month !== null && !acc.months.has(month)) earned += BOND_POINTS.newMonth
        if (band !== null && !acc.bands.has(band)) earned += BOND_POINTS.newBand
        if (mode === 'heard' && !acc.heardOnly) earned += BOND_POINTS.firstHeard
        if (year !== null && !acc.years.has(year)) earned += BOND_POINTS.newYear
        if (earned === 0) earned = BOND_POINTS.other
      }
      acc.seenFirst = true
      if (knownSite) acc.sites.add(site)
      if (month !== null) acc.months.add(month)
      if (band !== null) acc.bands.add(band)
      if (year !== null) acc.years.add(year)
      if (mode === 'heard') acc.heardOnly = true
    }
    if (mode === 'heard' || mode === 'both') acc.heardAny = true
    if (e.date && (acc.firstDate === null || e.date < acc.firstDate)) acc.firstDate = e.date

    acc.points += earned
    awards.set(e.id, { speciesId: e.speciesId, points: earned, total: acc.points, rankIndex: rankIndexFor(acc.points) })
  }

  const bonds = new Map<string, Bond>()
  for (const [speciesId, acc] of accs) {
    const rankIndex = rankIndexFor(acc.points)
    bonds.set(speciesId, {
      points: acc.points,
      rank: RANKS[rankIndex],
      rankIndex,
      nextRankAt: rankIndex < RANKS.length - 1 ? RANK_THRESHOLDS[rankIndex + 1] : null,
      firstDate: acc.firstDate,
      sightings: acc.sightings,
      sites: acc.sites.size,
      months: acc.months.size,
      bands: acc.bands.size,
      heard: acc.heardAny,
    })
  }
  return { bonds, awards }
}

/** Bond for every bird you have an encounter for. Recomputed from scratch, so deleting sightings lowers it. */
export function computeBond(encounters: readonly Encounter[]): Map<string, Bond> {
  return bondRun(encounters).bonds
}

export interface RankUp {
  speciesId: string
  from: RankName
  to: RankName
}

/**
 * Birds whose rank rose between two states. A bird that is new in `after` is the catch reveal's job,
 * not a rank-up, so it is not listed.
 */
export function rankUps(before: ReadonlyMap<string, Bond>, after: ReadonlyMap<string, Bond>): RankUp[] {
  const out: RankUp[] = []
  for (const [speciesId, now] of after) {
    const was = before.get(speciesId)
    if (was && now.rankIndex > was.rankIndex) out.push({ speciesId, from: was.rank, to: now.rank })
  }
  return out.sort((a, b) => a.speciesId.localeCompare(b.speciesId))
}
