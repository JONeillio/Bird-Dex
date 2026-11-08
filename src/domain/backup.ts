// Backup and restore of your own records. Pure functions; the Settings screen does the file handling.
import { BackupSchema, type Backup, type Encounter, type ImportBatch } from '../data/personal-schema'
import { mergeGameDocs, type GameDoc } from '../data/personal/game-schema'
import { isOutsideId } from './taxon'

export interface BackupExtras {
  importBatches?: readonly ImportBatch[]
  game?: readonly GameDoc[]
}

export function buildBackup(encounters: readonly Encounter[], targets: readonly string[], now: Date = new Date(), extras: BackupExtras = {}): Backup {
  return {
    app: 'birdquest',
    schema: 2,
    exportedAt: now.toISOString(),
    encounters: [...encounters],
    targets: [...targets],
    importBatches: [...(extras.importBatches ?? [])],
    game: [...(extras.game ?? [])],
  }
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string }

export function parseBackup(text: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file is not a BirdQuest backup (it is not valid JSON).' }
  }
  const r = BackupSchema.safeParse(json)
  if (!r.success) return { ok: false, error: 'That file is not a BirdQuest backup, or it is damaged.' }
  return { ok: true, backup: r.data }
}

export interface MergePlan {
  /** Everything to keep after the restore: what you have plus the new sightings. */
  merged: Encounter[]
  added: number
  /** Already on this phone (same id). */
  duplicates: number
  /** Birds this version of the Starter Dex doesn't have, left out of the restore. */
  unknown: number
  addedTargets: string[]
  /** Import history entries the phone did not have. */
  addedBatches: ImportBatch[]
  /** Game documents after the merge (see mergeGameDocs). */
  mergedGame: GameDoc[]
}

/** Merge a backup into what is on this phone without duplicating anything. Never removes existing records. */
export function planRestore(
  existing: readonly Encounter[],
  existingTargets: readonly string[],
  backup: Backup,
  knownSpecies: ReadonlySet<string>,
  have: { importBatches?: readonly ImportBatch[]; game?: readonly GameDoc[] } = {},
): MergePlan {
  const ids = new Set(existing.map((e) => e.id))
  const merged = [...existing]
  let added = 0
  let duplicates = 0
  let unknown = 0
  for (const e of backup.encounters) {
    if (ids.has(e.id)) duplicates++
    // Birds outside the Starter Dex are kept when they carry their own name; anything else unknown is left out.
    else if (!knownSpecies.has(e.speciesId) && !(isOutsideId(e.speciesId) && e.name)) unknown++
    else {
      merged.push(e)
      ids.add(e.id)
      added++
    }
  }
  const addedTargets = backup.targets.filter((t) => knownSpecies.has(t) && !existingTargets.includes(t))
  const haveBatches = new Set((have.importBatches ?? []).map((b) => b.id))
  const addedBatches = (backup.importBatches ?? []).filter((b) => !haveBatches.has(b.id))
  return { merged, added, duplicates, unknown, addedTargets, addedBatches, mergedGame: mergeGameDocs(have.game ?? [], backup.game ?? []) }
}
