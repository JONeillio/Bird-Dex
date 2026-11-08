import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { STAMPS, TIER_MARKS, tierMarkFor } from '../src/art/marks'
import { RARITY_POINTS, type RarityTier } from '../src/domain/rarity'

const size = (p: string): [number, number] => {
  const b = readFileSync(p)
  return [b.readUInt32BE(16), b.readUInt32BE(20)]
}
const local = (src: string) => 'public/' + src.replace(/^.*?assets\//, 'assets/')

describe('Set A stamps and tier marks', () => {
  it('every mark file exists at its registered size and has a labelled original', () => {
    for (const m of [...Object.values(STAMPS), ...Object.values(TIER_MARKS)]) {
      const p = local(m.src)
      expect(existsSync(p), p).toBe(true)
      expect(size(p), p).toEqual([m.w, m.h])
      expect(existsSync('research/art-drafts/game-art/set-a-stamps-tiers/' + p.split('/').pop()), p).toBe(true)
      expect(m.label.length).toBeGreaterThan(0)
    }
  })
  it('every engine rarity tier is handled: a mark, or null for unreported and unknown', () => {
    for (const t of Object.keys(RARITY_POINTS) as RarityTier[]) {
      const m = tierMarkFor(t)
      if (t === 'unreported' || t === 'unknown') expect(m).toBeNull()
      else expect(m?.label.toLowerCase().replace(' ', '-')).toBe(t)
    }
  })
})
