// "What levelled up" for one outing: each bird's Bond before and after, as a bar inside its current rank band.
// Pure. Reads the awards from `bondRun` (cumulative Bond after every sighting), so the numbers always agree with the Dex.
import type { Award } from './bond'
import { RANKS, RANK_THRESHOLDS, rankIndexFor, type RankName } from './bond'
import type { Outing } from './outings'

export interface LevelBar {
  /** Species id (Starter Dex id, or `x-...` for a bird outside the Dex). */
  key: string
  before: number
  after: number
  gained: number
  rankBefore: RankName
  rankAfter: RankName
  rankedUp: boolean
  /** Bond at which the next rank starts, or null at Old Friend. */
  nextAt: number | null
  /** Where the bar starts and ends, as 0-1 of the current rank band. `from` is where today's gain began. */
  from: number
  to: number
  /** True when this was the first time the bird was ever recorded (before is 0 and nothing earlier existed). */
  firstEver: boolean
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n))

/**
 * One bar per bird that earned Bond on the outing, in the order: rank-ups, new birds, then the biggest gain.
 * `awards` is `bondRun(encounters).awards` (keyed by encounter id). A bird that earned nothing today is left out.
 */
export function levelBars(outing: Pick<Outing, 'encounters'>, awards: ReadonlyMap<string, Award>): LevelBar[] {
  const byBird = new Map<string, { gained: number; after: number; first: boolean }>()
  for (const e of outing.encounters) {
    const a = awards.get(e.id)
    if (!a) continue
    const cur = byBird.get(e.speciesId) ?? { gained: 0, after: 0, first: false }
    cur.gained += a.points
    cur.after = a.total
    byBird.set(e.speciesId, cur)
  }
  const bars: LevelBar[] = []
  for (const [key, v] of byBird) {
    if (v.gained <= 0) continue
    const before = v.after - v.gained
    const ri = rankIndexFor(v.after)
    const rb = rankIndexFor(before)
    const start = RANK_THRESHOLDS[ri]
    const end = ri + 1 < RANK_THRESHOLDS.length ? RANK_THRESHOLDS[ri + 1] : null
    const span = end === null ? 1 : end - start
    const to = end === null ? 1 : clamp01((v.after - start) / span)
    const from = end === null ? clamp01((before - start) / Math.max(1, v.after - start || 1)) : clamp01((before - start) / span)
    bars.push({ key, before, after: v.after, gained: v.gained, rankBefore: RANKS[rb], rankAfter: RANKS[ri], rankedUp: ri > rb, nextAt: end, from: rb < ri ? 0 : from, to, firstEver: before === 0 })
  }
  return bars.sort((a, b) => Number(b.rankedUp) - Number(a.rankedUp) || Number(b.firstEver) - Number(a.firstEver) || b.gained - a.gained || a.key.localeCompare(b.key))
}
