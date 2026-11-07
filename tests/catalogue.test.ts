import { describe, expect, it } from 'vitest'
import { STARTER_DEX, dexById } from '../src/data/catalogue'
import { SETS, StarterDexSchema } from '../src/data/schema'
import raw from '../src/data/catalogue/starter-dex.v1.json'

describe('Starter Dex catalogue', () => {
  it('validates against the schema', () => {
    expect(StarterDexSchema.safeParse(raw).success).toBe(true)
  })
  it('is about 100 species numbered 1..N with no gaps', () => {
    expect(STARTER_DEX.length).toBeGreaterThanOrEqual(95)
    expect(STARTER_DEX.length).toBeLessThanOrEqual(110)
    STARTER_DEX.forEach((s, i) => expect(s.dexNo).toBe(i + 1))
  })
  it('has at least 6 birds in every set', () => {
    for (const set of SETS) {
      expect(STARTER_DEX.filter((s) => s.sets.includes(set)).length, set).toBeGreaterThanOrEqual(6)
    }
  })
  it('includes the three anchor birds under their manifest ids', () => {
    for (const id of ['european-robin', 'common-kingfisher', 'grey-heron']) expect(dexById(id), id).toBeDefined()
  })
  it('rejects a duplicate id', () => {
    const bad = { ...raw, species: [raw.species[0], { ...raw.species[1], id: raw.species[0].id }] }
    expect(StarterDexSchema.safeParse(bad).success).toBe(false)
  })
})
