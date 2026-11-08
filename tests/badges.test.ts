import { describe, expect, it } from 'vitest'
import { STARTER_DEX } from '../src/data/catalogue'
import type { Encounter } from '../src/data/personal-schema'
import { badgeKeys, earnedBadges, newBadges, wardenBadge, type WardenLike } from '../src/domain/badges'

let n = 0
function enc(over: Partial<Encounter> = {}): Encounter {
  n += 1
  return {
    id: `enc${String(n).padStart(6, '0')}`, speciesId: 'european-robin', date: '2026-05-01', place: 'Reedbed', mode: 'seen', notes: '', photo: null,
    createdAt: `2026-11-08T10:00:${String(n % 60).padStart(2, '0')}.000Z`, siteId: 'L100001', ...over,
  }
}
const warden: WardenLike = {
  id: 'maud', siteId: 'L100001',
  signature: ['mute-swan', 'gadwall', 'eurasian-teal', 'common-snipe', 'water-rail', 'eurasian-bittern', 'little-grebe', 'eurasian-coot'].filter((id) => STARTER_DEX.some((s) => s.id === id)),
  boss: 'eurasian-bittern',
}
const at = (ids: string[], over: Partial<Encounter> = {}) => ids.map((speciesId) => enc({ speciesId, ...over }))

describe('warden badges (D3)', () => {
  it('the test warden is built from real Dex ids', () => {
    expect(warden.signature.length).toBeGreaterThanOrEqual(6)
    expect(warden.signature).toContain(warden.boss)
  })

  it('no badge until five signature birds including the boss are logged at the site', () => {
    const four = at(warden.signature.slice(0, 4))
    expect(wardenBadge(warden, four).tier).toBe('none')
    // five birds but no boss
    const noBoss = at(warden.signature.filter((id) => id !== warden.boss).slice(0, 5))
    const r = wardenBadge(warden, noBoss)
    expect(r.tier).toBe('none')
    expect(r.bossLogged).toBe(false)
  })

  it('bronze at five including the boss', () => {
    const list = at([warden.boss, ...warden.signature.filter((id) => id !== warden.boss).slice(0, 4)])
    const r = wardenBadge(warden, list)
    expect(r.tier).toBe('bronze')
    expect(r.logged).toHaveLength(5)
    expect(r.needed).toBe(5)
    expect(r.total).toBe(warden.signature.length)
  })

  it('birds logged across several visits add up', () => {
    const list = [
      ...at([warden.boss, warden.signature[0]], { date: '2025-01-01' }),
      ...at(warden.signature.slice(1, 4), { date: '2026-02-02' }),
    ]
    expect(wardenBadge(warden, list).tier).toBe('bronze')
  })

  it('sightings at a different site do not count', () => {
    expect(wardenBadge(warden, at(warden.signature, { siteId: 'L100002' })).tier).toBe('none')
    expect(wardenBadge(warden, at(warden.signature, { siteId: null, place: 'Reedbed' })).tier).toBe('none')
  })

  it('silver when every signature bird is logged there', () => {
    expect(wardenBadge(warden, at(warden.signature)).tier).toBe('silver')
  })

  it('gold needs silver and a duel win', () => {
    const all = at(warden.signature)
    expect(wardenBadge(warden, all, { maud: '2026-11-08' }).tier).toBe('gold')
    expect(wardenBadge(warden, all, {}).tier).toBe('silver')
    // a win without the birds is not enough
    expect(wardenBadge(warden, at(warden.signature.slice(0, 5)), { maud: '2026-11-08' }).tier).toBe('none')
    const bronzeOnly = at([warden.boss, ...warden.signature.filter((id) => id !== warden.boss).slice(0, 4)])
    expect(wardenBadge(warden, bronzeOnly, { maud: '2026-11-08' }).tier).toBe('bronze')
  })

  it('a short signature list needs only as many birds as it has', () => {
    const tiny: WardenLike = { id: 't', siteId: 'L100001', signature: ['mute-swan', 'gadwall', 'eurasian-teal'], boss: 'gadwall' }
    expect(wardenBadge(tiny, at(['gadwall', 'mute-swan', 'eurasian-teal'])).tier).toBe('silver')
    expect(wardenBadge(tiny, at(['gadwall', 'mute-swan'])).tier).toBe('none')
  })
})

describe('badges overall (D3)', () => {
  const input = (encounters: Encounter[], extra = {}) => ({ encounters, wardens: [warden], year: 2026, ...extra })

  it('sample history never earns anything', () => {
    const r = earnedBadges(input(at(warden.signature, { source: 'sample' })))
    expect(r.wardens[0].tier).toBe('none')
    expect(r.wardens[0].logged).toEqual([])
    expect(r.year.species).toBe(0)
  })

  it('the demo collection never earns anything', () => {
    const r = earnedBadges(input(at(warden.signature), { demoCollection: true }))
    expect(r.wardens[0].tier).toBe('none')
    expect(r.sets.every((s) => !s.earned && s.have === 0)).toBe(true)
    expect(badgeKeys(r).size).toBe(0)
  })

  it('a set badge needs every Starter Dex bird in the set', () => {
    const raptors = STARTER_DEX.filter((s) => s.sets.includes('raptors')).map((s) => s.id)
    const all = earnedBadges(input(at(raptors, { siteId: null })))
    expect(all.sets.find((s) => s.set === 'raptors')).toMatchObject({ earned: true, have: raptors.length, total: raptors.length })
    const missing = earnedBadges(input(at(raptors.slice(1), { siteId: null })))
    expect(missing.sets.find((s) => s.set === 'raptors')).toMatchObject({ earned: false, have: raptors.length - 1 })
  })

  it('birds outside the Starter Dex do not count toward sets', () => {
    const r = earnedBadges(input(at(['x-some-bird'])))
    expect(r.sets.every((s) => s.have === 0)).toBe(true)
  })

  it('year badges at 50, 100 and 150 species this calendar year', () => {
    const many = (count: number, date = '2026-06-01') => Array.from({ length: count }, (_, i) => enc({ speciesId: `x-bird-${i}`, date, siteId: null }))
    const earned = (c: number) => earnedBadges(input(many(c))).year.badges.filter((b) => b.earned).map((b) => b.threshold)
    expect(earned(49)).toEqual([])
    expect(earned(50)).toEqual([50])
    expect(earned(100)).toEqual([50, 100])
    expect(earned(150)).toEqual([50, 100, 150])
  })

  it('year counts distinct species in that year only, ignoring other years and undated sightings', () => {
    const r = earnedBadges(input([
      ...Array.from({ length: 60 }, (_, i) => enc({ speciesId: `x-bird-${i}`, date: '2025-06-01' })),
      ...Array.from({ length: 10 }, (_, i) => enc({ speciesId: `x-bird-${i}`, date: '2026-06-01' })),
      ...Array.from({ length: 10 }, (_, i) => enc({ speciesId: `x-bird-${i}`, date: '2026-07-01' })),
      enc({ speciesId: 'x-undated', date: null }),
    ]))
    expect(r.year.species).toBe(10)
    expect(r.year.badges.every((b) => !b.earned)).toBe(true)
  })

  it('lists newly earned badges when something changes', () => {
    const before = earnedBadges(input(at(warden.signature.slice(0, 2))))
    const after = earnedBadges(input(at(warden.signature)))
    expect(newBadges(before, after)).toEqual(['warden:maud:bronze', 'warden:maud:silver'])
    expect(newBadges(after, after)).toEqual([])
  })

  it('gold keys include the lower tiers', () => {
    const r = earnedBadges(input(at(warden.signature), { duelWins: { maud: '2026-11-08' } }))
    expect([...badgeKeys(r)].filter((k) => k.startsWith('warden:'))).toEqual(['warden:maud:bronze', 'warden:maud:silver', 'warden:maud:gold'])
  })
})
