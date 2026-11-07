import { DEMO_RECORDED_IDS } from '../data/demo'
import type { Encounter } from '../data/personal-schema'
import type { DexSpecies, SetId } from '../data/schema'
import { SETS } from '../data/schema'
import type { Prefs } from '../state/store'

export interface SpeciesRecord {
  /** How many sightings are logged for this species. */
  count: number
  /** Earliest and latest dated sighting (null when none has a date). */
  firstDate: string | null
  lastDate: string | null
}

/** Per species: how many sightings and when. Pure; the collection is always derived from encounters. */
export function deriveRecords(encounters: readonly Pick<Encounter, 'speciesId' | 'date'>[]): Map<string, SpeciesRecord> {
  const m = new Map<string, SpeciesRecord>()
  for (const e of encounters) {
    const r = m.get(e.speciesId) ?? { count: 0, firstDate: null, lastDate: null }
    r.count++
    if (e.date) {
      if (!r.firstDate || e.date < r.firstDate) r.firstDate = e.date
      if (!r.lastDate || e.date > r.lastDate) r.lastDate = e.date
    }
    m.set(e.speciesId, r)
  }
  return m
}

/**
 * Which species count as recorded: the labelled demo collection when it is switched on, otherwise the
 * species you have logged. Public reports never add to it.
 */
export function recordedIds(prefs: Pick<Prefs, 'demoCollection'>, encounters: readonly Pick<Encounter, 'speciesId'>[] = []): ReadonlySet<string> {
  return prefs.demoCollection ? new Set(DEMO_RECORDED_IDS) : new Set(encounters.map((e) => e.speciesId))
}

export interface SetProgress {
  done: number
  total: number
}

/** Recorded / total for each curated set (garden, woodland, ...). */
export function setProgress(dex: readonly DexSpecies[], recorded: ReadonlySet<string>): Record<SetId, SetProgress> {
  const out = {} as Record<SetId, SetProgress>
  for (const s of SETS) {
    const members = dex.filter((d) => d.sets.includes(s))
    out[s] = { done: members.filter((d) => recorded.has(d.id)).length, total: members.length }
  }
  return out
}

/** Today as YYYY-MM-DD in the phone's own time zone. */
export function todayIso(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}
