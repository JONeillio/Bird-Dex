import { create } from 'zustand'
import type { Encounter } from '../data/personal-schema'
import { idbStorage, memoryStorage, type RecordsStorage } from '../data/personal/storage'

type Status = 'loading' | 'ready'

interface RecordsState {
  encounters: Encounter[]
  status: Status
  /** Set when records can only be kept in memory this session. */
  warning: string | null
  load: (storage?: RecordsStorage) => Promise<void>
  add: (e: Encounter) => Promise<void>
  update: (e: Encounter) => Promise<void>
  remove: (id: string) => Promise<void>
  replaceAll: (list: Encounter[]) => Promise<void>
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
    status: 'loading',
    warning: null,
    load: async (s) => {
      try {
        storage = s ?? (await idbStorage())
        set({ encounters: await storage.loadAll(), status: 'ready', warning: null })
      } catch {
        storage = memoryStorage()
        set({ encounters: [], status: 'ready', warning: WARNING })
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
  }
})

export function newEncounterId(): string {
  const c = globalThis.crypto
  return c?.randomUUID ? c.randomUUID() : `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}
