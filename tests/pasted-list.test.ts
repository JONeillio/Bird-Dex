import { describe, expect, it } from 'vitest'
import { STARTER_DEX } from '../src/data/catalogue'
import { normaliseName, parsePastedList } from '../src/data/importers/pasted-list'
import { planEbirdImport, rowsToEncounters } from '../src/data/importers/ebird-csv'

const opts = { species: STARTER_DEX, today: '2026-11-08' }
const parse = (t: string) => parsePastedList(t, opts)

describe('pasted list import (B2)', () => {
  it('matches Dex names ignoring case, hyphens, apostrophes and extra spaces', () => {
    expect(normaliseName("  Pink-footed  GOOSE ")).toBe('pink footed goose')
    const r = parse('european robin\nPINK-FOOTED GOOSE\n  eurasian   wren  ')
    expect(r.rows.map((x) => x.speciesId)).toEqual(['european-robin', 'pink-footed-goose', 'eurasian-wren'])
    expect(r.review).toEqual([])
  })

  it('reads an optional date; no date means null, never today', () => {
    const r = parse('European Robin, 2026-10-12\nEurasian Wren\nBlue Tit, 3/4/2025')
    expect(r.rows.map((x) => x.date)).toEqual(['2026-10-12', null, '2025-04-03'])
    expect(r.rows[1].importKey).toBe('list:eurasian-wren:nodate')
    expect(r.rows[0].importKey).toBe('list:european-robin:2026-10-12')
  })

  it('accepts bullets and numbering, skips blank lines, counts the lines it read', () => {
    const r = parse('1. European Robin\n- Eurasian Wren\n• Blue Tit\n\n   \n')
    expect(r.rows).toHaveLength(3)
    expect(r.totalRows).toBe(3)
  })

  it('lists what it cannot use, with line numbers, and imports nothing for those lines', () => {
    const r = parse('European Robin\nDodo\nEurasian Wren, someday\nBlue Tit, 2099-01-01\n')
    expect(r.rows).toHaveLength(1)
    expect(r.review.map((x) => [x.line, x.reason])).toEqual([
      [2, 'Not a Starter Dex bird name'],
      [3, 'Date not understood (use YYYY-MM-DD)'],
      [4, 'Date is in the future'],
    ])
  })

  it('goes through the same plan as an eBird file: repeats are skipped, saved as list sightings with no invented date', () => {
    const plan = planEbirdImport(parse('European Robin\nEuropean Robin\nEuropean Robin, 2026-10-12'), new Set(['list:european-robin:2026-10-12']))
    expect(plan.toAdd).toHaveLength(1)
    expect(plan.alreadyImported).toBe(2)
    const enc = rowsToEncounters(plan.toAdd, 'imp-test', '2026-11-08T10:00:00Z', () => 'enc-00000001', 'list')
    expect(enc[0]).toMatchObject({ speciesId: 'european-robin', date: null, source: 'list', place: '', siteId: null, importKey: 'list:european-robin:nodate' })
  })

  it('stops at 2000 lines and says so', () => {
    const r = parse(Array.from({ length: 2005 }, () => 'European Robin').join('\n'))
    expect(r.rows.length).toBe(2000)
    expect(r.review).toHaveLength(1)
  })
})
