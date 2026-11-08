// Where your records are kept. IndexedDB on the phone; an in-memory copy when the browser won't allow it
// (private mode, storage full), so the app keeps working and says so.
import { openDB, type IDBPDatabase } from 'idb'
import type { Encounter, ImportBatch } from '../personal-schema'
import { EncounterSchema, ImportBatchSchema } from '../personal-schema'

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
}

export function memoryStorage(initial: readonly Encounter[] = []): RecordsStorage {
  const m = new Map(initial.map((e) => [e.id, e]))
  const batches = new Map<string, ImportBatch>()
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
  }
}

const DB_NAME = 'birdquest'
const STORE = 'encounters'
const BATCHES = 'importBatches'

export async function idbStorage(): Promise<RecordsStorage> {
  const db: IDBPDatabase = await openDB(DB_NAME, 2, {
    upgrade(d) {
      // Version 1 had only the encounters store; version 2 adds the import history. Existing records are untouched.
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id' })
      if (!d.objectStoreNames.contains(BATCHES)) d.createObjectStore(BATCHES, { keyPath: 'id' })
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
  }
}
