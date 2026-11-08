// The Year and Life lists on the BirdDex: every bird you have recorded, Dex and outside the Dex.
// Pure. Built from encounters only, so public reports never appear here.
import { dexById, STARTER_DEX } from '../data/catalogue'
import type { Encounter } from '../data/personal-schema'
import type { DexSpecies } from '../data/schema'

export interface ListEntry {
  /** Species id (outside-Dex birds start `x-`). */
  id: string
  name: string
  sciName: string | null
  /** The Starter Dex entry, or null for a bird outside the Dex. */
  species: DexSpecies | null
  sightings: number
  firstDate: string | null
  lastDate: string | null
}

function entries(encounters: readonly Encounter[]): Map<string, ListEntry> {
  const m = new Map<string, ListEntry>()
  for (const e of encounters) {
    let r = m.get(e.speciesId)
    if (!r) {
      const sp = dexById(e.speciesId) ?? null
      r = { id: e.speciesId, name: sp?.name ?? e.name ?? e.speciesId, sciName: sp?.sciName ?? e.sciName ?? null, species: sp, sightings: 0, firstDate: null, lastDate: null }
      m.set(e.speciesId, r)
    }
    r.sightings += 1
    if (e.date) {
      if (!r.firstDate || e.date < r.firstDate) r.firstDate = e.date
      if (!r.lastDate || e.date > r.lastDate) r.lastDate = e.date
    }
  }
  return m
}

const byName = (a: ListEntry, b: ListEntry) => a.name.localeCompare(b.name)

/** Every bird with a dated sighting in `year` (sightings without a date never count), most recently seen first. */
export function yearList(encounters: readonly Encounter[], year: number): ListEntry[] {
  const prefix = `${year}-`
  return [...entries(encounters.filter((e) => e.date?.startsWith(prefix))).values()].sort(
    (a, b) => (b.lastDate ?? '').localeCompare(a.lastDate ?? '') || byName(a, b),
  )
}

/** Every bird ever recorded: Dex birds in Dex order, then birds outside the Dex alphabetically. */
export function lifeList(encounters: readonly Encounter[]): ListEntry[] {
  const all = entries(encounters)
  const dex = STARTER_DEX.filter((s) => all.has(s.id)).map((s) => all.get(s.id)!)
  const outside = [...all.values()].filter((e) => !e.species).sort(byName)
  return [...dex, ...outside]
}

/** True when this sighting is the first of `year` for a bird recorded in an earlier year (the "First of the year" beat). */
export function isFirstOfYear(encounters: readonly Encounter[], speciesId: string, date: string): boolean {
  const year = date.slice(0, 4)
  let earlier = false
  for (const e of encounters) {
    if (e.speciesId !== speciesId || !e.date) continue
    if (e.date.slice(0, 4) === year && e.date < date) return false
    if (e.date.slice(0, 4) < year) earlier = true
  }
  return earlier
}

/** A stand-in Dex entry to draw a generic portrait for a bird outside the Starter Dex. */
export function outsideSpecies(e: Pick<ListEntry, 'id' | 'name'>): DexSpecies {
  return {
    id: e.id, dexNo: 1, name: e.name, ebirdName: e.name, sciName: 'Aves incerta', family: 'Unknown', sets: ['garden'], habitat: 'garden',
    art: { template: 'songbird', palette: { back: '#8e938a', breast: '#b9bcb2', bill: '#4a4a44' } }, portraitAssetId: e.id,
  }
}
