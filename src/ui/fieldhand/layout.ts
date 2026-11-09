// Fieldhand text layout and letter timing (Dot's dialogue kit, 9 Nov 2026). Pure, so it can be tested without a canvas.
// Ported from research/art-drafts/game-art/set-g-fieldhand-dialogue/dialogue-player.js; the falling drop is ours.
import glyphData from '../../art/fieldhand/glyphs.json'

export interface Glyph {
  x: number
  y: number
  advance: number
}

export interface FieldhandMetrics {
  tile: [number, number]
  origin: [number, number]
  baseline: number
  lineHeight: number
  landingMs: number
  letterMs: number
  glyphs: Record<string, Glyph>
}

export const METRICS = glyphData as unknown as FieldhandMetrics

/** The dialogue canvas in logical pixels, and the speech body inside it (from the kit). */
export const CANVAS = { w: 360, h: 166 } as const
export const BODY = { x: 6, y: 21, w: 235, h: 115 } as const
export const LINES_PER_PAGE = 4
const TEXT_LEFT = 14
const TEXT_TOP = 20
const LINE_STEP = 23
const MAX_LINE = BODY.w - 30

/**
 * Motion. A letter appears `fallPx` above its place, drops there in `fallMs` (speeding up, like something falling),
 * sits tilted in its landing pose for the kit's `landingMs`, then stamps upright. Spaces and punctuation pauses come
 * from the kit.
 */
export const MOTION = { fallPx: 16, fallMs: 120, spaceMs: 14, commaMs: 80, stopMs: 150, lineMs: 14 } as const

export function glyphFor(ch: string, m: FieldhandMetrics = METRICS): Glyph {
  return m.glyphs[ch] ?? m.glyphs['?']
}

export function isSupported(ch: string, m: FieldhandMetrics = METRICS): boolean {
  return ch in m.glyphs
}

/** Characters in `text` the font can't draw (they would show as "?"). Line breaks are fine. */
export function unsupportedChars(text: string, m: FieldhandMetrics = METRICS): string[] {
  return [...new Set([...text].filter((c) => c !== '\n' && !isSupported(c, m)))]
}

export function measure(s: string, m: FieldhandMetrics = METRICS): number {
  let w = 0
  for (const c of s) w += glyphFor(c, m).advance
  return w
}

/** Wrap whole words to the speech body, break only words longer than a line, and split into pages of four lines. */
export function layoutPages(text: string, m: FieldhandMetrics = METRICS, maxWidth = MAX_LINE, perPage = LINES_PER_PAGE): string[][] {
  const lines = ['']
  let cur = 0
  const next = () => {
    lines.push('')
    cur = 0
  }
  const space = measure(' ', m)
  for (const part of text.replace(/\r\n?/g, '\n').match(/\n|[^\s]+/gu) ?? []) {
    if (part === '\n') {
      next()
      continue
    }
    if (cur && cur + space + measure(part, m) > maxWidth) next()
    else if (cur) {
      lines[lines.length - 1] += ' '
      cur += space
    }
    for (const ch of part) {
      const w = glyphFor(ch, m).advance
      if (cur && cur + w > maxWidth) next()
      lines[lines.length - 1] += ch
      cur += w
    }
  }
  const pages: string[][] = []
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage))
  return pages
}

export interface Letter {
  ch: string
  /** Resting position (top-left of the glyph cell before the tile origin offset). */
  x: number
  y: number
  /** When the letter starts to fall, ms from the start of the page. */
  t: number
}

/** When each letter of a page starts to fall. Spaces take no letter but still take a little time. */
export function scheduleLetters(page: readonly string[], m: FieldhandMetrics = METRICS): Letter[] {
  const out: Letter[] = []
  let t = 0
  page.forEach((line, li) => {
    let x = BODY.x + TEXT_LEFT
    for (const ch of line) {
      if (ch !== ' ') out.push({ ch, x, y: BODY.y + TEXT_TOP + li * LINE_STEP, t })
      x += glyphFor(ch, m).advance
      t += ch === ' ' ? MOTION.spaceMs : m.letterMs
      if (ch === ',') t += MOTION.commaMs
      else if ('.!?…'.includes(ch)) t += MOTION.stopMs
    }
    t += MOTION.lineMs
  })
  return out
}

/** How long a whole page takes, from the first letter falling to the last one stamping upright. */
export function pageDuration(letters: readonly Letter[], m: FieldhandMetrics = METRICS): number {
  return letters.length ? letters[letters.length - 1].t + MOTION.fallMs + m.landingMs : 0
}

export type LetterPhase = { state: 'waiting' } | { state: 'falling'; dy: number } | { state: 'landed' } | { state: 'locked' }

/** Where a letter is `now` ms into the page. `dy` is how far above its landing spot it still is (whole pixels). */
export function letterPhase(l: Letter, now: number, m: FieldhandMetrics = METRICS): LetterPhase {
  const since = now - l.t
  if (since < 0) return { state: 'waiting' }
  if (since < MOTION.fallMs) {
    const p = since / MOTION.fallMs
    return { state: 'falling', dy: Math.round(MOTION.fallPx * (1 - p * p)) }
  }
  if (since < MOTION.fallMs + m.landingMs) return { state: 'landed' }
  return { state: 'locked' }
}

/** Replace {tokens} with live facts. Returns null if any token has no value, so the caller can use the fallback line. */
export function fillTokens(text: string, facts: Readonly<Record<string, string | number | null | undefined>>): string | null {
  let missing = false
  const out = text.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = facts[k]
    if (v === null || v === undefined || v === '') {
      missing = true
      return ''
    }
    return String(v)
  })
  return missing ? null : out
}

/** The line with live values filled in, or its fallback when a value is missing (never shows a raw {token}). */
export function resolveText(text: string, fallback: string | undefined, facts: Readonly<Record<string, string | number | null | undefined>>): string {
  return fillTokens(text, facts) ?? fallback ?? text.replace(/\s*\{\w+\}\s*/g, ' ').trim()
}
