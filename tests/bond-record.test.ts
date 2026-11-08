// P6: what the profile shows about a bird: months, time bands, places, first place, plain-English notes.
import { describe, expect, it } from 'vitest'
import type { Encounter } from '../src/data/personal-schema'
import { computeBond } from '../src/domain/bond'
import { STARTER_DEX } from '../src/data/catalogue'
import { fieldNotes, missingMonths } from '../src/domain/fieldNotes'

let n = 0
const enc = (over: Partial<Encounter> = {}): Encounter => {
  n += 1
  return { id: `enc${String(n).padStart(6, '0')}`, speciesId: 'european-robin', date: '2026-01-10', place: 'Reedbed', mode: 'seen', notes: '', photo: null, createdAt: `2026-11-08T10:00:${String(n % 60).padStart(2, '0')}.000Z`, ...over }
}
const bondOf = (encs: Encounter[]) => computeBond(encs).get('european-robin')!

describe('Bond record (P6)', () => {
  it('lists months, time bands and places exactly as the Bond rules counted them', () => {
    const b = bondOf([
      enc({ date: '2026-03-02', time: '19:00', siteId: 'L2', place: 'Wood' }), // dusk, March
      enc({ date: '2026-01-10', time: '06:30', siteId: 'L1', place: 'Reedbed' }), // earliest: dawn, January
      enc({ date: '2026-01-20', time: '12:00', siteId: 'L1', place: 'Reedbed' }), // day, January, same place
      enc({ date: '2026-07-04', time: null, place: '' }), // no time, no place: adds a month only
    ])
    expect(b.monthsSeen).toEqual([1, 3, 7])
    expect(b.bandsSeen).toEqual(['dawn', 'day', 'dusk']) // always in the order of the day
    expect(b.sitesSeen).toEqual(['L1', 'L2']) // the order you met it there
    expect(b.firstPlace).toBe('Reedbed')
    expect(b.months).toBe(b.monthsSeen.length)
    expect(b.bands).toBe(b.bandsSeen.length)
    expect(b.sites).toBe(b.sitesSeen.length)
  })

  it('the first place is the earliest dated sighting; none when it had no label or no date', () => {
    expect(bondOf([enc({ date: '2026-05-01', place: 'Later' }), enc({ date: '2026-02-01', place: '  Earlier  ' })]).firstPlace).toBe('Earlier')
    expect(bondOf([enc({ date: '2026-02-01', place: '' })]).firstPlace).toBeNull()
    const undated = bondOf([enc({ date: null, place: 'Notebook' })])
    expect(undated.firstPlace).toBeNull()
    expect(undated.monthsSeen).toEqual([])
    expect(undated.bandsSeen).toEqual([])
  })

  it('an unknown place is never listed as a site', () => {
    expect(bondOf([enc({ place: '' }), enc({ place: '', date: '2026-02-02' })]).sitesSeen).toEqual([])
  })

  it('works out the months never logged', () => {
    expect(missingMonths({ monthsSeen: [1, 3, 7] })).toEqual([2, 4, 5, 6, 8, 9, 10, 11, 12])
    expect(missingMonths({ monthsSeen: [] })).toHaveLength(12)
    expect(missingMonths({ monthsSeen: Array.from({ length: 12 }, (_, i) => i + 1) })).toEqual([])
  })
})

describe('fieldNotes', () => {
  it('gives one plain sentence from the traits', () => {
    expect(fieldNotes('european-robin')).toBe('Small · eats insects · resident all year · sings at dawn')
    expect(fieldNotes('tawny-owl')).toBe('Medium · hunts other animals · resident all year · active at night')
    expect(fieldNotes('mute-swan')).toBe('Huge · eats plants · resident all year · active by day')
    expect(fieldNotes('barn-swallow')).toBe('Small · eats insects · summer visitor · active by day')
  })
  it('every Starter Dex bird has four parts', () => {
    for (const sp of STARTER_DEX) expect(fieldNotes(sp.id).split(' · '), sp.id).toHaveLength(4)
  })
  it('is empty for a bird outside the Starter Dex', () => {
    expect(fieldNotes('x-grus-grus')).toBe('')
    expect(fieldNotes('dodo')).toBe('')
  })
})
