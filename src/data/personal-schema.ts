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
