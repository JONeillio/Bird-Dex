// The made-up eBird history (B1c): deterministic, goes through the normal importer, never touches real data.
import { describe, expect, it } from 'vitest'
import { STARTER_DEX } from '../src/data/catalogue'
import { traitsById } from '../src/data/game'
import { parseEbirdCsv, planEbirdImport, rowsToEncounters } from '../src/data/importers/ebird-csv'
import { generateSampleHistory } from '../src/data/importers/sample-history'
import { EncounterSchema } from '../src/data/personal-schema'
import { recordedIds } from '../src/domain/collection'
import { hash, mulberry32 } from '../src/domain/random'

const today = '2026-11-08'
const dexBySci = new Map(STARTER_DEX.map((s) => [s.sciName, s.id]))
const make = (seed?: string) => generateSampleHistory({ species: STARTER_DEX, traitsOf: traitsById, today, seed })
const parse = (csv: string) => {
  const r = parseEbirdCsv(csv, { dexBySci, today })
  if (!r.ok) throw new Error(r.error)
  return r.parsed
}

describe('seeded random', () => {
  it('is repeatable and in range', () => {
    const a = mulberry32(hash('x'))
    const b = mulberry32(hash('x'))
    const xs = Array.from({ length: 50 }, () => a())
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()))
    expect(xs.every((v) => v >= 0 && v < 1)).toBe(true)
    expect(hash('x')).not.toBe(hash('y'))
  })
})

describe('sample eBird history', () => {
  it('gives the same file for the same seed, a different one for another', () => {
    expect(make()).toBe(make())
    expect(make('other')).not.toBe(make())
  })

  it('imports through the normal importer with a realistic shape', () => {
    const p = parse(make())
    const checklists = new Set(p.rows.map((r) => r.importKey.split(':')[1]))
    const dex = new Set(p.rows.filter((r) => !r.speciesId.startsWith('x-')).map((r) => r.speciesId))
    const outside = new Set(p.rows.filter((r) => r.speciesId.startsWith('x-')).map((r) => r.speciesId))
    const msg = JSON.stringify({ rows: p.rows.length, review: p.review.length, checklists: checklists.size, dex: dex.size, outside: outside.size })
    expect(checklists.size, msg).toBeGreaterThan(150)
    expect(checklists.size, msg).toBeLessThan(450)
    expect(dex.size, msg).toBeGreaterThan(60)
    expect(dex.size, msg).toBeLessThanOrEqual(STARTER_DEX.length - 14)
    expect(outside.size, msg).toBeGreaterThanOrEqual(8)
    expect(p.review.length, msg).toBeGreaterThan(0)
  })

  it('uses only invented sites, real dates and never a future date', () => {
    const p = parse(make())
    expect(p.rows.every((r) => r.siteId?.startsWith('L99') && r.place.startsWith('Sample'))).toBe(true)
    expect(p.rows.every((r) => r.date! >= '2024-01-01' && r.date! <= today)).toBe(true)
    expect(p.rows.every((r) => r.time === null || /^\d\d:\d\d$/.test(r.time))).toBe(true)
  })

  it('does not put an outside bird on a Dex species, and keeps common birds commoner than rare ones', () => {
    const p = parse(make())
    const counts = new Map<string, number>()
    for (const r of p.rows) counts.set(r.speciesId, (counts.get(r.speciesId) ?? 0) + 1)
    const sorted = [...counts.values()].sort((a, b) => b - a)
    expect(sorted[0]!).toBeGreaterThan(sorted[sorted.length - 1]! * 3)
    for (const r of p.rows.filter((x) => x.speciesId.startsWith('x-'))) expect(dexBySci.has(r.sciName ?? '')).toBe(false)
  })

  it('is skipped on re-import: a second plan adds nothing', () => {
    const p = parse(make())
    const first = planEbirdImport(p, new Set())
    const again = planEbirdImport(p, new Set(first.toAdd.map((r) => r.importKey)))
    expect(first.toAdd.length).toBeGreaterThan(1000)
    expect(again.toAdd.length).toBe(0)
  })

  it('is a mix of seasons: summer visitors only appear in summer months', () => {
    const p = parse(make())
    const swallow = p.rows.filter((r) => r.speciesId === 'barn-swallow')
    if (swallow.length) expect(swallow.every((r) => Number(r.date!.slice(5, 7)) >= 4 && Number(r.date!.slice(5, 7)) <= 9)).toBe(true)
  })

  it('saves as source "sample", passes the record schema and fills the Dex like an import would', () => {
    const p = parse(make())
    let n = 0
    const list = rowsToEncounters(planEbirdImport(p, new Set()).toAdd, 'imp-test', '2026-11-08T10:00:00.000Z', () => `id${String(++n).padStart(8, '0')}`, 'sample')
    expect(list.every((e) => e.source === 'sample')).toBe(true)
    expect(list.every((e) => EncounterSchema.safeParse(e).success)).toBe(true)
    const ids = recordedIds({ demoCollection: false }, list)
    expect(ids.size).toBeGreaterThan(60)
    expect([...ids].some((i) => i.startsWith('x-'))).toBe(false)
  })

  it('uses submission ids that cannot match a real eBird checklist', () => {
    const subs = make().split('\n').slice(1).filter(Boolean).map((l) => l.split(',')[0])
    expect(subs.every((s) => /^SMP\d{6}$/.test(s!))).toBe(true)
  })
})
