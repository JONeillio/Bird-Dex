// Your own records. They live on this phone (IndexedDB) and in backup files you download; they are never
// sent anywhere. Public eBird reports never create one of these: only logging (or, later, an import) does.
import { z } from 'zod'

export const MODES = ['seen', 'heard', 'both'] as const
export type Mode = (typeof MODES)[number]
export const MODE_LABELS: Record<Mode, string> = { seen: 'Seen', heard: 'Heard', both: 'Seen and heard' }

/** A real eBird hotspot id such as L123456. Demo sites (LDEMO01) are deliberately not valid. */
export const SITE_ID_PATTERN = /^L\d+$/
export function validSiteId(id: string | null | undefined): string | null {
  return id && SITE_ID_PATTERN.test(id) ? id : null
}

export const EncounterSchema = z.object({
  id: z.string().min(8).max(64),
  speciesId: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  /** YYYY-MM-DD, or null when an import had no date (never invented). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  /** A free-text place label. Never GPS coordinates. */
  place: z.string().max(120),
  mode: z.enum(MODES),
  notes: z.string().max(500),
  /** A small JPEG data URL (kept on this phone), or null. */
  photo: z.string().startsWith('data:image/').max(400_000).nullable(),
  createdAt: z.string(),
  // Added later; all optional so older records and backups still load.
  /** The eBird hotspot id, when the sighting was logged at (or imported from) a known site. */
  siteId: z.string().regex(SITE_ID_PATTERN).nullable().optional(),
  /** HH:MM in 24 hours, or null when unknown (never invented). */
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  /** Birds outside the Starter Dex (speciesId starts `x-`) keep their own names here. */
  name: z.string().max(80).optional(),
  sciName: z.string().max(80).optional(),
  /** Where the record came from: logged by hand, an eBird export, or a pasted list. */
  source: z.enum(['log', 'ebird', 'list']).optional(),
  /** Which import added it, so one import can be undone. */
  importBatchId: z.string().max(64).optional(),
  /** Identifies the source row, so importing the same export twice adds nothing. */
  importKey: z.string().max(200).optional(),
})
export type Encounter = z.infer<typeof EncounterSchema>

/** A record of one import, kept so it can be listed and (later) undone. */
export const ImportBatchSchema = z.object({
  id: z.string().min(1).max(64),
  source: z.enum(['ebird', 'list']),
  fileName: z.string().max(120),
  /** Data rows read from the file. */
  rowCount: z.number().int().nonnegative(),
  /** Sightings actually added. */
  importedCount: z.number().int().nonnegative(),
  date: z.string(),
})
export type ImportBatch = z.infer<typeof ImportBatchSchema>

export const BackupSchema = z.object({
  app: z.literal('birdquest'),
  schema: z.literal(1),
  exportedAt: z.string(),
  encounters: z.array(EncounterSchema),
  targets: z.array(z.string()),
})
export type Backup = z.infer<typeof BackupSchema>
