// Exploration: which public hotspots you have actually birded (from your own logs and eBird imports,
// since an export carries each checklist's location id), and which nearby ones you have not.
// Reports are never hidden; unexplored sites just hold back their warden, par history and "Explored" stamp.
import type { Encounter } from '../data/personal-schema'
import { validSiteId } from '../data/personal-schema'
import type { RegionData } from '../data/published-schema'
import { driveMinutes } from './ranking'

/**
 * Distinct real hotspot ids you have a sighting at. Demo ids (LDEMO01) fail the id pattern, and anything
 * from the made-up sample history is ignored, so neither can explore a real place.
 */
export function visitedSiteIds(encounters: readonly Encounter[]): Set<string> {
  const out = new Set<string>()
  for (const e of encounters) {
    if (e.source === 'sample') continue
    const id = validSiteId(e.siteId)
    if (id) out.add(id)
  }
  return out
}

export interface Exploration {
  /** Ids of the region's sites you have visited, in the region's order. */
  explored: string[]
  /** Sites in the region. */
  total: number
  /** explored / total (0 when the region has no sites). */
  share: number
  /** Up to 5 unexplored sites with a known drive time from the start point, nearest first. */
  nearestUnexplored: { siteId: string; minutes: number }[]
}

export function exploration(region: RegionData, visited: ReadonlySet<string>, startId: string): Exploration {
  const explored: string[] = []
  const unexplored: { siteId: string; minutes: number }[] = []
  const drives = region.drive.byStart[startId] ?? {}
  for (const s of region.sites) {
    if (visited.has(s.id)) {
      explored.push(s.id)
      continue
    }
    const minutes = driveMinutes(drives[s.id])
    if (minutes !== null) unexplored.push({ siteId: s.id, minutes })
  }
  unexplored.sort((a, b) => a.minutes - b.minutes || (a.siteId < b.siteId ? -1 : 1))
  const total = region.sites.length
  return { explored, total, share: total === 0 ? 0 : explored.length / total, nearestUnexplored: unexplored.slice(0, 5) }
}
