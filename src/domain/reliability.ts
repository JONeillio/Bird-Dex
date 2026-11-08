// How reliably a bird is reported at a place, from the pipeline's own report history (AUTOPILOT P7).
// This is "about N of the last 14 days", never a promise that the bird will be there. Pure.
import type { Report } from '../data/published-schema'
import type { TimeBand } from './time'

export const WINDOW_DAYS = 14

/** Days the bird was reported (the number of set bits in `days`), or null when there is no history yet. */
export function daysReported(days: number | undefined): number | null {
  if (days === undefined) return null
  let n = 0
  for (let v = days >>> 0; v; v &= v - 1) n++
  return n
}

/** "most days" (9 or more of 14), "often" (5-8), "now and then" (2-4), "once" (1). null for 0. Other window lengths scale the same way. */
export function reliabilityLabel(n: number, windowDays: number = WINDOW_DAYS): string | null {
  if (n <= 0) return null
  if (n === 1) return 'once'
  const scaled = (n * WINDOW_DAYS) / Math.max(1, windowDays)
  return scaled >= 9 ? 'most days' : scaled >= 5 ? 'often' : 'now and then'
}

const ORDER: readonly TimeBand[] = ['dawn', 'day', 'dusk', 'night']

/** The part of the day most reports come in: it needs a clear lead (at least half of them, a single winner) and at least 3 reports. Else null. */
export function bestBand(bands: Report['bands']): TimeBand | null {
  if (!bands) return null
  const total = ORDER.reduce((n, b) => n + bands[b], 0)
  if (total < 3) return null
  const top = Math.max(...ORDER.map((b) => bands[b]))
  const winners = ORDER.filter((b) => bands[b] === top)
  return winners.length === 1 && top >= 3 && top * 2 >= total ? winners[0] : null
}

/** One cell per day, oldest first, true where the bird was reported (for the 14-cell bar). All false when there is no history. */
export function strip(days: number | undefined, windowDays: number = WINDOW_DAYS): boolean[] {
  const n = Math.min(windowDays, WINDOW_DAYS)
  return Array.from({ length: n }, (_, i) => days !== undefined && ((days >>> (n - 1 - i)) & 1) === 1)
}
