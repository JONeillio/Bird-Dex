// Pure helpers for text that types itself out (U0). Kept apart from React so they can be tested.

/** Characters shown per second while a line types. */
export const TYPE_CPS = 40

/** How many characters of `text` to show after `elapsedMs`. Never more than the text, never negative. */
export function charsShown(text: string, elapsedMs: number, cps = TYPE_CPS): number {
  if (elapsedMs <= 0) return 0
  return Math.min([...text].length, Math.floor((elapsedMs / 1000) * cps))
}

/** The first `n` characters (whole characters, so an emoji or accented letter is never cut in half). */
export function firstChars(text: string, n: number): string {
  return [...text].slice(0, Math.max(0, n)).join('')
}

export type TalkExpression = 'neutral' | 'delight'

export interface DialogueLine {
  text: string
  /** The face to rest on once the line has finished typing. While it types the portrait swaps `talk` and `neutral`. */
  expression?: TalkExpression
}

/**
 * Which portrait to show: `talk` or `neutral` alternating while typing (`mouthOpen` flips every 150 ms), the line's own
 * expression when it has finished. Reduced motion never swaps: it always shows the resting face.
 */
export function portraitFor(line: DialogueLine, typing: boolean, mouthOpen: boolean, reducedMotion: boolean): 'neutral' | 'talk' | 'delight' {
  const rest = line.expression ?? 'neutral'
  if (reducedMotion || !typing) return rest
  return mouthOpen ? 'talk' : 'neutral'
}
