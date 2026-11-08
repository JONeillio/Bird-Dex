// The game documents (see src/data/personal/game-schema.ts): load once, update on screen straight away, save in the background.
// A failed save keeps the in-memory copy, the same as the records store.
import { create } from 'zustand'
import { DEFAULT_PREFS_EXTRA, isNpcDoc, isPrefsDoc, mergeGameDocs, openedKeysOf, type GameDoc, type PrefsExtraDoc } from '../data/personal/game-schema'
import type { RecordsStorage } from '../data/personal/storage'
import { currentStorage } from './records'

interface GameState {
  docs: Record<string, GameDoc>
  status: 'loading' | 'ready'
  load: (storage?: RecordsStorage) => Promise<void>
  /** Add or replace one document. */
  put: (doc: GameDoc) => Promise<void>
  remove: (id: string) => Promise<void>
  /** A restored backup's documents, merged with what is here (see mergeGameDocs). */
  restore: (docs: readonly GameDoc[]) => Promise<void>
  /** Remember these outing keys as opened. */
  markOpened: (keys: readonly string[]) => Promise<void>
  /** Save a note on an outing; empty text removes it. */
  setNote: (outingKey: string, text: string) => Promise<void>
  /** Save a nickname for a bird; empty removes it. */
  setNickname: (speciesId: string, nickname: string) => Promise<void>
  setPrefs: (patch: Partial<Omit<PrefsExtraDoc, 'id'>>) => Promise<void>
  setNpcChoice: (npcId: string, question: string, answer: string) => Promise<void>
  setNpcHomes: (regionId: string, homes: Record<string, string>) => Promise<void>
}

let storage: RecordsStorage | null = null
const store = (): RecordsStorage => storage ?? currentStorage()

export const useGame = create<GameState>((set, get) => {
  const save = async (op: () => Promise<void>) => {
    try {
      await op()
    } catch {
      /* the in-memory copy stays; the records store already warns about storage problems */
    }
  }
  const put = async (doc: GameDoc) => {
    set({ docs: { ...get().docs, [doc.id]: doc } })
    await save(() => store().putGame(doc))
  }
  return {
    docs: {},
    status: 'loading',
    load: async (s) => {
      storage = s ?? null
      try {
        const list = await store().loadGame()
        set({ docs: Object.fromEntries(list.map((d) => [d.id, d])), status: 'ready' })
      } catch {
        set({ docs: {}, status: 'ready' })
      }
    },
    put,
    remove: async (id) => {
      const { [id]: _gone, ...rest } = get().docs
      set({ docs: rest })
      await save(() => store().removeGame(id))
    },
    restore: async (incoming) => {
      const merged = mergeGameDocs(Object.values(get().docs), incoming)
      const before = get().docs
      const changed = merged.filter((d) => JSON.stringify(before[d.id]) !== JSON.stringify(d))
      set({ docs: Object.fromEntries(merged.map((d) => [d.id, d])) })
      if (changed.length) await save(() => store().putGameMany(changed))
    },
    markOpened: async (keys) => {
      const have = openedKeysOf(Object.values(get().docs))
      const next = [...new Set([...have, ...keys])]
      if (next.length === have.size) return
      await put({ id: 'opened', keys: next })
    },
    setNote: async (outingKey, text) => {
      const id = `note:${outingKey}`
      const t = text.trim().slice(0, 500)
      if (!t) return get().remove(id)
      await put({ id, text: t })
    },
    setNickname: async (speciesId, nickname) => {
      const p = prefsOf(get().docs)
      const nicknames = { ...p.nicknames }
      const n = nickname.trim().slice(0, 24)
      if (n) nicknames[speciesId] = n
      else delete nicknames[speciesId]
      await put({ ...p, nicknames })
    },
    setPrefs: async (patch) => put({ ...prefsOf(get().docs), ...patch, id: 'prefs' }),
    setNpcChoice: async (npcId, question, answer) => {
      const id = `npc:${npcId}`
      const have = get().docs[id]
      const choices = isNpcDoc(have) ? have.choices : {}
      await put({ id, choices: { ...choices, [question]: answer } })
    },
    setNpcHomes: async (regionId, homes) => put({ id: `npcHomes:${regionId}`, homes }),
  }
})

/** The preferences document, with defaults filled in. */
export function prefsOf(docs: Record<string, GameDoc>): PrefsExtraDoc {
  const d = docs.prefs
  return isPrefsDoc(d) ? d : DEFAULT_PREFS_EXTRA
}

/** Outing keys whose Field Report has been opened. */
export const useOpenedKeys = (): Set<string> => openedKeysOf(Object.values(useGame((s) => s.docs)))
