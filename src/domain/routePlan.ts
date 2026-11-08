// Plan a day: a short, greedy route through several sites that covers the most birds you are after.
// Pure. Drive times come from the published data (start point to site, and site to site), so a plan is only as good as
// the last refresh: it is a plan from recent reports, not a guarantee. Unknown drive times are never treated as 0.
import type { RegionData, Site } from '../data/published-schema'
import { birdKey } from './findBird'
import { driveMinutes } from './ranking'

export interface PlanOptions {
  /** The start point id (a key of `region.drive.byStart`). */
  startId: string
  /** Starter Dex species ids you have recorded. */
  recorded: ReadonlySet<string>
  /** 'new' = every unrecorded Starter Dex bird reported in the region; or bird keys (Dex id, or "ebird:<code>"). */
  wanted: 'new' | readonly string[]
  /** The whole day, door to door, in minutes. */
  budgetMin: number
  /** Time spent at each stop. Default 40. */
  stopMin?: number
  /** Default 4. */
  maxStops?: number
}

export interface PlanStop {
  site: Site
  /** Minutes after leaving the start point that you arrive. */
  arriveMin: number
  /** Wanted birds newly covered here (not at an earlier stop), as bird keys. */
  birds: string[]
}

export interface DayPlan {
  stops: PlanStop[]
  /** The whole day in minutes, including the drive home. 0 with no stops. */
  totalMin: number
  /** The last leg back to the start point (approximated by the stop's drive time from the start). */
  returnMin: number
  /** Wanted birds no stop covers. */
  uncovered: string[]
}

/** Seconds -> whole minutes, rounded up, never 0 (same rule as the drive filter). null stays null. */
const mins = (s: number | null | undefined): number | null => (typeof s === 'number' && Number.isFinite(s) ? Math.max(1, Math.ceil(s / 60)) : null)

/** The birds a plan would be looking for. */
export function wantedBirds(region: RegionData, wanted: PlanOptions['wanted'], recorded: ReadonlySet<string>): Set<string> {
  if (wanted !== 'new') return new Set(wanted)
  const out = new Set<string>()
  for (const s of region.sites) for (const r of s.reports) if (r.speciesId && !recorded.has(r.speciesId)) out.add(r.speciesId)
  return out
}

export function planDay(region: RegionData, o: PlanOptions): DayPlan {
  const stopMin = o.stopMin ?? 40
  const maxStops = o.maxStops ?? 4
  const wanted = wantedBirds(region, o.wanted, o.recorded)
  const empty: DayPlan = { stops: [], totalMin: 0, returnMin: 0, uncovered: [...wanted].sort() }
  const between = region.between
  const fromStart = region.drive.byStart[o.startId]
  if (!between || !fromStart || wanted.size === 0 || maxStops < 1) return empty

  const index = new Map(between.ids.map((id, i) => [id, i]))
  const siteById = new Map(region.sites.map((s) => [s.id, s]))
  const covered = new Set<string>()
  const stops: PlanStop[] = []
  const visited = new Set<string>()
  let elapsed = 0
  let at = null as string | null // null = the start point

  while (stops.length < maxStops) {
    let best: { site: Site; travel: number; ret: number; fresh: string[]; score: number } | null = null
    for (const id of between.ids) {
      if (visited.has(id)) continue
      const site = siteById.get(id)
      if (!site) continue
      const ret = driveMinutes(fromStart[id])
      const travel: number | null = at === null ? ret : mins(between.s[index.get(at)!]?.[index.get(id)!])
      if (travel === null || ret === null) continue // unknown drive time: not eligible
      if (elapsed + travel + stopMin + ret > o.budgetMin) continue
      const fresh = [...new Set(site.reports.map(birdKey))].filter((k) => wanted.has(k) && !covered.has(k)).sort()
      if (fresh.length === 0) continue
      const score = fresh.length / (travel + stopMin)
      const better =
        !best ||
        score > best.score ||
        (score === best.score && (fresh.length > best.fresh.length || (fresh.length === best.fresh.length && (travel < best.travel || (travel === best.travel && id < best.site.id)))))
      if (better) best = { site, travel, ret, fresh, score }
    }
    if (!best) break
    const arriveMin: number = elapsed + best.travel
    stops.push({ site: best.site, arriveMin, birds: best.fresh })
    best.fresh.forEach((k) => covered.add(k))
    visited.add(best.site.id)
    elapsed = arriveMin + stopMin
    at = best.site.id
  }

  if (stops.length === 0) return empty
  const returnMin = driveMinutes(fromStart[stops[stops.length - 1].site.id]) ?? 0
  return { stops, totalMin: elapsed + returnMin, returnMin, uncovered: [...wanted].filter((k) => !covered.has(k)).sort() }
}
