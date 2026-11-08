import { describe, expect, it } from 'vitest'
import { charsShown, firstChars, portraitFor } from '../src/ui/dialogue/typewriter'

describe('typewriter', () => {
  it('shows characters at a steady rate and never more than the text', () => {
    expect(charsShown('Hello there', 0)).toBe(0)
    expect(charsShown('Hello there', -50)).toBe(0)
    expect(charsShown('Hello there', 100, 40)).toBe(4)
    expect(charsShown('Hello there', 1e9)).toBe(11)
  })
  it('counts whole characters, not code units', () => {
    expect(charsShown('a🐦b', 1e9)).toBe(3)
    expect(firstChars('a🐦b', 2)).toBe('a🐦')
    expect(firstChars('abc', -3)).toBe('')
  })
  it('swaps talk and neutral while typing, rests on the line expression, and holds still with reduced motion', () => {
    expect(portraitFor({ text: 'x' }, true, true, false)).toBe('talk')
    expect(portraitFor({ text: 'x' }, true, false, false)).toBe('neutral')
    expect(portraitFor({ text: 'x', expression: 'delight' }, false, true, false)).toBe('delight')
    expect(portraitFor({ text: 'x' }, false, true, false)).toBe('neutral')
    expect(portraitFor({ text: 'x', expression: 'delight' }, true, true, true)).toBe('delight')
  })
})
