import { describe, expect, it } from 'vitest'
import type { Encounter } from '../src/data/personal-schema'
import { bondRun, computeBond, rankIndexFor, rankUps } from '../src/domain/bond'
import { siteKey } from '../src/domain/siteKey'

let n = 0
function enc(over: Partial<Encounter> = {}): Encounter {
  n += 1
  return {
    id: `enc${String(n).padStart(6, '0')}`,
    speciesId: 'european-robin',
    date: '2026-01-10',
    place: 'Chorlton Water Park',
    mode: 'seen',
    notes: '',
    photo: null,
    createdAt: `2026-11-08T10:00:${String(n % 60).padStart(2, '0')}.000Z`,
    ...over,
  }
}
const robin = (b: Bond | undefined) => b!

type Bond = ReturnType<typeof computeBond> extends Map<string, infer B> ? B : never

describe('siteKey', () => {
  it('prefers a real site id, then the lowercased label, then unknown', () => {
    expect(siteKey({ siteId: 'L123', place: 'Anything' })).toBe('L123')
    expect(siteKey({ siteId: null, place: '  Pennington FLASH ' })).toBe('pennington flash')
    expect(siteKey({ siteId: 'LDEMO01', place: '' })).toBe('unknown')
    expect(siteKey({ place: '' })).toBe('unknown')
  })
})

describe('Bond rules (C1)', () => {
  it('first ever sighting is +10 and nothing else, rank Spotted', () => {
    const b = robin(computeBond([enc({ time: '07:30' })]).get('european-robin'))
    expect(b.points).toBe(10)
    expect(b.rank).toBe('Spotted')
    expect(b.nextRankAt).toBe(15)
    expect(b.sightings).toBe(1)
    expect(b.sites).toBe(1)
    expect(b.months).toBe(1)
    expect(b.bands).toBe(1)
  })

  it('a new place adds +5', () => {
    const r = bondRun([enc(), enc({ date: '2026-01-11', place: 'Sale Water Park' })])
    expect(r.bonds.get('european-robin')!.points).toBe(15)
    expect(r.bonds.get('european-robin')!.rank).toBe('Known')
  })

  it('a new month adds +4 (same place, same year)', () => {
    const p = computeBond([enc(), enc({ date: '2026-02-10' })]).get('european-robin')!.points
    expect(p).toBe(14)
  })

  it('a new time band adds +3', () => {
    const p = computeBond([enc({ time: '07:00' }), enc({ date: '2026-01-11', time: '18:00' })]).get('european-robin')!.points
    expect(p).toBe(13)
  })

  it('first heard-only adds +3, and only once', () => {
    const r = bondRun([enc(), enc({ date: '2026-01-11', mode: 'heard' }), enc({ date: '2026-01-12', mode: 'heard' })])
    // 10, then +3 (heard), then +1 (nothing new)
    expect(r.bonds.get('european-robin')!.points).toBe(14)
    expect(r.bonds.get('european-robin')!.heard).toBe(true)
  })

  it('a first sighting that was heard-only uses up the heard bonus', () => {
    const p = computeBond([enc({ mode: 'heard' }), enc({ date: '2026-01-11', mode: 'heard' })]).get('european-robin')!.points
    expect(p).toBe(11)
  })

  it('first of a new calendar year adds +3', () => {
    const p = computeBond([enc({ date: '2025-01-10' }), enc({ date: '2026-01-10' })]).get('european-robin')!.points
    expect(p).toBe(13)
  })

  it('stacks bonuses on one sighting', () => {
    const p = computeBond([
      enc({ date: '2025-01-10', time: '07:00' }),
      enc({ date: '2026-06-10', time: '19:00', place: 'Sale Water Park', mode: 'heard' }),
    ]).get('european-robin')!.points
    // 10 + site 5 + month 4 + band 3 + heard 3 + year 3
    expect(p).toBe(28)
  })

  it('any other sighting is +1', () => {
    const p = computeBond([enc({ date: '2026-01-10' }), enc({ date: '2026-01-11' })]).get('european-robin')!.points
    expect(p).toBe(11)
  })

  it('earns nothing for a second log of the same bird, place and day', () => {
    const r = bondRun([enc(), enc({ time: '15:00' }), enc({ time: '16:00', mode: 'heard' })])
    expect(r.bonds.get('european-robin')!.points).toBe(10)
    expect(r.bonds.get('european-robin')!.sightings).toBe(3)
  })

  it('two places on the same day both count', () => {
    const p = computeBond([enc(), enc({ place: 'Sale Water Park' })]).get('european-robin')!.points
    expect(p).toBe(15)
  })

  it('an unknown place or a missing date or time cannot earn those bonuses', () => {
    const p = computeBond([
      enc({ date: null, place: '', time: null }),
      enc({ date: null, place: '', time: null, id: 'enc-other' }),
    ]).get('european-robin')!
    // same unknown place + no date: second is a repeat key, so 0 more
    expect(p.points).toBe(10)
    expect(p.sites).toBe(0)
    expect(p.firstDate).toBeNull()
  })

  it('processes in date order regardless of input order, with undated sightings last', () => {
    const early = enc({ id: 'enc-early', date: '2025-05-01' })
    const late = enc({ id: 'enc-late', date: '2026-05-01' })
    const undated = enc({ id: 'enc-undated', date: null })
    const r = bondRun([undated, late, early])
    expect(r.awards.get('enc-early')!.points).toBe(10)
    expect(r.awards.get('enc-late')!.points).toBe(3) // same place and month as the first; only the new year counts
    expect(r.awards.get('enc-undated')!.points).toBe(1) // undated goes last and has nothing new
    expect(r.bonds.get('european-robin')!.firstDate).toBe('2025-05-01')
  })

  it('tracks birds separately', () => {
    const m = computeBond([enc(), enc({ speciesId: 'blue-tit' })])
    expect(m.get('european-robin')!.points).toBe(10)
    expect(m.get('blue-tit')!.points).toBe(10)
  })

  it('ranks change at 15, 40, 80 and 150', () => {
    expect([0, 14, 15, 39, 40, 79, 80, 149, 150, 999].map(rankIndexFor)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4])
    const b = robin(computeBond([enc()]).get('european-robin'))
    expect(b.rankIndex).toBe(0)
  })

  it('Old Friend has no next rank', () => {
    const encs: Encounter[] = []
    for (let i = 0; i < 40; i++) encs.push(enc({ date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`, place: `Place ${i}` }))
    const b = computeBond(encs).get('european-robin')!
    expect(b.rankIndex).toBe(4)
    expect(b.nextRankAt).toBeNull()
  })

  it('deleting sightings lowers Bond (pure recompute)', () => {
    const a = enc()
    const b2 = enc({ date: '2026-01-11', place: 'Sale Water Park' })
    expect(computeBond([a, b2]).get('european-robin')!.points).toBe(15)
    expect(computeBond([a]).get('european-robin')!.points).toBe(10)
    expect(computeBond([]).size).toBe(0)
  })

  it('awards record points and the running total per encounter', () => {
    const a = enc({ id: 'enc-a' })
    const b2 = enc({ id: 'enc-b', date: '2026-01-11', place: 'Sale Water Park' })
    const r = bondRun([a, b2])
    expect(r.awards.get('enc-a')).toMatchObject({ points: 10, total: 10, rankIndex: 0 })
    expect(r.awards.get('enc-b')).toMatchObject({ points: 5, total: 15, rankIndex: 1 })
  })
})

describe('rankUps', () => {
  it('lists birds whose rank rose, not new birds', () => {
    const before = computeBond([enc()])
    const after = computeBond([enc({ id: 'x1' }), enc({ id: 'x2', date: '2026-01-11', place: 'Sale Water Park' }), enc({ speciesId: 'blue-tit' })])
    // 'before' encounters differ by id but that doesn't matter: robin 10 -> 15 (Known); blue tit is new
    const ups = rankUps(before, after)
    expect(ups).toEqual([{ speciesId: 'european-robin', from: 'Spotted', to: 'Known' }])
  })
  it('is empty when nothing rose', () => {
    const m = computeBond([enc()])
    expect(rankUps(m, m)).toEqual([])
  })
})

describe('speed', () => {
  it('scores 1,000 synthetic sightings quickly', () => {
    const encs: Encounter[] = []
    for (let i = 0; i < 1000; i++) {
      encs.push(enc({
        speciesId: `bird-${i % 50}`,
        date: `2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
        place: `site ${i % 30}`,
        time: `${String(i % 24).padStart(2, '0')}:00`,
      }))
    }
    const t = performance.now()
    const m = computeBond(encs)
    expect(performance.now() - t).toBeLessThan(200)
    expect(m.size).toBe(50)
  })
})
