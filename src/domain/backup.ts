// Backup and restore of your own records. Pure functions; the Settings screen does the file handling.
import { BackupSchema, type Backup, type Encounter } from '../data/personal-schema'

export function buildBackup(encounters: readonly Encounter[], targets: readonly string[], now: Date = new Date()): Backup {
  return { app: 'birdquest', schema: 1, exportedAt: now.toISOString(), encounters: [...encounters], targets: [...targets] }
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
}

/** Merge a backup into what is on this phone without duplicating anything. Never removes existing records. */
export function planRestore(existing: readonly Encounter[], existingTargets: readonly string[], backup: Backup, knownSpecies: ReadonlySet<string>): MergePlan {
  const have = new Set(existing.map((e) => e.id))
  const merged = [...existing]
  let added = 0
  let duplicates = 0
  let unknown = 0
  for (const e of backup.encounters) {
    if (have.has(e.id)) duplicates++
    else if (!knownSpecies.has(e.speciesId)) unknown++
    else {
      merged.push(e)
      have.add(e.id)
      added++
    }
  }
  const addedTargets = backup.targets.filter((t) => knownSpecies.has(t) && !existingTargets.includes(t))
  return { merged, added, duplicates, unknown, addedTargets }
}
