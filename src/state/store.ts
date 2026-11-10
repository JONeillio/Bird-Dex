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
  /** Species ids the user is hunting for. */
  targets: string[]
  /** Short buzzes on catches and taps (Android). */
  hapticsOn: boolean
  /** Tilt effects: parallax scenes and shiny recorded cards. */
  tiltOn: boolean
  /** Keep the screen on while the app is open. */
  keepAwake: boolean
  /** When the last backup file was downloaded (ISO), for the gentle reminder. */
  lastBackupAt: string | null
  /** Set once the default area has moved to South East London, so phones that saved an old area are moved over one time. */
  areaV2: boolean
  /** Tours with Pearl that were finished or turned down ("Don't show this again"), so they don't start by themselves. */
  toursDone: string[]
  /** Now and then a small bird flies across the map (decoration). */
  flyBys: boolean
  /** The background tune (with birdsong on the map). On by default; starts on the first tap. */
  ambienceOn: boolean
  /** 0-1. */
  ambienceVolume: number
  /** Set once ambience has been switched on for phones that saved prefs before it became on by default (10 Nov). */
  audioV2: boolean
}

export const DEFAULT_PREFS: Prefs = {
  skin: 'adventure',
  driveLimit: 60,
  unrecordedOnly: true,
  targetsOnly: false,
  soundOn: false, // audio is opt-in
  regionId: 'se-london',
  startId: 'erith',
  areaV2: true,
  demoCollection: false,
  targets: [],
  hapticsOn: true,
  tiltOn: true,
  keepAwake: false,
  lastBackupAt: null,
  toursDone: [],
  flyBys: true,
  ambienceOn: true,
  ambienceVolume: 0.4,
  audioV2: true,
}

const KEY = 'bq.prefs'

/** localStorage can throw or come back empty; always fall back to defaults. */
export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_PREFS }
    const p = parsed as Partial<Prefs>
    let merged: Prefs = { ...DEFAULT_PREFS, ...p }
    // One-time move to the new default area (Location 1 and 2 became South East London, Southampton and South Manchester).
    if (p.areaV2 !== true) merged = { ...merged, regionId: DEFAULT_PREFS.regionId, startId: DEFAULT_PREFS.startId, areaV2: true }
    // One-time: the tune became on by default (10 Nov), so phones that saved "off" before then get it switched on once.
    if (p.audioV2 !== true) merged = { ...merged, ambienceOn: true, ambienceVolume: DEFAULT_PREFS.ambienceVolume, audioV2: true }
    return merged
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
  /** Bird the map should focus on (set by Find nearby / Find a bird): a Dex id or "ebird:<code>". Not persisted. */
  focusSpeciesId: string | null
  /** Site to select when the map opens with a focus (a row tapped in "Reported nearby"). Not persisted. */
  focusSiteId: string | null
  setFocusSpecies: (id: string | null, siteId?: string | null) => void
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
  focusSiteId: null,
  setFocusSpecies: (id, siteId = null) => set({ focusSpeciesId: id, focusSiteId: siteId }),
}))
