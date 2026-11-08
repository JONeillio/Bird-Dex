import { describe, expect, it } from 'vitest'
import type { Encounter } from '../src/data/personal-schema'
import { bondRun, computeBond } from '../src/domain/bond'
import { levelBars } from '../src/domain/levelUps'
import { groupOutings } from '../src/domain/outings'

let n = 0
const enc = (over: Partial<Encounter> = {}): Encounter => {
  n += 1
  return { id: `enc${String(n).padStart(6, '0')}`, speciesId: 'european-robin', date: '2026-10-01', place: 'Test Marsh', mode: 'seen', notes: '', photo: null, createdAt: `2026-11-08T10:00:${String(n % 60).padStart(2, '0')}.000Z`, ...over }
}
const barsFor = (encs: Encounter[], key: string) => {
  const o = groupOutings(encs).find((x) => x.key === key)!
  return levelBars(o, bondRun(encs).awards)
}

describe('levelBars', () => {
  it('a bird seen for the first time starts at 0 and is flagged as new', () => {
    const [b] = barsFor([enc()], '2026-10-01|test marsh')
    expect(b.before).toBe(0)
    expect(b.firstEver).toBe(true)
    expect(b.after).toBe(b.gained)
    expect(b.rankedUp).toBe(false)
    expect(b.from).toBe(0)
  })
  it('each outing starts where the last one ended, and the bar never leaves 0-1', () => {
    const places = ['Marsh A', 'Wood B', 'Pond C', 'Park D', 'Hill E', 'Lake F']
    const encs = places.map((p, i) => enc({ date: `2026-0${i + 1}-1${i}`, place: p, time: `0${5 + i}:30` }))
    let prevAfter = 0
    for (const [i, p] of places.entries()) {
      const [b] = barsFor(encs, `2026-0${i + 1}-1${i}|${p.toLowerCase()}`)
      expect(b.before).toBe(prevAfter)
      expect(b.after).toBe(b.before + b.gained)
      expect(b.from).toBeGreaterThanOrEqual(0)
      expect(b.to).toBeLessThanOrEqual(1)
      expect(b.to).toBeGreaterThanOrEqual(b.from)
      prevAfter = b.after
    }
    expect(prevAfter).toBe(computeBond(encs).get('european-robin')!.points)
  })
  it('flags a rank-up, starting that bar at the bottom of the new rank', () => {
    const places = ['Marsh A', 'Wood B', 'Pond C', 'Park D', 'Hill E', 'Lake F']
    const encs = places.map((p, i) => enc({ date: `2026-0${i + 1}-1${i}`, place: p, time: `0${5 + i}:30` }))
    const ups = places.map((p, i) => barsFor(encs, `2026-0${i + 1}-1${i}|${p.toLowerCase()}`)[0]).filter((b) => b.rankedUp)
    expect(ups.length).toBeGreaterThan(0)
    for (const b of ups) {
      expect(b.from).toBe(0)
      expect(b.rankAfter).not.toBe(b.rankBefore)
    }
  })
  it('leaves out birds that earned nothing, and orders rank-ups, then new birds, then the biggest gain', () => {
    const encs = [
      enc({ speciesId: 'european-robin', date: '2026-09-01' }),
      enc({ speciesId: 'european-robin', date: '2026-10-01' }),
      enc({ speciesId: 'european-robin', date: '2026-10-01' }), // same bird, place and day: earns 0 the second time
      enc({ speciesId: 'wren', date: '2026-10-01' }),
    ]
    const bars = barsFor(encs, '2026-10-01|test marsh')
    expect(bars.map((b) => b.key)).toEqual(['wren', 'european-robin'])
    expect(bars[0].firstEver).toBe(true)
  })
})
