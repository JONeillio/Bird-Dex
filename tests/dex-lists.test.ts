import { describe, expect, it } from 'vitest'
import type { Encounter } from '../src/data/personal-schema'
import { isFirstOfYear, lifeList, outsideSpecies, yearList } from '../src/domain/dexLists'

let n = 0
function enc(over: Partial<Encounter> = {}): Encounter {
  n += 1
  return {
    id: `enc${String(n).padStart(6, '0')}`, speciesId: 'european-robin', date: '2026-10-05', place: 'Reedbed', mode: 'seen',
    notes: '', photo: null, createdAt: `2026-11-08T10:00:${String(n % 60).padStart(2, '0')}.000Z`, ...over,
  }
}
const outside = (date: string | null, name = 'Firecrest', sci = 'Regulus ignicapilla') =>
  enc({ speciesId: 'x-regulus-ignicapilla', name, sciName: sci, date })

describe('year list (B4)', () => {
  it('keeps only dated sightings inside the year, across the year boundary', () => {
    const list = yearList([enc({ date: '2025-12-31' }), enc({ speciesId: 'eurasian-blue-tit', date: '2026-01-01' }), enc({ speciesId: 'eurasian-wren', date: null })], 2026)
    expect(list.map((e) => e.id)).toEqual(['eurasian-blue-tit'])
  })
  it('puts the most recently seen first and counts only this year', () => {
    const list = yearList([enc({ date: '2026-02-01' }), enc({ date: '2025-06-01' }), enc({ speciesId: 'eurasian-blue-tit', date: '2026-05-01' })], 2026)
    expect(list.map((e) => e.id)).toEqual(['eurasian-blue-tit', 'european-robin'])
    expect(list[1].sightings).toBe(1)
  })
  it('includes birds outside the Dex with their own name', () => {
    const [e] = yearList([outside('2026-03-03')], 2026)
    expect(e.species).toBeNull()
    expect(e.name).toBe('Firecrest')
  })
})

describe('life list (B4)', () => {
  it('lists Dex birds in Dex order, then outside birds alphabetically, and counts undated sightings', () => {
    const avocet = enc({ speciesId: 'x-recurvirostra-avosetta', name: 'Avocet', sciName: 'Recurvirostra avosetta' })
    const list = lifeList([outside(null, 'Firecrest'), outside('2026-01-01', 'Firecrest'), enc({ speciesId: 'eurasian-blue-tit' }), enc({ speciesId: 'european-robin' }), avocet])
    const ids = list.map((e) => e.id)
    expect(ids.slice(-2)).toEqual(['x-recurvirostra-avosetta', 'x-regulus-ignicapilla'])
    expect(ids.indexOf('eurasian-blue-tit')).toBeLessThan(ids.indexOf('european-robin'))
    expect(list.find((e) => e.id === 'x-regulus-ignicapilla')!.sightings).toBe(2)
  })
  it('is empty with no sightings', () => expect(lifeList([])).toEqual([]))
})

describe('first of the year', () => {
  it('is true for a bird seen in an earlier year and not yet this year', () => {
    expect(isFirstOfYear([enc({ date: '2025-05-05' }), enc({ date: '2026-02-02' })], 'european-robin', '2026-02-02')).toBe(true)
  })
  it('is false for a lifer, or once it was already seen this year', () => {
    expect(isFirstOfYear([enc({ date: '2026-02-02' })], 'european-robin', '2026-02-02')).toBe(false)
    expect(isFirstOfYear([enc({ date: '2025-05-05' }), enc({ date: '2026-01-02' }), enc({ date: '2026-02-02' })], 'european-robin', '2026-02-02')).toBe(false)
  })
})

describe('outside portrait', () => {
  it('is a songbird stand-in with the bird name', () => {
    expect(outsideSpecies({ id: 'x-a', name: 'Avocet' }).art.template).toBe('songbird')
  })
})
