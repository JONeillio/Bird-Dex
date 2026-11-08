// Your own records. They live on this phone (IndexedDB) and in backup files you download; they are never
// sent anywhere. Public eBird reports never create one of these: only logging (or, later, an import) does.
import { z } from 'zod'

export const MODES = ['seen', 'heard', 'both'] as const
export type Mode = (typeof MODES)[number]
export const MODE_LABELS: Record<Mode, string> = { seen: 'Seen', heard: 'Heard', both: 'Seen and heard' }

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
  siteId: z.string().regex(/^L\d+$/).nullable().optional(),
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

export const BackupSchema = z.object({
  app: z.literal('birdquest'),
  schema: z.literal(1),
  exportedAt: z.string(),
  encounters: z.array(EncounterSchema),
  targets: z.array(z.string()),
})
export type Backup = z.infer<typeof BackupSchema>
