import { beforeEach, describe, expect, it } from 'vitest'
import { EncounterSchema, type Encounter } from '../src/data/personal-schema'
import { deriveRecords, recordedIds, setProgress, todayIso } from '../src/domain/collection'
import { buildBackup, parseBackup, planRestore } from '../src/domain/backup'
import { backupDue, formatDate, sortEncounters } from '../src/domain/journal'
import { bearingDeg, compassWord, distanceKm, distanceLabel, turnNeeded } from '../src/domain/geo'
import { memoryStorage } from '../src/data/personal/storage'
import { useRecords } from '../src/state/records'
import { SOUNDS, soundLength } from '../src/audio/sfx'
import { shakeStrength, SHAKE_THRESHOLD } from '../src/phone/shake'
import { tiltFromOrientation } from '../src/phone/tilt'
import { headingFromEvent, smooth } from '../src/phone/compass'
import { fitSize } from '../src/phone/photo'
import { STARTER_DEX } from '../src/data/catalogue'
import { DEMO_RECORDED_IDS } from '../src/data/demo'

const enc = (id: string, speciesId: string, date: string | null, extra: Partial<Encounter> = {}): Encounter => ({
  id: id.padEnd(8, 'x'), speciesId, date, place: '', mode: 'seen', notes: '', photo: null, createdAt: '2026-11-07T10:00:00.000Z', ...extra,
})

describe('collection from encounters', () => {
  it('derives counts and first/last dates', () => {
    const m = deriveRecords([enc('a', 'robin', '2026-03-01'), enc('b', 'robin', '2026-01-05'), enc('c', 'wren', null)])
    expect(m.get('robin')).toEqual({ count: 2, firstDate: '2026-01-05', lastDate: '2026-03-01' })
    expect(m.get('wren')).toEqual({ count: 1, firstDate: null, lastDate: null })
  })
  it('real records drive recorded; demo is separate and never mixes in', () => {
    const e = [enc('a', 'robin', null)]
    expect([...recordedIds({ demoCollection: false }, e)]).toEqual(['robin'])
    expect(recordedIds({ demoCollection: true }, e)).toEqual(new Set(DEMO_RECORDED_IDS))
    expect(recordedIds({ demoCollection: false }).size).toBe(0)
  })
  it('set progress counts only recorded members', () => {
    const p = setProgress(STARTER_DEX, new Set([STARTER_DEX[0].id]))
    expect(Object.values(p).reduce((n, s) => n + s.done, 0)).toBe(STARTER_DEX[0].sets.length)
  })
  it('todayIso is YYYY-MM-DD in local time', () => {
    expect(todayIso(new Date(2026, 10, 7, 23, 59))).toBe('2026-11-07')
  })
})

describe('encounter schema', () => {
  it('accepts a good entry and rejects bad ones', () => {
    expect(EncounterSchema.safeParse(enc('abcdefgh', 'european-robin', '2026-11-07')).success).toBe(true)
    expect(EncounterSchema.safeParse(enc('abcdefgh', 'Robin!', '2026-11-07')).success).toBe(false)
    expect(EncounterSchema.safeParse(enc('abcdefgh', 'wren', '07/11/2026')).success).toBe(false)
    expect(EncounterSchema.safeParse(enc('abcdefgh', 'wren', null, { photo: 'http://x/y.png' })).success).toBe(false)
    expect(EncounterSchema.safeParse(enc('abcdefgh', 'wren', null, { notes: 'x'.repeat(501) })).success).toBe(false)
  })
})

describe('backup and restore', () => {
  const known = new Set(['robin', 'wren'])
  const mine = [enc('mine0001', 'robin', '2026-01-01')]
  it('round-trips through JSON', () => {
    const b = buildBackup(mine, ['wren'], new Date('2026-11-07T12:00:00Z'))
    const r = parseBackup(JSON.stringify(b))
    expect(r.ok && r.backup.encounters).toEqual(mine)
  })
  it('rejects junk with a friendly message', () => {
    for (const t of ['not json', '{}', JSON.stringify({ app: 'other', schema: 1 })]) {
      const r = parseBackup(t)
      expect(r.ok).toBe(false)
    }
  })
  it('merges without duplicating or removing, skipping unknown birds', () => {
    const b = buildBackup([mine[0], enc('new00001', 'wren', null), enc('odd00001', 'dodo', null)], ['wren', 'dodo'])
    const plan = planRestore(mine, ['robin'], b, known)
    expect(plan).toMatchObject({ added: 1, duplicates: 1, unknown: 1, addedTargets: ['wren'] })
    expect(plan.merged.map((e) => e.id)).toEqual(['mine0001', 'new00001'])
    expect(planRestore(plan.merged, ['wren'], b, known).added).toBe(0)
  })
})

describe('journal helpers', () => {
  it('sorts newest first with undated last', () => {
    const s = sortEncounters([enc('a', 'x', null), enc('b', 'x', '2026-01-01'), enc('c', 'x', '2026-06-01')])
    expect(s.map((e) => e.id[0])).toEqual(['c', 'b', 'a'])
  })
  it('formats dates in UK style', () => {
    expect(formatDate('2026-11-07')).toBe('7 Nov 2026')
    expect(formatDate(null)).toBe('Date not recorded')
  })
  it('backup reminder: none when empty, due when never backed up or over 30 days', () => {
    const now = Date.parse('2026-11-07T00:00:00Z')
    expect(backupDue(0, null, now)).toBe(false)
    expect(backupDue(3, null, now)).toBe(true)
    expect(backupDue(3, '2026-11-01T00:00:00Z', now)).toBe(false)
    expect(backupDue(3, '2026-09-01T00:00:00Z', now)).toBe(true)
  })
})

describe('records store', () => {
  beforeEach(async () => {
    useRecords.setState({ encounters: [], status: 'loading', warning: null })
    await useRecords.getState().load(memoryStorage())
  })
  it('adds, updates and removes, and survives a reload from storage', async () => {
    const s = memoryStorage()
    await useRecords.getState().load(s)
    const e = enc('store001', 'wren', '2026-02-02')
    await useRecords.getState().add(e)
    await useRecords.getState().update({ ...e, notes: 'singing' })
    expect(useRecords.getState().encounters[0].notes).toBe('singing')
    await useRecords.getState().load(s)
    expect(useRecords.getState().encounters).toHaveLength(1)
    await useRecords.getState().remove(e.id)
    expect(useRecords.getState().encounters).toHaveLength(0)
  })
  it('keeps working in memory and warns when storage fails', async () => {
    const bad = { ...memoryStorage(), put: async () => { throw new Error('full') } }
    await useRecords.getState().load(bad)
    await useRecords.getState().add(enc('fail0001', 'wren', null))
    expect(useRecords.getState().encounters).toHaveLength(1)
    expect(useRecords.getState().warning).toBeTruthy()
  })
})

describe('geo', () => {
  const chorlton: [number, number] = [-2.2735, 53.4414]
  it('distance and bearing are sensible', () => {
    const manc: [number, number] = [-2.2426, 53.4808]
    expect(distanceKm(chorlton, manc)).toBeGreaterThan(4)
    expect(distanceKm(chorlton, manc)).toBeLessThan(6)
    expect(bearingDeg(chorlton, [chorlton[0], chorlton[1] + 0.1])).toBeCloseTo(0, 0)
    expect(bearingDeg(chorlton, [chorlton[0] + 0.1, chorlton[1]])).toBeGreaterThan(85)
    expect(bearingDeg(chorlton, [chorlton[0], chorlton[1] - 0.1])).toBeCloseTo(180, 0)
    expect(bearingDeg(chorlton, [chorlton[0] - 0.1, chorlton[1]])).toBeGreaterThan(265)
  })
  it('words, turns and labels', () => {
    expect(compassWord(0)).toBe('north')
    expect(compassWord(359)).toBe('north')
    expect(compassWord(135)).toBe('south-east')
    expect(turnNeeded(90, 80)).toBe(10)
    expect(turnNeeded(10, 350)).toBe(20)
    expect(turnNeeded(350, 10)).toBe(-20)
    expect(distanceLabel(0.4)).toBe('400 m')
    expect(distanceLabel(3.26)).toBe('3.3 km')
    expect(distanceLabel(42.4)).toBe('42 km')
  })
})

describe('phone helpers', () => {
  it('sounds are short, original and well formed', () => {
    for (const notes of Object.values(SOUNDS)) {
      expect(notes.length).toBeGreaterThan(0)
      expect(soundLength(notes)).toBeLessThan(1200)
      notes.forEach(([f, ms]) => {
        expect(f).toBeGreaterThanOrEqual(0)
        expect(ms).toBeGreaterThan(0)
      })
    }
  })
  it('shake needs a hard shake, not walking', () => {
    expect(shakeStrength(0, 0, 9.81)).toBeCloseTo(0, 1)
    expect(shakeStrength(null, 1, 1)).toBe(0)
    expect(shakeStrength(20, 15, 10)).toBeGreaterThan(SHAKE_THRESHOLD)
    expect(shakeStrength(1, 2, 11)).toBeLessThan(SHAKE_THRESHOLD)
  })
  it('tilt is clamped and has a natural holding angle', () => {
    expect(tiltFromOrientation(45, 0)).toEqual({ x: 0, y: 0 })
    expect(tiltFromOrientation(200, 90)).toEqual({ x: 1, y: 1 })
    expect(tiltFromOrientation(null, null)).toEqual({ x: 0, y: 0 })
  })
  it('compass heading from Android and iPhone events', () => {
    expect(headingFromEvent({ alpha: 90, absolute: true })).toBe(270)
    expect(headingFromEvent({ alpha: 90, absolute: false })).toBeNull()
    expect(headingFromEvent({ alpha: null, webkitCompassHeading: 123 })).toBe(123)
    expect(headingFromEvent({ alpha: 0, absolute: true }, 90)).toBe(90)
    expect(smooth(350, 10)).toBeCloseTo(357, 0)
  })
  it('photo sizing never enlarges', () => {
    expect(fitSize(4000, 3000)).toEqual({ w: 640, h: 480 })
    expect(fitSize(300, 200)).toEqual({ w: 300, h: 200 })
  })
})
