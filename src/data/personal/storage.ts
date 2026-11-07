// Where your records are kept. IndexedDB on the phone; an in-memory copy when the browser won't allow it
// (private mode, storage full), so the app keeps working and says so.
import { openDB, type IDBPDatabase } from 'idb'
import type { Encounter } from '../personal-schema'
import { EncounterSchema } from '../personal-schema'

export interface RecordsStorage {
  readonly persistent: boolean
  loadAll(): Promise<Encounter[]>
  put(e: Encounter): Promise<void>
  remove(id: string): Promise<void>
  replaceAll(list: readonly Encounter[]): Promise<void>
}

export function memoryStorage(initial: readonly Encounter[] = []): RecordsStorage {
  const m = new Map(initial.map((e) => [e.id, e]))
  return {
    persistent: false,
    loadAll: async () => [...m.values()],
    put: async (e) => void m.set(e.id, e),
    remove: async (id) => void m.delete(id),
    replaceAll: async (list) => {
      m.clear()
      list.forEach((e) => m.set(e.id, e))
    },
  }
}

const DB_NAME = 'birdquest'
const STORE = 'encounters'

export async function idbStorage(): Promise<RecordsStorage> {
  const db: IDBPDatabase = await openDB(DB_NAME, 1, {
    upgrade(d) {
      d.createObjectStore(STORE, { keyPath: 'id' })
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
  }
}
