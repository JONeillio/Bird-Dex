// Story NPCs from the Bird-Dex NPC Asset Pack v1 (8 Nov 2026): twelve dialogue portraits, AI-assisted drafts.
// Masters (1254 px) and the design notes (encounters.json: stories, opening lines, keepsakes) live in
// research/art-drafts/npc-pack-v1/. Runtime portraits are 256x256 with a 512x512 "@2x" for large panels.
// These are not the Reserve Wardens (src/art/wardens.ts). No screen uses them yet; encounters are design ideas.
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

export interface NpcArt {
  src: string
  /** 512x512, for large panels (dialogue). */
  src2x: string
}

export function npcArt(id: string): NpcArt | null {
  return npcById(id) ? { src: `${base}${id}.png`, src2x: `${base}${id}@2x.png` } : null
}
