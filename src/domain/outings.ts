// An outing is one day at one place: everything you logged or imported there on that date.
// Pure. Undated sightings never form an outing (a date is never invented).
import type { Encounter } from '../data/personal-schema'
import { validSiteId } from '../data/personal-schema'
import { chronological } from './bond'
import { siteKey } from './siteKey'

export { siteKey, UNKNOWN_SITE } from './siteKey'

export interface Outing {
  /** `<date>|<siteKey>` */
  key: string
  date: string
  siteKey: string
  /** The eBird hotspot id when the outing has one, else null. */
  siteId: string | null
  /** The first non-empty place label on the outing (may be ''). */
  place: string
  /** Distinct species ids in the order they were first seen on the outing. */
  species: string[]
  /** In chronological order. */
  encounters: Encounter[]
  /** True when every sighting came from the sample history. */
  sample: boolean
  /** Latest `createdAt` among the outing's sightings. */
  lastCreatedAt: string
}

export function outingKey(e: Pick<Encounter, 'date' | 'siteId' | 'place'>): string | null {
  return e.date ? `${e.date}|${siteKey(e)}` : null
}

/** Dated sightings grouped by date and place, newest date first (ties: most recently added first). */
export function groupOutings(encounters: readonly Encounter[]): Outing[] {
  const sorted = [...encounters].filter((e) => e.date !== null).sort(chronological)
  const byKey = new Map<string, Outing>()
  for (const e of sorted) {
    const key = outingKey(e)!
    let o = byKey.get(key)
    if (!o) {
      o = {
        key,
        date: e.date!,
        siteKey: siteKey(e),
        siteId: null,
        place: '',
        species: [],
        encounters: [],
        sample: true,
        lastCreatedAt: e.createdAt,
      }
      byKey.set(key, o)
    }
    o.encounters.push(e)
    if (!o.species.includes(e.speciesId)) o.species.push(e.speciesId)
    if (!o.siteId) o.siteId = validSiteId(e.siteId)
    if (!o.place && e.place.trim()) o.place = e.place.trim()
    if (e.source !== 'sample') o.sample = false
    if (e.createdAt > o.lastCreatedAt) o.lastCreatedAt = e.createdAt
  }
  return [...byKey.values()].sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? 1 : -1)
      : a.lastCreatedAt !== b.lastCreatedAt ? (a.lastCreatedAt < b.lastCreatedAt ? 1 : -1)
        : a.key < b.key ? -1 : 1,
  )
}

/**
 * Outings that hold at least one sighting added after `sinceCreatedAt` (null = all of them).
 * This is how "what is new since I last looked" works for logging and for re-importing.
 */
export function outingsSince(encounters: readonly Encounter[], sinceCreatedAt: string | null): Outing[] {
  const all = groupOutings(encounters)
  if (sinceCreatedAt === null) return all
  return all.filter((o) => o.encounters.some((e) => e.createdAt > sinceCreatedAt))
}
