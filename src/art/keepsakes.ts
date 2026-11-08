// Keepsake icons (game art Set D, 8 Nov 2026, AI-assisted drafts): one 32x32 icon per story NPC, the object they
// hand over. Show at whole-number scales. What each keepsake does in the story is design only (encounters.json in
// research/art-drafts/npc-pack-v1/); nothing awards them yet. Notes: research/art-drafts/game-art/set-d-keepsake-icons/README.md
const base = import.meta.env.BASE_URL + 'assets/keepsakes/'

export interface Keepsake {
  id: string
  /** The NPC who gives it (ids in src/art/npcs.ts). */
  npcId: string
  label: string
  src: string
  w: 32
  h: 32
}

const k = (id: string, npcId: string, label: string): Keepsake => ({ id, npcId, label, src: `${base}keepsake_${id}.png`, w: 32, h: 32 })

export const KEEPSAKES: readonly Keepsake[] = [
  k('recording', 'nell', "Nell's labelled field recording"),
  k('wren_sticker', 'kit', "Kit's wren sticker"),
  k('nuthatch_study', 'imani', "Imani's nuthatch study"),
  k('viewing_window', 'bea', "Bea's viewing window"),
  k('order_slip', 'dev', "Dev's bakery order slip"),
  k('photo_crop', 'moss', "Moss's photograph with the pink crop"),
  k('bridge_pin', 'june', "June's enamel bridge pin"),
  k('hand_map', 'otis', "His sister's hand-drawn map"),
  k('enamel_cups', 'ruth', "Ruth's enamel cups"),
  k('duty_card', 'val', "Val's parakeet duty card"),
  k('match_report', 'alfie', "Alfie's signed match report"),
  k('palette_swatch', 'leanne', "Leanne's Erith Pier palette"),
]

export const keepsakeFor = (npcId: string): Keepsake | undefined => KEEPSAKES.find((x) => x.npcId === npcId)
