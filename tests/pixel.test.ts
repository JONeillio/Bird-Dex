import { describe, expect, it } from 'vitest'
import { hexToRgb, silhouettePixels, spritePixels } from '../src/art/pixel'
import { ICON_GRIDS } from '../src/art/icons'

describe('spritePixels', () => {
  it('reports dimensions and keeps "." transparent', () => {
    const px = spritePixels(['a.', '.a'], { a: '#ff0000' })
    expect(px.width).toBe(2)
    expect(px.height).toBe(2)
    expect(Array.from(px.data.slice(0, 4))).toEqual([255, 0, 0, 255])
    expect(px.data[7]).toBe(0) // (1,0) transparent
    expect(Array.from(px.data.slice(12, 16))).toEqual([255, 0, 0, 255])
  })

  it('throws on an unknown palette key', () => {
    expect(() => spritePixels(['z'], { a: '#000000' })).toThrow(/Unknown palette key/)
  })

  it('throws on ragged rows and empty grids', () => {
    expect(() => spritePixels(['aa', 'a'], { a: '#000000' })).toThrow(/Row 1/)
    expect(() => spritePixels([], {})).toThrow()
  })

  it('rejects bad colours', () => {
    expect(() => hexToRgb('red')).toThrow()
    expect(hexToRgb('#213B32')).toEqual([0x21, 0x3b, 0x32])
  })
})

describe('silhouettePixels', () => {
  it('recolours opaque pixels only', () => {
    const sil = silhouettePixels(spritePixels(['a.'], { a: '#ff0000' }), '#8e938a')
    expect(Array.from(sil.data.slice(0, 4))).toEqual([0x8e, 0x93, 0x8a, 255])
    expect(sil.data[7]).toBe(0)
  })
})

describe('icon grids', () => {
  for (const [name, grid] of Object.entries(ICON_GRIDS)) {
    it(`${name} is a valid 16x16 sprite`, () => {
      const px = spritePixels(grid, { k: '#000000', g: '#00ff00' })
      expect(px.width).toBe(16)
      expect(px.height).toBe(16)
      expect(px.data.some((v, i) => i % 4 === 3 && v === 255)).toBe(true)
    })
  }
})
