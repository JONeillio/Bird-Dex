import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DIALOGUE_KIT, frameOffset, nineSliceCss } from '../src/art/dialogueKit'
import { KEEPSAKES, keepsakeFor } from '../src/art/keepsakes'
import { NPCS } from '../src/art/npcs'

const dims = (p: string): [number, number] => {
  const b = readFileSync(p)
  return [b.readUInt32BE(16), b.readUInt32BE(20)]
}
const local = (src: string) => 'public/' + src.replace(/^.*?assets\//, 'assets/')

describe('Set D keepsake icons', () => {
  it('has one 32x32 icon per NPC, each with its original', () => {
    expect(KEEPSAKES.map((x) => x.npcId).sort()).toEqual(NPCS.map((n) => n.id).sort())
    for (const kp of KEEPSAKES) {
      expect(dims(local(kp.src)), kp.id).toEqual([32, 32])
      expect(existsSync(`research/art-drafts/game-art/set-d-keepsake-icons/keepsake_${kp.id}.png`)).toBe(true)
    }
    expect(keepsakeFor('val')?.id).toBe('duty_card')
    expect(keepsakeFor('nobody')).toBeUndefined()
  })
})

describe('Set E dialogue kit', () => {
  it('every piece exists at its registered size, with originals', () => {
    for (const [name, p] of Object.entries(DIALOGUE_KIT)) {
      expect(dims(local(p.src)), name).toEqual([p.w, p.h])
      expect(existsSync('research/art-drafts/game-art/set-e-dialogue-kit/' + local(p.src).split('/').pop())).toBe(true)
      if (p.slice) {
        expect(p.slice.l + p.slice.r, name).toBeLessThan(p.w)
        expect(p.slice.t + p.slice.b, name).toBeLessThan(p.h)
      }
      if (p.frames) expect(p.frames.count * p.frames.w, name).toBe(p.w)
    }
  })
  it('builds nine-slice CSS at an integer scale and keeps text inside the inset', () => {
    const css = nineSliceCss(DIALOGUE_KIT.dialogueBox, 2)
    expect(css.borderImageSlice).toBe('10 10 17 34 fill')
    expect(css.borderWidth).toBe('20px 20px 34px 68px')
    expect(css.imageRendering).toBe('pixelated')
    expect(css.padding).toBe('4px 4px 2px 0px')
    expect(nineSliceCss(DIALOGUE_KIT.choiceButton, 3).borderWidth).toBe('21px 24px 21px 24px')
    expect(() => nineSliceCss(DIALOGUE_KIT.sheetHandle)).toThrow()
  })
  it('steps animated frames in whole pixels and wraps', () => {
    expect(frameOffset(DIALOGUE_KIT.next, 1, 2)).toBe('-32px 0')
    expect(frameOffset(DIALOGUE_KIT.thinking, 2, 3)).toBe('-0px 0')
    expect(() => frameOffset(DIALOGUE_KIT.nameplate, 0)).toThrow()
  })
})
