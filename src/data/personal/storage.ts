// Where your records are kept. IndexedDB on the phone; an in-memory copy when the browser won't allow it
// (private mode, storage full), so the app keeps working and says so.
import { openDB, type IDBPDatabase } from 'idb'
import type { Encounter, ImportBatch } from '../personal-schema'
import { EncounterSchema, ImportBatchSchema } from '../personal-schema'
import { GameDocSchema, type GameDoc } from './game-schema'

export interface RecordsStorage {
  readonly persistent: boolean
  loadAll(): Promise<Encounter[]>
  put(e: Encounter): Promise<void>
  remove(id: string): Promise<void>
  replaceAll(list: readonly Encounter[]): Promise<void>
  /** Write many records in one go (imports write in chunks of 500). */
  putMany(list: readonly Encounter[]): Promise<void>
  loadBatches(): Promise<ImportBatch[]>
  putBatch(b: ImportBatch): Promise<void>
  /** Undo an import: delete these records and the import's history entry. */
  removeMany(ids: readonly string[], batchId: string): Promise<void>
  /** Game documents (opened parcels, notes, calls, NPC answers, preferences). Damaged ones are skipped. */
  loadGame(): Promise<GameDoc[]>
  putGame(doc: GameDoc): Promise<void>
  putGameMany(docs: readonly GameDoc[]): Promise<void>
  removeGame(id: string): Promise<void>
}

export function memoryStorage(initial: readonly Encounter[] = []): RecordsStorage {
  const m = new Map(initial.map((e) => [e.id, e]))
  const batches = new Map<string, ImportBatch>()
  const game = new Map<string, GameDoc>()
  return {
    persistent: false,
    loadAll: async () => [...m.values()],
    put: async (e) => void m.set(e.id, e),
    remove: async (id) => void m.delete(id),
    replaceAll: async (list) => {
      m.clear()
      list.forEach((e) => m.set(e.id, e))
    },
    putMany: async (list) => void list.forEach((e) => m.set(e.id, e)),
    loadBatches: async () => [...batches.values()],
    putBatch: async (b) => void batches.set(b.id, b),
    removeMany: async (ids, batchId) => {
      ids.forEach((id) => m.delete(id))
      batches.delete(batchId)
    },
    loadGame: async () => [...game.values()],
    putGame: async (d) => void game.set(d.id, d),
    putGameMany: async (docs) => void docs.forEach((d) => game.set(d.id, d)),
    removeGame: async (id) => void game.delete(id),
  }
}

const DB_NAME = 'birdquest'
const STORE = 'encounters'
const BATCHES = 'importBatches'
const GAME = 'game'

export async function idbStorage(): Promise<RecordsStorage> {
  const db: IDBPDatabase = await openDB(DB_NAME, 3, {
    upgrade(d) {
      // Version 1 had only the encounters store; version 2 adds the import history; version 3 adds the game documents. Existing records are untouched.
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id' })
      if (!d.objectStoreNames.contains(BATCHES)) d.createObjectStore(BATCHES, { keyPath: 'id' })
      if (!d.objectStoreNames.contains(GAME)) d.createObjectStore(GAME, { keyPath: 'id' })
    },
  })
  return {
    persistent: true,
    async loadAll() {
      const rows: unknown[] = await db.getAll(STORE)
      // A damaged row is skipped rather than breaking the whole journal.
      return rows.flatMap((r) => {
        const p = EncounterSchema.safeParse(r)
        return p.success ? [p.data] : []
      })
    },
    async put(e) {
      await db.put(STORE, e)
    },
    async remove(id) {
      await db.delete(STORE, id)
    },
    async replaceAll(list) {
      const tx = db.transaction(STORE, 'readwrite')
      await tx.store.clear()
      await Promise.all(list.map((e) => tx.store.put(e)))
      await tx.done
    },
    async putMany(list) {
      const tx = db.transaction(STORE, 'readwrite')
      await Promise.all(list.map((e) => tx.store.put(e)))
      await tx.done
    },
    async loadBatches() {
      const rows: unknown[] = await db.getAll(BATCHES)
      return rows.flatMap((r) => {
        const p = ImportBatchSchema.safeParse(r)
        return p.success ? [p.data] : []
      })
    },
    async putBatch(b) {
      await db.put(BATCHES, b)
    },
    async removeMany(ids, batchId) {
      const tx = db.transaction([STORE, BATCHES], 'readwrite')
      await Promise.all([...ids.map((id) => tx.objectStore(STORE).delete(id)), tx.objectStore(BATCHES).delete(batchId)])
      await tx.done
    },
    async loadGame() {
      const rows: unknown[] = await db.getAll(GAME)
      return rows.flatMap((r) => {
        const p = GameDocSchema.safeParse(r)
        return p.success ? [p.data] : []
      })
    },
    async putGame(d) {
      await db.put(GAME, d)
    },
    async putGameMany(docs) {
      const tx = db.transaction(GAME, 'readwrite')
      await Promise.all(docs.map((d) => tx.store.put(d)))
      await tx.done
    },
    async removeGame(id) {
      await db.delete(GAME, id)
    },
  }
}
