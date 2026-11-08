// The small documents the game layer keeps on this phone (AUTOPILOT P3): which Field Reports you have opened,
// notes on outings, Call it records, answers you gave NPCs, where NPCs live for you, and a few preferences.
// Only things that cannot be worked out from your sightings are stored here. A damaged document is skipped, never fatal.
import { z } from 'zod'

const SPECIES_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Outing keys (date|siteKey) whose Field Report you have opened. */
export const OpenedDocSchema = z.strictObject({ id: z.literal('opened'), keys: z.array(z.string().min(1).max(200)).max(20000) })

/** A note you wrote about one outing. */
export const OutingNoteDocSchema = z.strictObject({ id: z.string().regex(/^note:.+/).max(210), text: z.string().max(500) })

/** A Call it record (P11 fills in the rest, so unknown fields are kept). */
export const CallDocSchema = z
  .object({
    id: z.string().regex(/^call:.+/).max(80),
    wardenId: z.string().min(1).max(80),
    siteId: z.string().min(1).max(40),
    madeAt: z.string().min(10).max(40),
    expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .passthrough()

/** What you answered in an NPC encounter, keyed by question id. Nothing derivable is kept. */
export const NpcDocSchema = z.strictObject({ id: z.string().regex(/^npc:[a-z0-9-]+$/).max(60), choices: z.record(z.string().max(60), z.string().max(120)) })

/** Which site each NPC calls home in a region (npcId to siteId). */
export const NpcHomesDocSchema = z.strictObject({ id: z.string().regex(/^npcHomes:[a-z0-9-]+$/).max(60), homes: z.record(z.string().max(60), z.string().max(40)) })

export const PrefsExtraDocSchema = z.strictObject({
  id: z.literal('prefs'),
  nicknames: z.record(z.string().regex(SPECIES_ID), z.string().max(24)),
  lastNewsSeenAt: z.string().nullable(),
  lastReportSeenAt: z.string().nullable(),
  playerName: z.string().max(24),
})

export const GameDocSchema = z.union([OpenedDocSchema, OutingNoteDocSchema, CallDocSchema, NpcDocSchema, NpcHomesDocSchema, PrefsExtraDocSchema])
export type GameDoc = z.infer<typeof GameDocSchema>
export type OpenedDoc = z.infer<typeof OpenedDocSchema>
export type PrefsExtraDoc = z.infer<typeof PrefsExtraDocSchema>

export const isOpenedDoc = (d: GameDoc | undefined): d is OpenedDoc => !!d && d.id === 'opened' && 'keys' in d
export const isPrefsDoc = (d: GameDoc | undefined): d is PrefsExtraDoc => !!d && d.id === 'prefs' && 'nicknames' in d
export const isNpcDoc = (d: GameDoc | undefined): d is z.infer<typeof NpcDocSchema> => !!d && d.id.startsWith('npc:') && 'choices' in d

export const DEFAULT_PREFS_EXTRA: PrefsExtraDoc = { id: 'prefs', nicknames: {}, lastNewsSeenAt: null, lastReportSeenAt: null, playerName: '' }

/** Keep the documents that are valid and drop the rest (one per id, the last wins). */
export function validGameDocs(raw: readonly unknown[]): GameDoc[] {
  const byId = new Map<string, GameDoc>()
  for (const r of raw) {
    const p = GameDocSchema.safeParse(r)
    if (p.success) byId.set(p.data.id, p.data)
  }
  return [...byId.values()]
}

/**
 * Bring a backup's documents into what is already on the phone. The phone wins whenever it has a document;
 * the backup only fills gaps. The exception is `opened`, where the two sets of keys are joined.
 */
export function mergeGameDocs(have: readonly GameDoc[], incoming: readonly GameDoc[]): GameDoc[] {
  const byId = new Map(have.map((d) => [d.id, d]))
  for (const d of incoming) {
    const mine = byId.get(d.id)
    if (!mine) byId.set(d.id, d)
    else if (isOpenedDoc(mine) && isOpenedDoc(d)) byId.set('opened', { id: 'opened', keys: [...new Set([...mine.keys, ...d.keys])] })
  }
  return [...byId.values()]
}

export const openedKeysOf = (docs: readonly GameDoc[]): Set<string> => {
  const d = docs.find(isOpenedDoc)
  return new Set(d?.keys ?? [])
}

const CallPickSchema = z.strictObject({ key: z.string().regex(SPECIES_ID).max(80), name: z.string().min(1).max(80), pts: z.number().int().min(1).max(4) })
/** The full Call it record (P11). Points are stored with the call, so later data cannot change them. */
export const CallRecordSchema = z.strictObject({
  id: z.string().regex(/^call:.+/).max(80),
  wardenId: z.string().min(1).max(80),
  siteId: z.string().min(1).max(40),
  madeAt: z.string().min(10).max(40),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  player: z.array(CallPickSchema).min(1).max(5),
  warden: z.array(CallPickSchema).max(5),
})
export type CallRecord = z.infer<typeof CallRecordSchema>
export type CallPick = z.infer<typeof CallPickSchema>

/** A stored game document as a full Call it record, or null when it is not one (or is damaged). */
export function asCallRecord(doc: GameDoc | undefined): CallRecord | null {
  if (!doc || !doc.id.startsWith('call:')) return null
  const p = CallRecordSchema.safeParse(doc)
  return p.success ? p.data : null
}
