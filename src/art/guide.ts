// Pearl, Keeper of the Dex: the tutorial guide. Not a Reserve Warden. Renamed from "Dot Lau" on 10 Nov 2026 (Joseph);
// the art files keep the pack's dot-lau / dot-tour names. Change her name here and in src/data/tours.v1.json.
// Masters and sources: research/art-drafts/game-art/set-f-dot-lau/ (sketchbook poses, 9 Nov) and
// set-h-dot-tour-poses/ (everyday poses, 10 Nov). Runtime poses are 96x96, transparent; the head icon is 32x32.
const base = import.meta.env.BASE_URL + 'assets/guide/dot/'

/** Everyday poses (no sketchbook): most of what she says. */
export const TALK_POSES = ['chat', 'introduce', 'clarify', 'compare', 'aside', 'over-to-you'] as const
/** Sketchbook poses: she is holding up her drawing (it is always the same wren). Save them for birds. */
export const BOOK_POSES = ['talking', 'explaining', 'pointing', 'thinking', 'delighted', 'sympathy', 'missed-sighting', 'sketching'] as const
export const GUIDE_POSES = [...TALK_POSES, ...BOOK_POSES] as const
export type GuidePose = (typeof GUIDE_POSES)[number]

export interface GuidePoseArt {
  src: string
  /** Where her mouth is on the 96x96 sprite, before any mirroring. The speech tail aims here. */
  mouth: [number, number]
  /** Mirror so she faces the speech bubble (the pack's own choice for each pose). */
  mirror: boolean
  /** She is showing her wren drawing. Keep these for bird moments (a new bird, identification), not general chat. */
  drawing: boolean
  /** What the pose is for, from the pack's manifest. */
  use: string
}

// Mouth anchors come from the packs' scene files (dialogue-scenes.json, dot-tour-scenes.json); pointing and thinking
// had none, so they were measured on the sprites (9 Nov).
export const GUIDE_ART: Record<GuidePose, GuidePoseArt> = {
  chat: { src: `${base}dot-tour-chat-96.png`, mouth: [47, 46], mirror: false, drawing: false, use: 'Greetings, transitions, ordinary lines' },
  introduce: { src: `${base}dot-tour-introduce-96.png`, mouth: [54, 46], mirror: false, drawing: false, use: 'Open hand towards something: a list, a card, a screen' },
  clarify: { src: `${base}dot-tour-clarify-96.png`, mouth: [46, 52], mirror: false, drawing: false, use: 'Peering over her glasses: a detail that is easy to miss' },
  compare: { src: `${base}dot-tour-compare-96.png`, mouth: [47, 47], mirror: false, drawing: false, use: 'Counting on her fingers: two values or a short sequence' },
  aside: { src: `${base}dot-tour-aside-96.png`, mouth: [34, 49], mirror: false, drawing: false, use: 'Hand to her cheek: a joke or an aside' },
  'over-to-you': { src: `${base}dot-tour-over-to-you-96.png`, mouth: [52, 42], mirror: false, drawing: false, use: 'Arms folded, waiting: choices, questions, the end' },
  talking: { src: `${base}dot-lau-talking-96.png`, mouth: [49, 43], mirror: false, drawing: true, use: 'Holding up her drawing' },
  explaining: { src: `${base}dot-lau-explaining-96.png`, mouth: [65, 43], mirror: false, drawing: true, use: 'Showing a field mark in her sketchbook' },
  pointing: { src: `${base}dot-lau-pointing-96.png`, mouth: [46, 41], mirror: false, drawing: true, use: 'Drawing in one hand, pointing with the other' },
  thinking: { src: `${base}dot-lau-thinking-96.png`, mouth: [52, 41], mirror: false, drawing: true, use: 'Considering a field mark' },
  delighted: { src: `${base}dot-lau-delighted-96.png`, mouth: [49, 43], mirror: false, drawing: true, use: 'Quiet celebration for a new bird' },
  sympathy: { src: `${base}dot-lau-sympathy-96.png`, mouth: [47, 44], mirror: false, drawing: false, use: 'Reassurance after disappointment' },
  'missed-sighting': { src: `${base}dot-lau-missed-sighting-96.png`, mouth: [55, 36], mirror: true, drawing: false, use: 'Watching a bird leave' },
  sketching: { src: `${base}dot-lau-sketching-96.png`, mouth: [51, 49], mirror: true, drawing: true, use: 'Drawing your new bird; the reduced-motion still' },
}

/** Two 96x96 cels of her pencil moving, and the pack's timing (cel index, ms). Reduced motion uses the sketching still. */
export const GUIDE_SKETCH = {
  src: `${base}dot-lau-sketching-cels-96.png`,
  cell: 96,
  sequence: [
    [0, 700],
    [1, 260],
    [0, 180],
    [1, 540],
  ] as const,
}

export const GUIDE_AVATAR = { src: `${base}dot-lau-avatar-32.png`, w: 32, h: 32 }

export const GUIDE_NAME = 'Pearl'

export function isGuidePose(p: string): p is GuidePose {
  return (GUIDE_POSES as readonly string[]).includes(p)
}
