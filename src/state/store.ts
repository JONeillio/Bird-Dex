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
  /** Show the labelled demo collection instead of real records (real records arrive in M2). */
  demoCollection: boolean
  /** Species ids the user is hunting for. Moves to IndexedDB in M2. */
  targets: string[]
}

export const DEFAULT_PREFS: Prefs = {
  skin: 'adventure',
  driveLimit: 60,
  unrecordedOnly: true,
  targetsOnly: false,
  soundOn: false, // audio is opt-in
  regionId: 'location-1',
  startId: 'location-1',
  demoCollection: false,
  targets: [],
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
  toggleTarget: (speciesId: string) => void
  /** Species the map should focus on (set by Find nearby). Not persisted. */
  focusSpeciesId: string | null
  setFocusSpecies: (id: string | null) => void
}

export const useStore = create<Store>((set, get) => ({
  prefs: loadPrefs(),
  setPref: (key, value) => {
    const prefs = { ...get().prefs, [key]: value }
    savePrefs(prefs)
    set({ prefs })
  },
  toggleTarget: (id) => {
    const cur = get().prefs.targets
    const targets = cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id]
    const prefs = { ...get().prefs, targets }
    savePrefs(prefs)
    set({ prefs })
  },
  focusSpeciesId: null,
  setFocusSpecies: (id) => set({ focusSpeciesId: id }),
}))
