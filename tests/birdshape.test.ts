import { describe, expect, it } from 'vitest'
import { GRID, renderBirdGrid } from '../src/art/birds/shape'
import { placeholderPixels, resolvePalette } from '../src/art/birds/placeholder'
import { STARTER_DEX } from '../src/data/catalogue'
import { TEMPLATES } from '../src/data/schema'

describe('placeholder bird shapes', () => {
  it.each(TEMPLATES)('%s renders a 32x32 grid with outline, bill and eye room', (t) => {
    const g = renderBirdGrid(t)
    expect(g).toHaveLength(GRID)
    g.forEach((r) => expect(r).toHaveLength(GRID))
    const flat = g.join('')
    for (const ch of ['o', 'b', 'k', 'h']) expect(flat, `${t} has ${ch}`).toContain(ch)
  })

  it('keeps every Starter Dex bird off the grid border (so outlines are never clipped)', () => {
    for (const s of STARTER_DEX) {
      const g = renderBirdGrid(s.art.template, s.art.tweak)
      expect(g[0].replace(/\./g, ''), s.id).toBe('')
      expect(g[GRID - 1].replace(/\./g, ''), s.id).toBe('')
      for (const row of g) {
        expect(row[0], s.id).toBe('.')
        expect(row[GRID - 1], s.id).toBe('.')
      }
    }
  })

  it('every species renders with a complete palette and a silhouette in one colour', () => {
    for (const s of STARTER_DEX) {
      const px = placeholderPixels(s)
      const sil = placeholderPixels(s, true)
      let opaque = 0
      const colours = new Set<string>()
      for (let i = 0; i < sil.data.length; i += 4) {
        if (sil.data[i + 3]) {
          opaque++
          colours.add(`${sil.data[i]},${sil.data[i + 1]},${sil.data[i + 2]}`)
        }
      }
      expect(opaque, s.id).toBeGreaterThan(80)
      expect(colours.size, s.id).toBe(1)
      expect(px.width).toBe(GRID)
    }
  })

  it('falls back sensibly when a palette is sparse', () => {
    const p = resolvePalette({ back: '#112233' })
    expect(p.h).toBe('#112233')
    expect(p.x).toBe('#112233')
    expect(p.k).toBe('#3a2e28')
  })
})
