// Story NPCs (8 Nov 2026, AI-assisted drafts): twelve characters, each with
//  - three dialogue portraits: neutral (NPC pack v1), talk (mouth open) and delight (game art Set C), 256 px + "@2x" 512 px;
//  - a map sprite strip (game art Set B): 4 frames of 48x64 in one 192x64 PNG.
// Masters and design notes (encounters.json: stories, opening lines, keepsakes) live in research/art-drafts/npc-pack-v1/
// and research/art-drafts/game-art/set-{b,c}-*/. These are not the Reserve Wardens (src/art/wardens.ts).
// No screen uses them yet; encounters are design ideas. Keepsake icons: src/art/keepsakes.ts. Dialogue UI kit: src/art/dialogueKit.ts.
const base = import.meta.env.BASE_URL + 'assets/npcs/'

export interface Npc {
  id: string
  name: string
  role: string
}

/** In the order the cast was created (matches `character_order` in encounters.json). */
export const NPCS: readonly Npc[] = [
  { id: 'nell', name: 'Nell', role: 'The dawn-chorus recordist' },
  { id: 'kit', name: 'Kit', role: 'The self-appointed wren expert' },
  { id: 'imani', name: 'Imani', role: 'The hide artist' },
  { id: 'bea', name: 'Bea', role: 'The hide keeper' },
  { id: 'dev', name: 'Dev', role: 'The baker at the gate' },
  { id: 'moss', name: 'Moss', role: 'The photographer who missed it' },
  { id: 'june', name: 'June', role: 'The bridge champion' },
  { id: 'otis', name: 'Otis', role: "The keeper of his sister's map" },
  { id: 'ruth', name: 'Ruth', role: 'The last one in the wood' },
  { id: 'val', name: 'Val', role: "The driver who knows the parakeets' timetable" },
  { id: 'alfie', name: 'Alfie', role: 'The keeper who wants a witness' },
  { id: 'leanne', name: 'Leanne', role: 'The colourist on Erith Pier' },
]

export const npcById = (id: string): Npc | undefined => NPCS.find((n) => n.id === id)

export type Expression = 'neutral' | 'talk' | 'delight'
export const EXPRESSIONS: readonly Expression[] = ['neutral', 'talk', 'delight']

export interface NpcArt {
  src: string
  /** 512x512, for large panels (dialogue). */
  src2x: string
}

/** Dialogue portrait. `talk` is the mouth-open frame (swap with `neutral` while text types out), `delight` a pleased reaction. */
export function npcArt(id: string, expression: Expression = 'neutral'): NpcArt | null {
  if (!npcById(id)) return null
  const stem = expression === 'neutral' ? id : `${id}_${expression}`
  return { src: `${base}${stem}.png`, src2x: `${base}${stem}@2x.png` }
}

/** What each character's 4th map frame shows (from the Set B manifest). Frames 0-2 are the idle loop: rest, breathe, rest. */
const ACTION: Record<string, string> = {
  nell: 'lifts a headphone cup',
  kit: 'raises a finger to his lips',
  imani: 'opens the nuthatch study',
  bea: 'raises the viewing frame',
  dev: 'raises the kitchen timer',
  moss: 'raises the camera',
  june: 'clicks the tally counter',
  otis: 'unfolds the map',
  ruth: 'angles her red-filter torch',
  val: 'points with the duty card',
  alfie: 'raises a goalkeeper glove',
  leanne: 'fans her swatches',
}

export interface NpcMapSprite {
  /** One horizontal strip, 4 frames. */
  src: string
  frameW: 48
  frameH: 64
  frames: 4
  /** Ground anchor inside a frame: the feet. Put this point on the map coordinate. */
  anchor: { x: 24; y: 64 }
  /** Frame index of the one-off action played when tapped (frames 0-2 are the idle loop). */
  actionFrame: 3
  action: string
}

/** Map sprite strip for an NPC (show at integer scales with `image-rendering: pixelated`). */
export function npcMapSprite(id: string): NpcMapSprite | null {
  if (!npcById(id)) return null
  return { src: `${base}map/${id}_map.png`, frameW: 48, frameH: 64, frames: 4, anchor: { x: 24, y: 64 }, actionFrame: 3, action: ACTION[id] }
}
