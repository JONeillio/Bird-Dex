import { create } from 'zustand'
import type { Encounter, ImportBatch } from '../data/personal-schema'
import { idbStorage, memoryStorage, type RecordsStorage } from '../data/personal/storage'

type Status = 'loading' | 'ready'

interface RecordsState {
  encounters: Encounter[]
  /** Past imports, newest last. */
  batches: ImportBatch[]
  status: Status
  /** Set when records can only be kept in memory this session. */
  warning: string | null
  load: (storage?: RecordsStorage) => Promise<void>
  add: (e: Encounter) => Promise<void>
  update: (e: Encounter) => Promise<void>
  remove: (id: string) => Promise<void>
  replaceAll: (list: Encounter[]) => Promise<void>
  /** Add imported sightings in chunks (so a big file does not freeze the phone) and record the import. */
  addMany: (list: Encounter[], batch: ImportBatch, onProgress?: (fraction: number) => void) => Promise<void>
  /** Undo one import: removes every sighting it added and its history entry. Sightings you logged yourself are never touched. Returns how many were removed. */
  undoBatch: (batchId: string) => Promise<number>
}

let storage: RecordsStorage = memoryStorage()

const WARNING = 'This browser would not let BirdQuest save records on the phone (private mode or full storage). Sightings will be lost when you close it, so download a backup.'

export const useRecords = create<RecordsState>((set, get) => {
  /** Write through to storage. A failure keeps the in-memory copy and raises the warning. */
  const save = async (op: () => Promise<void>) => {
    try {
      await op()
    } catch {
      set({ warning: WARNING })
    }
  }
  return {
    encounters: [],
    batches: [],
    status: 'loading',
    warning: null,
    load: async (s) => {
      try {
        storage = s ?? (await idbStorage())
        set({ encounters: await storage.loadAll(), batches: await storage.loadBatches(), status: 'ready', warning: null })
      } catch {
        storage = memoryStorage()
        set({ encounters: [], batches: [], status: 'ready', warning: WARNING })
      }
    },
    add: async (e) => {
      set({ encounters: [...get().encounters, e] })
      await save(() => storage.put(e))
    },
    update: async (e) => {
      set({ encounters: get().encounters.map((x) => (x.id === e.id ? e : x)) })
      await save(() => storage.put(e))
    },
    remove: async (id) => {
      set({ encounters: get().encounters.filter((x) => x.id !== id) })
      await save(() => storage.remove(id))
    },
    replaceAll: async (list) => {
      set({ encounters: list })
      await save(() => storage.replaceAll(list))
    },
    addMany: async (list, batch, onProgress) => {
      const CHUNK = 500
      for (let i = 0; i < list.length; i += CHUNK) {
        const chunk = list.slice(i, i + CHUNK)
        await save(() => storage.putMany(chunk))
        onProgress?.(Math.min(1, (i + chunk.length) / list.length))
        // Let the screen repaint between chunks.
        await new Promise((r) => setTimeout(r, 0))
      }
      await save(() => storage.putBatch(batch))
      set({ encounters: [...get().encounters, ...list], batches: [...get().batches, batch] })
    },
    undoBatch: async (batchId) => {
      const gone = get().encounters.filter((e) => e.importBatchId === batchId)
      set({ encounters: get().encounters.filter((e) => e.importBatchId !== batchId), batches: get().batches.filter((b) => b.id !== batchId) })
      await save(() => storage.removeMany(gone.map((e) => e.id), batchId))
      return gone.length
    },
  }
})

export function newEncounterId(): string {
  const c = globalThis.crypto
  return c?.randomUUID ? c.randomUUID() : `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}
