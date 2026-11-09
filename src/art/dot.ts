// Dot Lau, Keeper of the Dex: the tutorial guide (character pack, 9 Nov 2026). Not a Reserve Warden.
// Masters, sources and the casting archive: research/art-drafts/game-art/set-f-dot-lau/ (README there).
// Runtime poses are 96x96 with transparent backgrounds; the head icon is 32x32.
const base = import.meta.env.BASE_URL + 'assets/guide/dot/'

export const DOT_POSES = ['talking', 'explaining', 'pointing', 'thinking', 'delighted', 'sympathy', 'missed-sighting', 'sketching'] as const
export type DotPose = (typeof DOT_POSES)[number]

export interface DotPoseArt {
  src: string
  /** Where her mouth is on the 96x96 sprite, before any mirroring. The speech tail aims here. */
  mouth: [number, number]
  /** Mirror so she faces the speech bubble (the pack's own choice for each pose). */
  mirror: boolean
  /** What the pose is for, from the pack's manifest. */
  use: string
}

// Mouth anchors for talking, explaining, delighted, sympathy, missed-sighting and sketching come from the kit's
// dialogue-scenes.json. Pointing and thinking had none, so they were measured on the sprites (9 Nov).
export const DOT_ART: Record<DotPose, DotPoseArt> = {
  talking: { src: `${base}dot-lau-talking-96.png`, mouth: [49, 43], mirror: false, use: 'Opening a conversation' },
  explaining: { src: `${base}dot-lau-explaining-96.png`, mouth: [65, 43], mirror: false, use: 'Showing a field mark in her sketchbook' },
  pointing: { src: `${base}dot-lau-pointing-96.png`, mouth: [46, 41], mirror: false, use: 'Directing you to something' },
  thinking: { src: `${base}dot-lau-thinking-96.png`, mouth: [52, 41], mirror: false, use: 'Considering a field mark' },
  delighted: { src: `${base}dot-lau-delighted-96.png`, mouth: [49, 43], mirror: false, use: 'Quiet celebration for a lifer' },
  sympathy: { src: `${base}dot-lau-sympathy-96.png`, mouth: [47, 44], mirror: false, use: 'Reassurance after disappointment' },
  'missed-sighting': { src: `${base}dot-lau-missed-sighting-96.png`, mouth: [55, 36], mirror: true, use: 'Watching a bird leave' },
  sketching: { src: `${base}dot-lau-sketching-96.png`, mouth: [51, 49], mirror: true, use: 'Field journal idle; the reduced-motion still' },
}

/** Two 96x96 cels of her pencil moving, and the pack's timing (cel index, ms). Reduced motion uses the sketching still. */
export const DOT_SKETCH = {
  src: `${base}dot-lau-sketching-cels-96.png`,
  cell: 96,
  sequence: [
    [0, 700],
    [1, 260],
    [0, 180],
    [1, 540],
  ] as const,
}

export const DOT_AVATAR = { src: `${base}dot-lau-avatar-32.png`, w: 32, h: 32 }

export const DOT_NAME = 'Dot Lau'

export function isDotPose(p: string): p is DotPose {
  return (DOT_POSES as readonly string[]).includes(p)
}
