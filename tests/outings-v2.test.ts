// P4: checklists, start time, duration and card numbers on outings, and parcels.
import { describe, expect, it } from 'vitest'
import type { Encounter } from '../src/data/personal-schema'
import { groupOutings } from '../src/domain/outings'
import { markOpened, unopened } from '../src/domain/parcels'

let n = 0
const enc = (over: Partial<Encounter> = {}): Encounter => {
  n += 1
  return { id: `enc${String(n).padStart(6, '0')}`, speciesId: 'european-robin', date: '2026-10-01', place: 'Test Marsh', mode: 'seen', notes: '', photo: null, createdAt: '2026-11-08T10:00:00.000Z', ...over }
}
const out = (encs: Encounter[], key: string) => groupOutings(encs).find((o) => o.key === key)!

describe('outings v2', () => {
  it('collects checklist ids, the earliest time, and sums each checklist once', () => {
    const o = out(
      [
        // checklist S1: three birds, 90 minutes, from 07:30
        enc({ checklistId: 'S1', durationMin: 90, time: '07:30' }),
        enc({ checklistId: 'S1', durationMin: 90, time: '07:30', speciesId: 'blue-tit' }),
        enc({ checklistId: 'S1', durationMin: 90, time: '07:30', speciesId: 'great-tit' }),
        // checklist S2 the same morning at the same site: 30 minutes from 06:50
        enc({ checklistId: 'S2', durationMin: 30, time: '06:50', speciesId: 'dunnock' }),
      ],
      '2026-10-01|test marsh',
    )
    expect(o.checklistIds).toEqual(['S2', 'S1']) // the order of the day: 06:50 then 07:30
    expect(o.startTime).toBe('06:50')
    expect(o.durationMin).toBe(120)
  })

  it('has null duration and start time when nothing is known, and ignores a missing time', () => {
    const o = out([enc({ checklistId: 'S1' }), enc({ time: null })], '2026-10-01|test marsh')
    expect(o.durationMin).toBeNull()
    expect(o.startTime).toBeNull()
    expect(o.checklistIds).toEqual(['S1'])
    expect(out([enc({ checklistId: 'S1', durationMin: 0 })], '2026-10-01|test marsh').durationMin).toBe(0)
  })

  it('numbers real outings 1, 2, 3 within each year by date; sample outings are 0 and do not use up numbers', () => {
    const list = [
      enc({ date: '2025-12-30', place: 'A' }),
      enc({ date: '2026-01-02', place: 'A' }),
      enc({ date: '2026-03-01', place: 'B', source: 'sample' }),
      enc({ date: '2026-05-01', place: 'A' }),
      enc({ date: '2026-02-01', place: 'C' }),
    ]
    const by = Object.fromEntries(groupOutings(list).map((o) => [o.key, o.cardNo]))
    expect(by['2025-12-30|a']).toBe(1)
    expect(by['2026-01-02|a']).toBe(1)
    expect(by['2026-02-01|c']).toBe(2)
    expect(by['2026-03-01|b']).toBe(0)
    expect(by['2026-05-01|a']).toBe(3)
  })

  it('a card number does not change when you add a newer outing, but later ones shift if you add an older one', () => {
    const base = [enc({ date: '2026-02-01', place: 'A' }), enc({ date: '2026-04-01', place: 'A' })]
    expect(out(base, '2026-04-01|a').cardNo).toBe(2)
    expect(out([...base, enc({ date: '2026-06-01', place: 'A' })], '2026-04-01|a').cardNo).toBe(2)
    expect(out([...base, enc({ date: '2026-03-01', place: 'A' })], '2026-04-01|a').cardNo).toBe(3)
  })

  it('two checklists at one site on one day stay one outing (one parcel)', () => {
    expect(groupOutings([enc({ checklistId: 'S1' }), enc({ checklistId: 'S2' })])).toHaveLength(1)
  })
})

describe('parcels', () => {
  const first = [enc({ date: '2026-10-01', place: 'A', createdAt: '2026-11-08T09:00:00.000Z' }), enc({ date: '2026-10-05', place: 'B', createdAt: '2026-11-08T09:00:00.000Z' })]

  it('lists outings not yet opened, newest first, and nothing once opened', () => {
    const outings = groupOutings(first)
    expect(unopened(outings, new Set(), null).map((o) => o.key)).toEqual(['2026-10-05|b', '2026-10-01|a'])
    const opened = markOpened(['2026-10-05|b'], new Set())
    expect(unopened(outings, opened, null).map((o) => o.key)).toEqual(['2026-10-01|a'])
    expect(unopened(outings, markOpened(outings.map((o) => o.key), opened), null)).toEqual([])
  })

  it('markOpened keeps what was open and adds nothing twice', () => {
    const a = markOpened(['x', 'y'], new Set(['x', 'z']))
    expect([...a].sort()).toEqual(['x', 'y', 'z'])
    expect(markOpened(['x'], a).size).toBe(3)
  })

  it('after a re-import only the outings with new sightings appear', () => {
    const all = [...first, enc({ date: '2026-10-05', place: 'B', speciesId: 'blue-tit', createdAt: '2026-11-09T09:00:00.000Z' }), enc({ date: '2026-11-01', place: 'C', createdAt: '2026-11-09T09:00:00.000Z' })]
    const outings = groupOutings(all)
    const opened = new Set(outings.map((o) => o.key)) // everything from the first import was opened
    opened.delete('2026-11-01|c') // the brand new outing was never opened
    // The older outing B got a new sighting too, but it was already opened: it stays closed.
    expect(unopened(outings, opened, '2026-11-08T23:00:00.000Z').map((o) => o.key)).toEqual(['2026-11-01|c'])
    // If B's report had not been opened, the new sighting would bring it back.
    const none = new Set(['2026-10-01|a'])
    expect(unopened(outings, none, '2026-11-08T23:00:00.000Z').map((o) => o.key)).toEqual(['2026-11-01|c', '2026-10-05|b'])
  })
})
