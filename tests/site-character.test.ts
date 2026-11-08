import { describe, expect, it } from 'vitest'
import { STARTER_DEX } from '../src/data/catalogue'
import type { Report } from '../src/data/published-schema'
import type { SetId } from '../src/data/schema'
import { siteCharacter } from '../src/domain/siteCharacter'

const rep = (speciesId: string | null, over: Partial<Report> = {}): Report => ({
  speciesId, ebirdCode: 'x', name: speciesId ?? 'other', sciName: 'Fakeus fakeus', obsDate: '2026-11-06', obsTime: null, count: null, checklistUrl: null, reviewed: false, ...over,
})
const site = (ids: (string | null)[]) => ({ reports: ids.map((i) => rep(i)) })
/** The first n Starter Dex birds that belong to exactly one set. */
const only = (set: SetId, n: number): string[] => {
  const ids = STARTER_DEX.filter((s) => s.sets.length === 1 && s.sets[0] === set).map((s) => s.id)
  expect(ids.length).toBeGreaterThanOrEqual(n)
  return ids.slice(0, n)
}

describe('siteCharacter (D1)', () => {
  it('a site of wetland birds is wetland', () => {
    expect(siteCharacter(site(only('wetland', 6)))).toEqual(['wetland'])
  })

  it('keeps the two biggest sets, biggest first', () => {
    expect(siteCharacter(site([...only('wetland', 5), ...only('garden', 3)]))).toEqual(['wetland', 'garden'])
  })

  it('ties go in the fixed set order (garden before wetland)', () => {
    expect(siteCharacter(site([...only('wetland', 4), ...only('garden', 4)]))).toEqual(['garden', 'wetland'])
  })

  it('never more than two, even when three sets qualify', () => {
    const r = siteCharacter(site([...only('wetland', 4), ...only('garden', 3), ...only('woodland', 3)]))
    expect(r).toEqual(['wetland', 'garden'])
    expect(r).toHaveLength(2)
  })

  it('a set needs at least 25% of the site\'s Dex birds', () => {
    // 1 of 4 = 25%: kept. 1 of 5 = 20%: dropped.
    expect(siteCharacter(site([...only('garden', 3), ...only('woodland', 1)]))).toEqual(['garden', 'woodland'])
    expect(siteCharacter(site([...only('garden', 4), ...only('woodland', 1)]))).toEqual(['garden'])
  })

  it('a bird counts in every set it belongs to', () => {
    // Shelduck is coast and wetland, so both reach 100%
    expect(siteCharacter(site(['common-shelduck']))).toEqual(['wetland', 'coast'])
  })

  it('falls back to garden when there is nothing to go on', () => {
    expect(siteCharacter(site([]))).toEqual(['garden'])
    expect(siteCharacter(site([null, null]))).toEqual(['garden']) // outside the Dex
    expect(siteCharacter(site(['not-a-dex-bird']))).toEqual(['garden'])
  })

  it('ignores birds outside the Dex when working out the shares', () => {
    expect(siteCharacter(site([...only('wetland', 3), null, null, null, null, null]))).toEqual(['wetland'])
  })

  it('a species reported twice counts once', () => {
    const [a] = only('wetland', 1)
    const [b, c, d] = only('garden', 3)
    // wetland: a twice but one species; garden 3 species. shares: wetland 1/4, garden 3/4
    expect(siteCharacter(site([a, a, b, c, d]))).toEqual(['garden', 'wetland'])
  })
})
