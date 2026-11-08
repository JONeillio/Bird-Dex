import { describe, expect, it } from 'vitest'
import type { Encounter } from '../src/data/personal-schema'
import type { RegionData, Report, Site } from '../src/data/published-schema'
import { allFieldReports, fieldReportFor, type FieldReport } from '../src/domain/fieldReport'
import { buildRarity } from '../src/domain/rarity'

let n = 0
function enc(over: Partial<Encounter> = {}): Encounter {
  n += 1
  return {
    id: `enc${String(n).padStart(6, '0')}`, speciesId: 'european-robin', date: '2025-03-01', place: 'Reedbed', mode: 'seen',
    notes: '', photo: null, createdAt: `2026-11-08T10:00:${String(n % 60).padStart(2, '0')}.000Z`, ...over,
  }
}
const REED = { siteId: 'L100001', place: 'Reedbed Reserve' }
const WOOD = { siteId: null, place: 'Wood' }
const flat = buildRarity(null) // every bird "unknown", 1 point, so the sums are easy to check
const ctx = { rarity: flat, region: null }

const rep = (sciName: string): Report => ({
  speciesId: null, ebirdCode: 'x', name: sciName, sciName, obsDate: '2026-11-06', obsTime: null, count: null, checklistUrl: null, reviewed: false,
})
const site = (id: string, reports: Report[]): Site => ({
  id, name: id, point: [-2.3, 53.4], url: null, latestObsDate: null, speciesAllTime: null, access: 'unknown', reports,
})
const region = (sites: Site[]): RegionData => ({
  schema: 1, regionId: 'r', generatedAt: '2026-11-07T06:00:00Z', isDemo: true, windowDays: 14,
  coverage: { hotspotsListed: 0, hotspotsActive: 0, reportsFetchedFor: 0, truncated: false, note: '' },
  sites, drive: { computedAt: null, byStart: {} }, unmatchedSpecies: [],
})

// A scripted five-outing history.
function history(): Encounter[] {
  return [
    // 1: first visit to Reedbed; two lifers
    enc({ ...REED, time: '07:00', speciesId: 'european-robin' }),
    enc({ ...REED, time: '07:10', speciesId: 'common-kingfisher' }),
    // 2: same day, Wood later; robin not a lifer, wren is
    enc({ ...WOOD, time: '10:00', speciesId: 'european-robin' }),
    enc({ ...WOOD, time: '10:20', speciesId: 'eurasian-wren' }),
    // 3: back at Reedbed in June; blue tit new
    enc({ ...REED, date: '2025-06-01', time: '07:00', speciesId: 'european-robin' }),
    enc({ ...REED, date: '2025-06-01', time: '07:05', speciesId: 'common-kingfisher' }),
    enc({ ...REED, date: '2025-06-01', time: '07:30', speciesId: 'eurasian-blue-tit' }),
    // 4: new year, fewer species
    enc({ ...REED, date: '2026-02-01', time: '07:00', speciesId: 'european-robin' }),
    enc({ ...REED, date: '2026-02-01', time: '07:05', speciesId: 'common-kingfisher' }),
    // 5: a bird outside the Starter Dex
    enc({ ...REED, date: '2026-02-02', time: '07:00', speciesId: 'european-robin' }),
    enc({ ...REED, date: '2026-02-02', time: '07:05', speciesId: 'common-kingfisher' }),
    enc({ ...REED, date: '2026-02-02', time: '07:10', speciesId: 'x-regulus-ignicapilla', name: 'Common Firecrest', sciName: 'Regulus ignicapilla' }),
  ]
}
const byDateSite = (rs: FieldReport[], date: string, siteId: string | null) => rs.find((r) => r.date === date && r.siteId === siteId)!

describe('Field Report engine (N2)', () => {
  const reports = allFieldReports(history(), ctx)

  it('makes one report per outing, newest first', () => {
    expect(reports.map((r) => `${r.date} ${r.siteId ?? 'wood'}`)).toEqual([
      '2026-02-02 L100001', '2026-02-01 L100001', '2025-06-01 L100001', '2025-03-01 wood', '2025-03-01 L100001',
    ])
  })

  it('first visit: lifers, explorer bonus and Bond all count', () => {
    const r = byDateSite(reports, '2025-03-01', 'L100001')
    expect(r.firstVisit).toBe(true)
    expect(r.speciesCount).toBe(2)
    expect(r.birds.every((b) => b.lifer && !b.firstOfYear)).toBe(true)
    expect(r.points).toEqual({ rarity: 2, lifers: 40, firstsOfYear: 0, bond: 20, explorer: 15, total: 77 })
    expect(r.siteBest).toEqual({ previous: null, isNewBest: false })
    expect(r.par).toBeNull()
    expect(r.place).toBe('Reedbed Reserve')
  })

  it('a bird already seen earlier the same day at another place is not a lifer, and its rank can rise', () => {
    const r = byDateSite(reports, '2025-03-01', null)
    const robin = r.birds.find((b) => b.key === 'european-robin')!
    const wren = r.birds.find((b) => b.key === 'eurasian-wren')!
    expect(robin.lifer).toBe(false)
    expect(robin.firstOfYear).toBe(false) // already seen this calendar year
    expect(wren.lifer).toBe(true)
    // robin Bond 10 -> 18 (new place +5, new time band +3): Spotted -> Known
    expect(robin.rankUp).toEqual({ from: 'Spotted', to: 'Known' })
    expect(wren.rankUp).toBeNull()
    expect(r.firstVisit).toBe(true) // first time at "wood"
    expect(r.points).toEqual({ rarity: 2, lifers: 20, firstsOfYear: 0, bond: 18, explorer: 15, total: 55 })
  })

  it('the earlier time gets the lifer even if the later outing was added first', () => {
    const rs = allFieldReports([
      enc({ ...REED, time: '10:00', date: '2025-05-05' }),
      enc({ ...WOOD, time: '07:00', date: '2025-05-05' }),
    ], ctx)
    expect(byDateSite(rs, '2025-05-05', null).birds[0].lifer).toBe(true)
    expect(byDateSite(rs, '2025-05-05', 'L100001').birds[0].lifer).toBe(false)
  })

  it('a return visit: new best site count, no explorer bonus', () => {
    const r = byDateSite(reports, '2025-06-01', 'L100001')
    expect(r.firstVisit).toBe(false)
    expect(r.siteBest).toEqual({ previous: 2, isNewBest: true })
    expect(r.birds.filter((b) => b.lifer).map((b) => b.key)).toEqual(['eurasian-blue-tit'])
    expect(r.points).toEqual({ rarity: 3, lifers: 20, firstsOfYear: 0, bond: 18, explorer: 0, total: 41 })
  })

  it('first of the year is a seen-before bird logged for the first time in a calendar year', () => {
    const r = byDateSite(reports, '2026-02-01', 'L100001')
    expect(r.birds.every((b) => b.firstOfYear && !b.lifer)).toBe(true)
    expect(r.points).toEqual({ rarity: 2, lifers: 0, firstsOfYear: 10, bond: 14, explorer: 0, total: 26 })
    expect(r.siteBest).toEqual({ previous: 3, isNewBest: false }) // 2 species does not beat 3
  })

  it('equalling the site best is not a new best; outside-Dex birds are lifers too', () => {
    const r = byDateSite(reports, '2026-02-02', 'L100001')
    expect(r.speciesCount).toBe(3)
    expect(r.siteBest).toEqual({ previous: 3, isNewBest: false })
    const fc = r.birds.find((b) => b.key === 'x-regulus-ignicapilla')!
    expect(fc.lifer).toBe(true)
    expect(fc.name).toBe('Common Firecrest')
    expect(r.bestBird).toBe('x-regulus-ignicapilla')
  })

  it('the total always equals the bird points plus the explorer bonus', () => {
    for (const r of reports) {
      const sum = r.birds.reduce((t, b) => t + b.points, 0)
      expect(r.points.total).toBe(sum + r.points.explorer)
      expect(r.points.total).toBe(r.points.rarity + r.points.lifers + r.points.firstsOfYear + r.points.bond + r.points.explorer)
    }
  })

  it('birds are sorted by points, then name', () => {
    const r = byDateSite(reports, '2025-06-01', 'L100001')
    const pts = r.birds.map((b) => b.points)
    expect([...pts].sort((a, b) => b - a)).toEqual(pts)
    expect(r.bestBird).toBe('eurasian-blue-tit')
  })

  it('par: compares with what was reported at the hotspot in the data window', () => {
    const rg = region([site('L100001', [rep('Erithacus rubecula'), rep('Alcedo atthis'), rep('Nannus troglodytes'), rep('Anas platyrhynchos')])])
    const r = byDateSite(allFieldReports(history(), { rarity: flat, region: rg }), '2026-02-02', 'L100001')
    expect(r.par).toEqual({ par: 4, found: 2, extra: ['x-regulus-ignicapilla'] })
    // other hotspots, or no hotspot id, have no par
    const rOther = allFieldReports(history(), { rarity: flat, region: rg })
    expect(byDateSite(rOther, '2025-03-01', null).par).toBeNull()
    expect(byDateSite(allFieldReports(history(), ctx), '2026-02-02', 'L100001').par).toBeNull()
  })

  it('rarity points come from the rarity table (scarce 10, common 1, not reported 8)', () => {
    const sites: Site[] = []
    for (let i = 0; i < 100; i++) sites.push(site(`L${i + 1}`, [rep('Erithacus rubecula'), ...(i === 0 ? [rep('Alcedo atthis')] : [])]))
    const table = buildRarity(region(sites))
    const rs = allFieldReports([
      enc({ ...REED, speciesId: 'european-robin' }),
      enc({ ...REED, speciesId: 'common-kingfisher' }),
      enc({ ...REED, speciesId: 'eurasian-wren' }),
    ], { rarity: table, region: null })
    expect(rs[0].points.rarity).toBe(1 + 10 + 8)
    expect(rs[0].birds.find((b) => b.key === 'common-kingfisher')!.tier).toBe('scarce')
    expect(rs[0].birds.find((b) => b.key === 'eurasian-wren')!.tier).toBe('unreported')
  })

  it('undated sightings make no outing and are never a lifer for a dated one', () => {
    const rs = allFieldReports([enc({ date: null }), enc({ date: '2025-03-01' })], ctx)
    expect(rs).toHaveLength(1)
    expect(rs[0].birds[0].lifer).toBe(true)
  })

  it('an unknown place has no first visit and no site best', () => {
    const rs = allFieldReports([enc({ siteId: null, place: '' }), enc({ siteId: null, place: '', date: '2025-04-01' })], ctx)
    expect(rs.every((r) => !r.firstVisit && r.points.explorer === 0 && r.siteBest.previous === null)).toBe(true)
  })

  it('sample outings pass the flag through', () => {
    const rs = allFieldReports([enc({ source: 'sample' }), enc({ date: '2025-04-01', source: 'sample' }), enc({ date: '2025-05-01', source: 'sample' }), enc({ date: '2025-05-01', source: 'log', speciesId: 'mallard' })], ctx)
    expect(rs.map((r) => r.sample)).toEqual([false, true, true])
  })

  it('fieldReportFor finds one outing or returns null', () => {
    const r = fieldReportFor('2025-06-01|L100001', history(), ctx)
    expect(r?.date).toBe('2025-06-01')
    expect(fieldReportFor('1999-01-01|nowhere', history(), ctx)).toBeNull()
  })

  it('handles 12,000 sightings quickly', () => {
    const encs: Encounter[] = []
    for (let i = 0; i < 12000; i++) {
      const month = String((i % 12) + 1).padStart(2, '0')
      const day = String((i % 27) + 1).padStart(2, '0')
      encs.push(enc({
        id: `perf${String(i).padStart(6, '0')}`,
        speciesId: `bird-${i % 150}`,
        date: `${2024 + (i % 3)}-${month}-${day}`,
        siteId: `L${900000 + (i % 40)}`,
        place: `site ${i % 40}`,
        time: `${String(i % 24).padStart(2, '0')}:00`,
      }))
    }
    const t = performance.now()
    const rs = allFieldReports(encs, ctx)
    expect(performance.now() - t).toBeLessThan(500)
    expect(rs.length).toBeGreaterThan(100)
  })
})
