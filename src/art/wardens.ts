// Reserve Warden personas and their portrait art, plus the habitat scenes that came with them.
// Which personas have real art is listed in warden-art.json (R1 adds ids when a set arrives); everyone else
// gets the silhouette fallback drawn in code. Portraits are 96x96 with a 192x192 "@2x" for large panels.
// The art is AI-assisted drafts: Maud, Reg, Agnes and Harold were cut from Joseph's phone screenshots (masters in
// research/art-drafts/game-art/screenshot-crops/); the other eight and the unmet silhouette are game art Set 6
// (research/art-drafts/game-art/set-6-wardens/, which has the review notes). All 12 personas now have art.
import art from './warden-art.json'

const base = import.meta.env.BASE_URL + 'assets/'

export { PERSONAS, personaById } from '../data/personas'
export type { Persona, WardenHabitat } from '../data/personas'
import type { WardenHabitat } from '../data/personas'

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

/** Ink silhouette shown before you have met a warden (same 96x96 framing as the portraits). */
export const WARDEN_SILHOUETTE: WardenArt = { src: `${base}wardens/warden_silhouette.png`, src2x: `${base}wardens/warden_silhouette@2x.png` }

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
