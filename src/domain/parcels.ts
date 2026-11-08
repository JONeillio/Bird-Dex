// "Parcels": outings with new sightings whose Field Report you have not opened yet (AUTOPILOT P4).
// Pure. The opened set lives in the game store (`opened` document).
import type { Encounter } from '../data/personal-schema'
import { groupOutings, type Outing } from './outings'

/** Outings with a sighting added after `sinceCreatedAt` (null = any) that are not in `opened`, newest first. */
export function unopened(outings: readonly Outing[], opened: ReadonlySet<string>, sinceCreatedAt: string | null): Outing[] {
  return outings.filter((o) => !opened.has(o.key) && (sinceCreatedAt === null || o.encounters.some((e) => e.createdAt > sinceCreatedAt)))
}

/** The opened set after opening these outings. Opening twice changes nothing. */
export function markOpened(keys: Iterable<string>, opened: ReadonlySet<string>): Set<string> {
  const next = new Set(opened)
  for (const k of keys) next.add(k)
  return next
}

/** The same thing straight from sightings, for screens that have not grouped them yet. */
export const unopenedFrom = (encounters: readonly Encounter[], opened: ReadonlySet<string>, sinceCreatedAt: string | null): Outing[] => unopened(groupOutings(encounters), opened, sinceCreatedAt)
