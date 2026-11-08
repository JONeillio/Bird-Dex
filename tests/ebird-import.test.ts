// Synthetic data only (invented ids S9000…/L9000…). Never a real export.
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { STARTER_DEX } from '../src/data/catalogue'
import { createEbirdImport, parseEbirdCsv, parseEbirdDate, parseEbirdTime, planEbirdImport, rowsToEncounters, type EbirdImportOptions } from '../src/data/importers/ebird-csv'
import { EncounterSchema, type ImportBatch } from '../src/data/personal-schema'
import { memoryStorage } from '../src/data/personal/storage'
import { recordedIds } from '../src/domain/collection'
import { useRecords } from '../src/state/records'

const dexBySci = new Map(STARTER_DEX.map((s) => [s.sciName, s.id]))
const opts: EbirdImportOptions = { dexBySci, today: '2026-11-08' }
const sample = readFileSync('tests/fixtures/ebird-sample.csv', 'utf8')
const ok = (text: string) => {
  const r = parseEbirdCsv(text, opts)
  if (!r.ok) throw new Error(r.error)
  return r.parsed
}
let n = 0
const newId = () => `id${String(++n).padStart(8, '0')}`

describe('eBird CSV parsing (B1)', () => {
  it('reads the sample: Dex birds, outside-Dex birds and rows that need review', () => {
    const p = ok(sample)
    expect(p.totalRows).toBe(11)
    expect(p.rows.map((r) => r.speciesId)).toEqual(['european-robin', 'eurasian-wren', 'x-regulus-ignicapilla', 'x-branta-bernicla', 'eurasian-blue-tit'])
    expect(p.review.map((r) => r.reason)).toEqual([
      'Not a single species (sp., slash, hybrid or domestic)',
      'Not a single species (sp., slash, hybrid or domestic)',
      'Not a single species (sp., slash, hybrid or domestic)',
      'No date',
      'Date not understood',
      'Date is in the future',
    ])
    expect(p.review[3]).toMatchObject({ line: 9, name: 'European Robin' })
  })
  it('fills site, place, time and the import key; outside-Dex birds keep their names', () => {
    const [robin, , firecrest, brent, tit] = ok(sample).rows
    expect(robin).toMatchObject({ date: '2026-03-01', time: '07:30', siteId: 'L900001', place: 'Invented Water Park, North Hide', importKey: 'ebird:S900000001:Erithacus rubecula' })
    expect(firecrest).toMatchObject({ date: '2025-04-12', time: '18:05', name: 'Common Firecrest', sciName: 'Regulus ignicapilla' })
    expect(brent).toMatchObject({ time: '00:15', name: 'Brent Goose', sciName: 'Branta bernicla', importKey: 'ebird:S900000003:Branta bernicla bernicla' })
    // No submission id: the key falls back to date, place and species. A bad site id and bad time become null.
    expect(tit).toMatchObject({ siteId: null, time: null, importKey: 'ebird:2026-01-15:Invented Garden:Cyanistes caeruleus' })
  })
  it('never keeps coordinates, comments or anything else outside the whitelist', () => {
    const json = JSON.stringify(rowsToEncounters(ok(sample).rows, 'b1', '2026-11-08T10:00:00.000Z', newId))
    for (const secret of ['11.111111', '22.222222', 'SECRET-CHECKLIST-COMMENT', '77.777777']) expect(json).not.toContain(secret)
  })
  it('imported records are valid encounters, all "seen", from eBird, tagged with the batch', () => {
    const list = rowsToEncounters(ok(sample).rows, 'batch-1', '2026-11-08T10:00:00.000Z', newId)
    for (const e of list) {
      expect(EncounterSchema.safeParse(e).success).toBe(true)
      expect(e).toMatchObject({ mode: 'seen', source: 'ebird', importBatchId: 'batch-1' })
    }
  })
  it('matches headers case-insensitively and copes with a byte-order mark', () => {
    const csv = 'common name,SCIENTIFIC NAME, Date \nEuropean Robin,Erithacus rubecula,2026-03-01\n'
    expect(ok(csv).rows).toHaveLength(1)
    expect(ok('﻿' + csv).rows).toHaveLength(1)
  })
  it('explains a file that is not an eBird export', () => {
    const r = parseEbirdCsv('Name,When\nRobin,today\n', opts)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.error).toContain('"common name", "scientific name", "date"')
    expect(parseEbirdCsv('Common Name,Scientific Name,Date\n', opts).ok).toBe(false)
  })
  it('time parsing: AM/PM, noon, midnight, 24-hour and junk', () => {
    expect([parseEbirdTime('07:30 AM'), parseEbirdTime('7:30 pm'), parseEbirdTime('12:15 AM'), parseEbirdTime('12:15 PM'), parseEbirdTime('19:05'), parseEbirdTime('07:30:45')]).toEqual(['07:30', '19:30', '00:15', '12:15', '19:05', '07:30'])
    expect([parseEbirdTime(''), parseEbirdTime('25:00'), parseEbirdTime('13:00 PM'), parseEbirdTime('7:75'), parseEbirdTime('noon')]).toEqual([null, null, null, null, null])
  })
  it('date parsing: ISO and DD/MM/YYYY, real dates only', () => {
    expect([parseEbirdDate('2026-03-01'), parseEbirdDate('5/3/2026'), parseEbirdDate('29/02/2028')]).toEqual(['2026-03-01', '2026-03-05', '2028-02-29'])
    expect([parseEbirdDate('2026-02-30'), parseEbirdDate('29/02/2027'), parseEbirdDate('03-01-2026'), parseEbirdDate('')]).toEqual([null, null, null, null])
  })
})

describe('import plan and idempotency', () => {
  it('counts Dex and other birds, and importing the same file twice adds nothing the second time', () => {
    const parsed = ok(sample)
    const first = planEbirdImport(parsed, new Set())
    expect(first).toMatchObject({ dexSpecies: 3, dexSightings: 3, otherSpecies: 2, otherSightings: 2, alreadyImported: 0 })
    expect(first.toAdd).toHaveLength(5)
    const have = new Set(rowsToEncounters(first.toAdd, 'b1', 'now', newId).map((e) => e.importKey!))
    const second = planEbirdImport(parsed, have)
    expect(second.toAdd).toHaveLength(0)
    expect(second.alreadyImported).toBe(5)
  })
  it('a newer export only adds the new rows', () => {
    const old = ok(sample)
    const have = new Set(planEbirdImport(old, new Set()).toAdd.map((r) => r.importKey))
    const newer = ok(sample + 'S900000010,Common Kingfisher,Alcedo atthis,500,1,GB-ENG,X,L900005,Invented Canal,0,0,2026-11-01,08:00 AM,Traveling,,1,,,1,,,,\n')
    const plan = planEbirdImport(newer, have)
    expect(plan.toAdd.map((r) => r.speciesId)).toEqual(['common-kingfisher'])
  })
  it('the same row repeated inside one file is only counted once', () => {
    const row = 'S900000020,European Robin,Erithacus rubecula,1,1,GB,X,L900006,Y,0,0,2026-05-01,,P,,1,,,1,,,,\n'
    const plan = planEbirdImport(ok(sample.split('\n')[0] + '\n' + row + row), new Set())
    expect(plan.toAdd).toHaveLength(1)
    expect(plan.alreadyImported).toBe(1)
  })
  it('outside-Dex birds never fill the Starter Dex', () => {
    const list = rowsToEncounters(ok(sample).rows, 'b1', 'now', newId)
    expect([...recordedIds({ demoCollection: false }, list)].sort()).toEqual(['eurasian-blue-tit', 'eurasian-wren', 'european-robin'])
  })
})

describe('big files', () => {
  it('parses 20,000 synthetic rows in under 3 seconds', () => {
    const lines = ['Submission ID,Common Name,Scientific Name,Location ID,Location,Date,Time']
    const sci = [...dexBySci.keys()]
    for (let i = 0; i < 20000; i++) {
      const d = new Date(Date.UTC(2020, 0, 1 + (i % 2000)))
      lines.push(`S${900000000 + i},Bird ${i % 104},${sci[i % sci.length]},L${900000 + (i % 300)},Place ${i % 300},${d.toISOString().slice(0, 10)},0${i % 10}:30 AM`)
    }
    const t = performance.now()
    const parsed = ok(lines.join('\n'))
    const plan = planEbirdImport(parsed, new Set())
    expect(performance.now() - t).toBeLessThan(3000)
    expect(plan.toAdd).toHaveLength(20000)
  })
  it('the streaming collector gives the same result as parsing text', () => {
    const imp = createEbirdImport(opts)
    expect(imp.checkHeaders(['common name', 'scientific name', 'date'])).toBeNull()
    imp.addRow({ 'common name': 'European Robin', 'scientific name': 'Erithacus rubecula', date: '2026-03-01' }, 2)
    imp.addRow({ 'common name': 'European Robin', 'scientific name': 'Erithacus rubecula', date: '' }, 3)
    expect(imp.result()).toMatchObject({ totalRows: 2 })
    expect(imp.result().rows).toHaveLength(1)
    expect(imp.result().review).toHaveLength(1)
  })
})

describe('writing an import', () => {
  beforeEach(async () => {
    await useRecords.getState().load(memoryStorage())
  })
  it('writes in chunks, reports progress, records the batch and survives a reload', async () => {
    const rows = Array.from({ length: 1230 }, (_, i) => ({ speciesId: 'european-robin', date: '2026-03-01', time: null, siteId: null, place: '', importKey: `ebird:S${i}:Erithacus rubecula` }))
    const list = rowsToEncounters(rows, 'batch-9', '2026-11-08T10:00:00.000Z', newId)
    const batch: ImportBatch = { id: 'batch-9', source: 'ebird', fileName: 'sample.csv', rowCount: 1300, importedCount: 1230, date: '2026-11-08T10:00:00.000Z' }
    const steps: number[] = []
    const store = memoryStorage()
    await useRecords.getState().load(store)
    await useRecords.getState().addMany(list, batch, (f) => steps.push(f))
    expect(steps).toHaveLength(3)
    expect(steps.at(-1)).toBe(1)
    expect(useRecords.getState().encounters).toHaveLength(1230)
    expect(useRecords.getState().batches).toEqual([batch])
    await useRecords.getState().load(store)
    expect(useRecords.getState().encounters).toHaveLength(1230)
    expect(useRecords.getState().batches).toEqual([batch])
  })
})
