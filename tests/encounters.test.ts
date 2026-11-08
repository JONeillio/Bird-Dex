import { describe, expect, it } from 'vitest'
import { STARTER_DEX } from '../src/data/catalogue'
import { BackupSchema, EncounterSchema, validSiteId, type Encounter } from '../src/data/personal-schema'
import { buildBackup, parseBackup, planRestore } from '../src/domain/backup'
import { recordedIds } from '../src/domain/collection'
import { dexIdFor, isNotASpecies, isOutsideId, outsideId } from '../src/domain/taxon'
import { monthOf, nowHHMM, seasonOfMonth, timeBand } from '../src/domain/time'

const base: Encounter = {
  id: 'enc00001', speciesId: 'european-robin', date: '2026-11-07', place: 'Chorlton Water Park', mode: 'seen', notes: '', photo: null,
  createdAt: '2026-11-07T10:00:00.000Z',
}
const outside: Encounter = {
  ...base, id: 'enc00002', speciesId: 'x-regulus-ignicapilla', name: 'Common Firecrest', sciName: 'Regulus ignicapilla',
  siteId: 'L900001', time: '07:30', source: 'ebird', importBatchId: 'batch-1', importKey: 'ebird:S900000001:Regulus ignicapilla',
}

describe('encounter fields (A1)', () => {
  it('an old encounter without the new fields still parses', () => {
    expect(EncounterSchema.safeParse(base).success).toBe(true)
  })
  it('accepts the new fields, with null site and time', () => {
    expect(EncounterSchema.safeParse(outside).success).toBe(true)
    expect(EncounterSchema.safeParse({ ...base, siteId: null, time: null }).success).toBe(true)
  })
  it('rejects malformed site, time and source', () => {
    expect(EncounterSchema.safeParse({ ...base, siteId: 'hotspot' }).success).toBe(false)
    expect(EncounterSchema.safeParse({ ...base, time: '7:30' }).success).toBe(false)
    expect(EncounterSchema.safeParse({ ...base, source: 'scraped' }).success).toBe(false)
    expect(EncounterSchema.safeParse({ ...base, importKey: 'k'.repeat(201) }).success).toBe(false)
  })
  it('outside-Dex birds do not count toward Starter Dex progress', () => {
    expect([...recordedIds({ demoCollection: false }, [base, outside])]).toEqual(['european-robin'])
  })
  it('a backup round-trip keeps the new fields and is written as schema 2', () => {
    const b = buildBackup([base, outside], [], new Date('2026-11-08T12:00:00Z'))
    expect(b.schema).toBe(2)
    expect(BackupSchema.safeParse(b).success).toBe(true)
    const r = parseBackup(JSON.stringify(b))
    expect(r.ok && r.backup.encounters).toEqual([base, outside])
  })
  it('restoring keeps named outside-Dex birds but drops unknown ones without a name', () => {
    const known = new Set(STARTER_DEX.map((d) => d.id))
    const b = buildBackup([outside, { ...outside, id: 'enc00003', name: undefined }, { ...base, id: 'enc00004', speciesId: 'dodo' }], [])
    const plan = planRestore([], [], b, known)
    expect(plan.added).toBe(1)
    expect(plan.unknown).toBe(2)
    expect(plan.merged.map((e) => e.id)).toEqual(['enc00002'])
  })
})

describe('taxon helpers', () => {
  it('outsideId follows the spec', () => {
    expect(outsideId('Regulus ignicapilla')).toBe('x-regulus-ignicapilla')
    expect(outsideId('  Larus  argentatus argenteus ')).toBe('x-larus-argentatus-argenteus')
    expect(outsideId('Pica pica (Linnaeus, 1758)')).toBe('x-pica-pica-linnaeus')
    expect(outsideId('???')).toBe('x-unknown')
  })
  it('outside ids are valid species ids and never collide with the Dex', () => {
    expect(EncounterSchema.shape.speciesId.safeParse(outsideId('Regulus ignicapilla')).success).toBe(true)
    expect(isOutsideId('x-regulus-ignicapilla')).toBe(true)
    expect(STARTER_DEX.some((d) => isOutsideId(d.id))).toBe(false)
  })
  it('isNotASpecies and dexIdFor behave as the pipeline expects', () => {
    expect(isNotASpecies('Larus sp.', 'gull sp.')).toBe(true)
    expect(isNotASpecies('Corvus corone/cornix', 'Carrion/Hooded Crow')).toBe(true)
    expect(isNotASpecies('Anas platyrhynchos x domesticus', 'Mallard (hybrid)')).toBe(true)
    expect(isNotASpecies('Erithacus rubecula', 'European Robin')).toBe(false)
    const m = new Map([['Erithacus rubecula', 'european-robin']])
    expect(dexIdFor('Erithacus rubecula', m)).toBe('european-robin')
    expect(dexIdFor('Erithacus rubecula superbus', m)).toBe('european-robin')
    expect(dexIdFor('Nope nope', m)).toBeNull()
  })
})

describe('time helpers', () => {
  it('nowHHMM pads to 24-hour HH:MM', () => {
    expect(nowHHMM(new Date(2026, 10, 8, 7, 5))).toBe('07:05')
    expect(nowHHMM(new Date(2026, 10, 8, 23, 59))).toBe('23:59')
  })
  it('time bands follow the spec at their edges', () => {
    const t = (x: string) => timeBand(x)
    expect([t('03:59'), t('04:00'), t('08:59'), t('09:00'), t('16:59'), t('17:00'), t('20:59'), t('21:00'), t('00:00')]).toEqual(['night', 'dawn', 'dawn', 'day', 'day', 'dusk', 'dusk', 'night', 'night'])
  })
  it('no time or a bad time means no band', () => {
    expect([timeBand(null), timeBand(undefined), timeBand(''), timeBand('7:30'), timeBand('25:00'), timeBand('12:60')]).toEqual([null, null, null, null, null, null])
  })
  it('seasons and months', () => {
    expect([12, 1, 2, 3, 5, 6, 8, 9, 11].map(seasonOfMonth)).toEqual(['winter', 'winter', 'winter', 'spring', 'spring', 'summer', 'summer', 'autumn', 'autumn'])
    expect(monthOf('2026-11-08')).toBe(11)
    expect([monthOf(null), monthOf('2026-13-01'), monthOf('08/11/2026')]).toEqual([null, null, null])
  })
})

describe('site ids', () => {
  it('keeps real eBird ids and drops demo or malformed ones', () => {
    expect(validSiteId('L900001')).toBe('L900001')
    expect([validSiteId('LDEMO01'), validSiteId(''), validSiteId(null), validSiteId(undefined), validSiteId('l123')]).toEqual([null, null, null, null, null])
  })
})
