// Badges: earned only by your own logged or imported sightings. Pure.
// Hard rules: sample history never earns anything, the demo collection never earns anything,
// and public reports are not an input at all.
import { STARTER_DEX } from '../data/catalogue'
import type { Encounter } from '../data/personal-schema'
import { validSiteId } from '../data/personal-schema'
import { SETS, type SetId } from '../data/schema'

export const WARDEN_BRONZE_MIN = 5
export const YEAR_THRESHOLDS = [50, 100, 150] as const
export type YearThreshold = (typeof YEAR_THRESHOLDS)[number]
export type WardenTier = 'none' | 'bronze' | 'silver' | 'gold'

/** The parts of a Reserve Warden the badge rules need (the full record is `wardens.v1.json`, ticket D2). */
export interface WardenLike {
  id: string
  siteId: string
  signature: readonly string[]
  boss: string
}

export interface WardenBadge {
  wardenId: string
  tier: WardenTier
  /** Signature birds logged at the warden's site. */
  logged: string[]
  bossLogged: boolean
  /** Birds needed for bronze (5, or fewer when the signature list is shorter). */
  needed: number
  total: number
}

export interface SetBadge {
  set: SetId
  have: number
  total: number
  earned: boolean
}

export interface YearBadge {
  threshold: YearThreshold
  earned: boolean
}

export interface BadgeReport {
  wardens: WardenBadge[]
  sets: SetBadge[]
  year: { year: number; species: number; badges: YearBadge[] }
}

export interface BadgeInput {
  encounters: readonly Encounter[]
  wardens: readonly WardenLike[]
  /** wardenId -> date of your first Call it win against her (`callWinsOf`, P11). Gold needs silver plus one of these. */
  callWins?: Readonly<Record<string, string>>
  /** Old duel wins, kept only so earlier tests still pass until E4 removes it. Counts the same as a Call it win. */
  duelWins?: Readonly<Record<string, string>>
  /** The calendar year for the year-list badges. */
  year: number
  /** True while the labelled demo collection is on: nothing is earned. */
  demoCollection?: boolean
}

const TIER_RANK: Record<WardenTier, number> = { none: 0, bronze: 1, silver: 2, gold: 3 }

export function wardenBadge(w: WardenLike, encounters: readonly Encounter[], duelWins: Readonly<Record<string, string>> = {}): WardenBadge {
  const sig = new Set(w.signature)
  const logged = new Set<string>()
  for (const e of encounters) {
    if (validSiteId(e.siteId) === w.siteId && sig.has(e.speciesId)) logged.add(e.speciesId)
  }
  const needed = Math.min(WARDEN_BRONZE_MIN, w.signature.length)
  const bossLogged = logged.has(w.boss)
  const bronze = logged.size >= needed && bossLogged
  const silver = w.signature.length > 0 && logged.size === sig.size
  let tier: WardenTier = 'none'
  if (bronze) tier = 'bronze'
  if (bronze && silver) tier = 'silver'
  if (tier === 'silver' && duelWins[w.id]) tier = 'gold'
  return { wardenId: w.id, tier, logged: w.signature.filter((id) => logged.has(id)), bossLogged, needed, total: w.signature.length }
}

/** Everything you have earned from your own sightings. */
export function earnedBadges(input: BadgeInput): BadgeReport {
  // Sample history and the demo collection can show up in lists, but never earn anything.
  const real = input.demoCollection ? [] : input.encounters.filter((e) => e.source !== 'sample')

  const wardens = input.wardens.map((w) => wardenBadge(w, real, { ...input.duelWins, ...input.callWins }))

  const recorded = new Set(real.map((e) => e.speciesId))
  const sets = SETS.map((set) => {
    const members = STARTER_DEX.filter((s) => s.sets.includes(set))
    const have = members.filter((s) => recorded.has(s.id)).length
    return { set, have, total: members.length, earned: members.length > 0 && have === members.length }
  })

  const prefix = `${input.year}-`
  const thisYear = new Set(real.filter((e) => e.date?.startsWith(prefix)).map((e) => e.speciesId))
  const year = {
    year: input.year,
    species: thisYear.size,
    badges: YEAR_THRESHOLDS.map((threshold) => ({ threshold, earned: thisYear.size >= threshold })),
  }
  return { wardens, sets, year }
}

/** Stable keys for every earned badge, e.g. `warden:maud:silver`, `set:wetland`, `year:2026:50`. */
export function badgeKeys(report: BadgeReport): Set<string> {
  const keys = new Set<string>()
  for (const w of report.wardens) {
    for (const tier of ['bronze', 'silver', 'gold'] as const) if (TIER_RANK[w.tier] >= TIER_RANK[tier]) keys.add(`warden:${w.wardenId}:${tier}`)
  }
  for (const s of report.sets) if (s.earned) keys.add(`set:${s.set}`)
  for (const b of report.year.badges) if (b.earned) keys.add(`year:${report.year.year}:${b.threshold}`)
  return keys
}

/** Badges in `after` that were not in `before`, for the "Badge earned!" overlay. */
export function newBadges(before: BadgeReport, after: BadgeReport): string[] {
  const was = badgeKeys(before)
  return [...badgeKeys(after)].filter((k) => !was.has(k)).sort()
}
