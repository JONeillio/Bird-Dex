// Reserve Warden personas and their portrait art, plus the habitat scenes that came with them.
// Which personas have real art is listed in warden-art.json (R1 adds ids when a set arrives); everyone else
// gets the silhouette fallback drawn in code. Portraits are 96x96 with a 192x192 "@2x" for large panels.
// The art is AI-assisted drafts cut from Joseph's phone screenshots (8 Nov 2026); masters are in
// research/art-drafts/game-art/screenshot-crops/.
import art from './warden-art.json'

const base = import.meta.env.BASE_URL + 'assets/'

export type WardenHabitat = 'wetland' | 'coast' | 'woodland' | 'farmland-upland' | 'garden' | 'raptors' | 'night'

export interface Persona {
  id: string
  name: string
  habitat: WardenHabitat
}

/** All twelve personas (AUTOPILOT D2). The id matches the art file name `warden_<id>.png`. */
export const PERSONAS: readonly Persona[] = [
  { id: 'maud', name: 'Maud the Marsh Warden', habitat: 'wetland' },
  { id: 'reg', name: 'Reg the Reedcutter', habitat: 'wetland' },
  { id: 'bev', name: 'Bev the Bait-digger', habitat: 'coast' },
  { id: 'tomasz', name: 'Tomasz the Tideline Counter', habitat: 'coast' },
  { id: 'rowan', name: 'Rowan the Woodland Ranger', habitat: 'woodland' },
  { id: 'agnes', name: 'Agnes "Old Acorn"', habitat: 'woodland' },
  { id: 'harold', name: 'Harold the Hedgelayer', habitat: 'farmland-upland' },
  { id: 'sunita', name: 'Sunita the Stubble-field Surveyor', habitat: 'farmland-upland' },
  { id: 'pat', name: 'Pat the Park Keeper', habitat: 'garden' },
  { id: 'fran', name: 'Feeder Fran', habitat: 'garden' },
  { id: 'fergus', name: 'Fergus the Raptor Watcher', habitat: 'raptors' },
  { id: 'olu', name: 'Olu "Owl-light"', habitat: 'night' },
]

export const WARDEN_ART: ReadonlySet<string> = new Set(art as string[])

export interface WardenArt {
  src: string
  /** 192x192, for large panels (duel intro). */
  src2x: string
}

/** The portrait for a persona, or null when there is no art yet (draw the silhouette instead). */
export function wardenArt(id: string): WardenArt | null {
  return WARDEN_ART.has(id) ? { src: `${base}wardens/warden_${id}.png`, src2x: `${base}wardens/warden_${id}@2x.png` } : null
}

export const personaById = (id: string): Persona | undefined => PERSONAS.find((p) => p.id === id)

export interface SceneArt {
  src: string
  src2x: string
  /** Native size is square; show at whole-number scales. */
  size: number
  /** Which habitat it suits. */
  habitat: WardenHabitat
  label: string
}

/** Square habitat scenes (opaque). Backdrops for the warden panel and duel arena; decoration only. */
export const SCENE_ART = {
  marshSunset: { src: `${base}scenes/scene_marsh_sunset.png`, src2x: `${base}scenes/scene_marsh_sunset@2x.png`, size: 96, habitat: 'wetland', label: 'Marsh at sunset' },
  waterline: { src: `${base}scenes/scene_waterline.png`, src2x: `${base}scenes/scene_waterline@2x.png`, size: 96, habitat: 'wetland', label: 'Waterline with diving beetle' },
} satisfies Record<string, SceneArt>
