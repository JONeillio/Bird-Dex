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
  /** eBird checklists on the outing (distinct, in the order of the day). Two checklists at one site on one day are one outing. */
  checklistIds: string[]
  /** The earliest known time (HH:MM) among the sightings, or null. */
  startTime: string | null
  /** Minutes: each checklist's duration counted once, however many birds it holds. null when no checklist had one. */
  durationMin: number | null
  /** 1-based number of this outing among your real (non-sample) outings in its calendar year, by date. Sample outings are 0. */
  cardNo: number
}

export function outingKey(e: Pick<Encounter, 'date' | 'siteId' | 'place'>): string | null {
  return e.date ? `${e.date}|${siteKey(e)}` : null
}

/** Dated sightings grouped by date and place, newest date first (ties: most recently added first). */
export function groupOutings(encounters: readonly Encounter[]): Outing[] {
  const sorted = [...encounters].filter((e) => e.date !== null).sort(chronological)
  const byKey = new Map<string, Outing>()
  /** Per outing: duration of each checklist, once (the key '' stands for sightings with a duration but no checklist id). */
  const durations = new Map<string, Map<string, number>>()
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
        checklistIds: [],
        startTime: null,
        durationMin: null,
        cardNo: 0,
      }
      byKey.set(key, o)
      durations.set(key, new Map())
    }
    o.encounters.push(e)
    if (!o.species.includes(e.speciesId)) o.species.push(e.speciesId)
    if (!o.siteId) o.siteId = validSiteId(e.siteId)
    if (!o.place && e.place.trim()) o.place = e.place.trim()
    if (e.source !== 'sample') o.sample = false
    if (e.createdAt > o.lastCreatedAt) o.lastCreatedAt = e.createdAt
    if (e.checklistId && !o.checklistIds.includes(e.checklistId)) o.checklistIds.push(e.checklistId)
    if (e.time && (o.startTime === null || e.time < o.startTime)) o.startTime = e.time
    if (typeof e.durationMin === 'number') {
      const per = durations.get(key)!
      const id = e.checklistId ?? ''
      if (!per.has(id)) per.set(id, e.durationMin)
    }
  }
  for (const [key, per] of durations) if (per.size > 0) byKey.get(key)!.durationMin = [...per.values()].reduce((a, b) => a + b, 0)
  numberCards([...byKey.values()])
  return [...byKey.values()].sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? 1 : -1)
      : a.lastCreatedAt !== b.lastCreatedAt ? (a.lastCreatedAt < b.lastCreatedAt ? 1 : -1)
        : a.key < b.key ? -1 : 1,
  )
}

/** Number each year's real outings 1, 2, 3 in date order (ties: first added). Sample outings stay 0. */
function numberCards(outings: Outing[]): void {
  const perYear = new Map<string, number>()
  const real = outings.filter((o) => !o.sample).sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.lastCreatedAt !== b.lastCreatedAt ? (a.lastCreatedAt < b.lastCreatedAt ? -1 : 1) : a.key < b.key ? -1 : 1))
  for (const o of real) {
    const year = o.date.slice(0, 4)
    const n = (perYear.get(year) ?? 0) + 1
    perYear.set(year, n)
    o.cardNo = n
  }
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
