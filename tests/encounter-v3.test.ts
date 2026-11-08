// P2: counts, checklist ids and durations from an eBird export.
import { describe, expect, it } from 'vitest'
import { STARTER_DEX } from '../src/data/catalogue'
import { parseEbirdCount, parseEbirdCsv, parseEbirdDuration, planEbirdImport, rowsToEncounters } from '../src/data/importers/ebird-csv'
import { EncounterSchema } from '../src/data/personal-schema'

const opts = { dexBySci: new Map(STARTER_DEX.map((s) => [s.sciName, s.id])), today: '2026-11-08' }
const HEAD = 'Submission ID,Common Name,Scientific Name,Count,Location ID,Location,Date,Time,Duration (Min)'
const parse = (csv: string) => {
  const r = parseEbirdCsv(csv, opts)
  if (!r.ok) throw new Error(r.error)
  return r.parsed
}

describe('count and duration parsing', () => {
  it('reads whole numbers, X as null, and leaves anything else out', () => {
    expect(parseEbirdCount('12')).toBe(12)
    expect(parseEbirdCount(' x ')).toBeNull()
    expect(parseEbirdCount('X')).toBeNull()
    for (const bad of ['', '0', '-3', '2.5', 'many', '99999999999']) expect(parseEbirdCount(bad), bad).toBeUndefined()
    expect(parseEbirdDuration('90')).toBe(90)
    expect(parseEbirdDuration('45.6')).toBe(46)
    expect(parseEbirdDuration('0')).toBe(0)
    for (const bad of ['', 'x', '1441', '-5']) expect(parseEbirdDuration(bad), bad).toBeUndefined()
  })
})

describe('importer keeps count, checklist and duration', () => {
  it('copies them onto each row and saves valid records', () => {
    const p = parse(`${HEAD}\nS111,European Robin,Erithacus rubecula,3,L123,Test Marsh,2026-11-01,07:30 AM,95\nS111,Eurasian Wren,Nannus troglodytes,X,L123,Test Marsh,2026-11-01,07:30 AM,95\n`)
    expect(p.rows[0]).toMatchObject({ count: 3, checklistId: 'S111', durationMin: 95 })
    expect(p.rows[1].count).toBeNull()
    const enc = rowsToEncounters(p.rows, 'imp-1', '2026-11-08T10:00:00Z', (() => { let n = 0; return () => `enc-${String(++n).padStart(8, '0')}` })())
    expect(enc[0]).toMatchObject({ count: 3, checklistId: 'S111', durationMin: 95 })
    expect(enc[1].count).toBeNull()
    for (const e of enc) expect(EncounterSchema.safeParse(e).success).toBe(true)
  })

  it('a file without these columns still imports, with nothing invented', () => {
    const p = parse('Common Name,Scientific Name,Date\nEuropean Robin,Erithacus rubecula,2026-11-01\n')
    expect(p.rows[0]).not.toHaveProperty('count')
    expect(p.rows[0]).not.toHaveProperty('checklistId')
    expect(p.rows[0]).not.toHaveProperty('durationMin')
    const e = rowsToEncounters(p.rows, 'imp-1', '2026-11-08T10:00:00Z', () => 'enc-00000001')[0]
    expect('count' in e || 'durationMin' in e || 'checklistId' in e).toBe(false)
  })

  it('leaves out odd values rather than guessing', () => {
    const p = parse(`${HEAD}\nnot-an-id!,European Robin,Erithacus rubecula,lots,L123,Test Marsh,2026-11-01,07:30,5000\n`)
    expect(p.rows[0]).not.toHaveProperty('count')
    expect(p.rows[0]).not.toHaveProperty('checklistId')
    expect(p.rows[0]).not.toHaveProperty('durationMin')
  })

  it('re-importing the same file adds nothing', () => {
    const csv = `${HEAD}\nS111,European Robin,Erithacus rubecula,3,L123,Test Marsh,2026-11-01,07:30 AM,95\n`
    const first = planEbirdImport(parse(csv), new Set())
    expect(first.toAdd).toHaveLength(1)
    const keys = new Set(first.toAdd.map((r) => r.importKey))
    expect(planEbirdImport(parse(csv), keys).toAdd).toHaveLength(0)
  })

  it('old records without the new fields still parse', () => {
    const old = { id: 'enc-00000001', speciesId: 'european-robin', date: '2026-11-01', place: 'x', mode: 'seen', notes: '', photo: null, createdAt: '2026-11-01T10:00:00Z' }
    expect(EncounterSchema.safeParse(old).success).toBe(true)
    expect(EncounterSchema.safeParse({ ...old, count: 0 }).success).toBe(false)
    expect(EncounterSchema.safeParse({ ...old, durationMin: 2000 }).success).toBe(false)
    expect(EncounterSchema.safeParse({ ...old, checklistId: 'abc' }).success).toBe(false)
  })

  it('the sample history has believable counts, checklists and durations, and some X counts', () => {
    const csv = parse(require_sample())
    const withCount = csv.rows.filter((r) => typeof r.count === 'number')
    expect(withCount.length).toBeGreaterThan(1000)
    expect(csv.rows.some((r) => r.count === null)).toBe(true)
    expect(csv.rows.filter((r) => r.checklistId).length).toBeGreaterThan(1500)
    const d = csv.rows.map((r) => r.durationMin).filter((n): n is number => n !== undefined)
    expect(Math.min(...d)).toBeGreaterThanOrEqual(15)
    expect(Math.max(...d)).toBeLessThanOrEqual(210)
  })
})

import { readFileSync } from 'node:fs'
function require_sample() {
  return readFileSync('samples/MyEBirdData-sample.csv', 'utf8')
}
