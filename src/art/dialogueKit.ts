// Dialogue and sheet kit (game art Set E, 8 Nov 2026, AI-assisted drafts): stretchable boxes, buttons and small
// animated pieces for NPC dialogue and the Field Report sheet. Native pixel sizes; use `nineSliceCss` for the
// stretchable ones and scale by whole numbers. Notes: research/art-drafts/game-art/set-e-dialogue-kit/README.md
const base = import.meta.env.BASE_URL + 'assets/ui/dialogue/'

export interface Insets {
  l: number
  t: number
  r: number
  b: number
}

export interface KitPiece {
  src: string
  w: number
  h: number
  /** Nine-slice corners and edges in art pixels (stretchable pieces only). */
  slice?: Insets
  /** Where text may start, measured from the outer edge in art pixels. */
  textInset?: Insets
  /** For animated pieces: frames laid out left to right. */
  frames?: { count: number; w: number; h: number }
}

const piece = (file: string, w: number, h: number, extra: Partial<KitPiece> = {}): KitPiece => ({ src: `${base}${file}.png`, w, h, ...extra })

export const DIALOGUE_KIT = {
  /** Speech panel with a tail at bottom-left; the tail sits in the bottom slice. */
  dialogueBox: piece('dialogue_box', 192, 64, { slice: { l: 34, t: 10, r: 10, b: 17 }, textInset: { l: 12, t: 12, r: 12, b: 18 } }),
  /** Forest bar with a cream lettering area, for the speaker's name. */
  nameplate: piece('nameplate', 96, 24, { slice: { l: 14, t: 6, r: 8, b: 6 } }),
  choiceButton: piece('choice_button', 96, 24, { slice: { l: 8, t: 7, r: 8, b: 7 } }),
  choiceButtonPressed: piece('choice_button_pressed', 96, 24, { slice: { l: 8, t: 7, r: 8, b: 7 } }),
  /** Field Report card frame with four leaf sprigs. */
  sheetFrame: piece('sheet_frame', 96, 96, { slice: { l: 21, t: 21, r: 21, b: 21 } }),
  sheetHandle: piece('sheet_handle', 32, 8),
  /** Blinking "next" arrow: two 16x16 frames side by side. */
  next: piece('dialogue_next', 32, 16, { frames: { count: 2, w: 16, h: 16 } }),
  /** "Thinking" bubble: two 24x8 frames side by side. */
  thinking: piece('speech_dots', 48, 8, { frames: { count: 2, w: 24, h: 8 } }),
} satisfies Record<string, KitPiece>

/**
 * CSS for a nine-slice piece at an integer scale (border-image, pixelated). Put it on an element with `box-sizing:
 * border-box`; the padding keeps text inside `textInset` when the piece has one.
 */
export function nineSliceCss(p: KitPiece, scale = 2): Record<string, string> {
  if (!p.slice) throw new Error('not a nine-slice piece')
  const { l, t, r, b } = p.slice
  const px = (a: number, c: number, d: number, e: number) => `${a * scale}px ${c * scale}px ${d * scale}px ${e * scale}px`
  const ti = p.textInset
  const pad = (inset: number, edge: number) => Math.max(0, inset - edge) * scale
  return {
    borderStyle: 'solid',
    borderWidth: px(t, r, b, l),
    borderImageSource: `url(${p.src})`,
    borderImageSlice: `${t} ${r} ${b} ${l} fill`,
    borderImageWidth: px(t, r, b, l),
    imageRendering: 'pixelated',
    padding: ti ? `${pad(ti.t, t)}px ${pad(ti.r, r)}px ${pad(ti.b, b)}px ${pad(ti.l, l)}px` : '0',
  }
}

/** Frame `i` of an animated piece as a CSS background position (whole-pixel steps). */
export function frameOffset(p: KitPiece, i: number, scale = 2): string {
  if (!p.frames) throw new Error('not an animated piece')
  return `-${(i % p.frames.count) * p.frames.w * scale}px 0`
}
