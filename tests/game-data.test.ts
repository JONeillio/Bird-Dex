// Guards the curated game data (traits and duel cards) until the duel engine (AUTOPILOT.md E1) gives them zod schemas.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const dex = JSON.parse(readFileSync('src/data/catalogue/starter-dex.v1.json', 'utf8')) as { species: { id: string }[] }
const traits = JSON.parse(readFileSync('src/data/catalogue/traits.v1.json', 'utf8')) as { traits: Record<string, Record<string, unknown>> }
const cards = JSON.parse(readFileSync('src/data/catalogue/duel-cards.v1.json', 'utf8')) as { cards: { id: string; sets: string[]; rules: Record<string, unknown>[]; months: number[] | null; band: string | null }[] }

const VALUES: Record<string, readonly unknown[]> = {
  size: ['tiny', 'small', 'medium', 'large', 'huge'],
  diet: ['seeds', 'insects', 'inverts', 'fish', 'plants', 'prey', 'omnivore'],
  status: ['resident', 'winter', 'summer'],
  active: ['diurnal', 'crepuscular', 'nocturnal'],
  songster: [true, false],
}
const SETS = ['garden', 'woodland', 'wetland', 'coast', 'raptors', 'farmland-upland']

describe('curated game data', () => {
  it('has traits for exactly the Starter Dex, with known values', () => {
    expect(Object.keys(traits.traits).sort()).toEqual(dex.species.map((s) => s.id).sort())
    for (const t of Object.values(traits.traits)) for (const [k, v] of Object.entries(t)) expect(VALUES[k]).toContain(v)
  })
  it('has duel cards whose rules test real traits and values', () => {
    expect(new Set(cards.cards.map((c) => c.id)).size).toBe(cards.cards.length)
    for (const c of cards.cards) {
      c.sets.forEach((s) => expect(SETS).toContain(s))
      expect(c.rules.length).toBeLessThanOrEqual(2)
      for (const r of c.rules)
        for (const [k, v] of Object.entries(r)) {
          const allowed = VALUES[k]
          expect(allowed).toBeDefined()
          ;(Array.isArray(v) ? v : [v]).forEach((x) => expect(allowed).toContain(x))
        }
      c.months?.forEach((m) => expect(m >= 1 && m <= 12).toBe(true))
      if (c.band) expect(['dawn', 'day', 'dusk', 'night']).toContain(c.band)
    }
  })
  it('every month has at least five playable cards, so a duel can always draw five', () => {
    for (let m = 1; m <= 12; m++) expect(cards.cards.filter((c) => !c.months || c.months.includes(m)).length).toBeGreaterThanOrEqual(5)
  })
})

// The typed loaders (src/data/game.ts) parse the same files and fail loudly if they are invalid.
import { CARDS_VERSION, DUEL_CARDS, TRAIT_KEYS, TRAITS_VERSION, cardForId, ruleKey, traitsById } from '../src/data/game'
import { STARTER_DEX } from '../src/data/catalogue'

describe('game data loaders (A3)', () => {
  it('loads traits for every Starter Dex bird and nothing else', () => {
    for (const s of STARTER_DEX) expect(traitsById(s.id), s.id).toBeDefined()
    expect(traitsById('x-regulus-ignicapilla')).toBeUndefined()
    expect(traitsById('european-robin')).toMatchObject({ size: 'small', diet: 'insects', songster: true })
    expect(TRAITS_VERSION).toBe('traits-v1')
  })
  it('loads the 12 duel cards in file order', () => {
    expect(DUEL_CARDS).toHaveLength(12)
    expect(CARDS_VERSION).toBe('duel-cards-v1')
    expect(cardForId('dawn-chorus')?.band).toBe('dawn')
    expect(cardForId('nope')).toBeUndefined()
  })
  it('every card rule key is a trait key', () => {
    for (const c of DUEL_CARDS) for (const r of c.rules) expect(TRAIT_KEYS, `${c.id}: ${ruleKey(r)}`).toContain(ruleKey(r))
  })
  it('the fog card counts heard birds as home ground; no other card does', () => {
    expect(DUEL_CARDS.filter((c) => c.affinity === 'heard').map((c) => c.id)).toEqual(['fog'])
  })
})
