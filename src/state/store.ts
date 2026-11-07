import { create } from 'zustand'

export type Skin = 'adventure' | 'field'
export type DriveLimit = 30 | 60 | 90

export interface Prefs {
  skin: Skin
  driveLimit: DriveLimit
  unrecordedOnly: boolean
  targetsOnly: boolean
  soundOn: boolean
  regionId: string
  startId: string
}

export const DEFAULT_PREFS: Prefs = {
  skin: 'adventure',
  driveLimit: 60,
  unrecordedOnly: true,
  targetsOnly: false,
  soundOn: false, // audio is opt-in
  regionId: 'greater-manchester',
  startId: 'chorlton-green',
}

const KEY = 'bq.prefs'

/** localStorage can throw or come back empty; always fall back to defaults. */
export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_PREFS }
    return { ...DEFAULT_PREFS, ...(parsed as Partial<Prefs>) }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* private mode or storage full: keep working in memory */
  }
}

interface Store {
  prefs: Prefs
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void
}

export const useStore = create<Store>((set, get) => ({
  prefs: loadPrefs(),
  setPref: (key, value) => {
    const prefs = { ...get().prefs, [key]: value }
    savePrefs(prefs)
    set({ prefs })
  },
}))
