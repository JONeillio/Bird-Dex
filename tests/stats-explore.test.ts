import { describe, expect, it } from 'vitest'
import type { Encounter } from '../src/data/personal-schema'
import type { RegionData, Report, Site } from '../src/data/published-schema'
import { computeBond } from '../src/domain/bond'
import { exploration, visitedSiteIds } from '../src/domain/explore'
import { allFieldReports } from '../src/domain/fieldReport'
import { buildRarity } from '../src/domain/rarity'
import { collectionStats, streakOf, weekIndex } from '../src/domain/stats'

let n = 0
function enc(over: Partial<Encounter> = {}): Encounter {
  n += 1
  return {
    id: `enc${String(n).padStart(6, '0')}`, speciesId: 'european-robin', date: '2026-10-05', place: 'Reedbed', mode: 'seen',
    notes: '', photo: null, createdAt: `2026-11-08T10:00:${String(n % 60).padStart(2, '0')}.000Z`, ...over,
  }
}
const rep = (sciName: string): Report => ({
  speciesId: null, ebirdCode: 'x', name: sciName, sciName, obsDate: '2026-11-06', obsTime: null, count: null, checklistUrl: null, reviewed: false,
})
const site = (id: string, reports: Report[] = []): Site => ({
  id, name: id, point: [-2.3, 53.4], url: null, latestObsDate: null, speciesAllTime: null, access: 'unknown', reports,
})
const region = (sites: Site[], drive: RegionData['drive']['byStart'][string] = {}): RegionData => ({
  schema: 1, regionId: 'r', generatedAt: '2026-11-07T06:00:00Z', isDemo: true, windowDays: 14,
  coverage: { hotspotsListed: 0, hotspotsActive: 0, reportsFetchedFor: 0, truncated: false, note: '' },
  sites, drive: { computedAt: null, byStart: { s: drive } }, unmatchedSpecies: [],
})

describe('weeks and streaks (N3)', () => {
  it('weeks start on Monday and roll over across years', () => {
    expect(weekIndex('2026-11-02')).toBe(weekIndex('2026-11-08')) // Mon..Sun
    expect(weekIndex('2026-11-09')).toBe(weekIndex('2026-11-08') + 1)
    expect(weekIndex('2026-01-01')).toBe(weekIndex('2025-12-29')) // Thu 1 Jan is in the week starting Mon 29 Dec
  })

  it('counts consecutive weeks, best and current', () => {
    // weeks: 12 Oct, 19 Oct, 26 Oct (3 in a row), then a gap, then 9 Nov
    const dates = ['2026-10-12', '2026-10-20', '2026-10-30', '2026-11-10']
    expect(streakOf(dates, '2026-11-11')).toEqual({ currentWeeks: 1, bestWeeks: 3 })
  })

  it('the current streak may end last week', () => {
    const dates = ['2026-10-26', '2026-11-02'] // weeks of 26 Oct and 2 Nov
    expect(streakOf(dates, '2026-11-08')).toEqual({ currentWeeks: 2, bestWeeks: 2 }) // this week is the one of 2 Nov
    expect(streakOf(dates, '2026-11-12')).toEqual({ currentWeeks: 2, bestWeeks: 2 }) // this week empty, last week counts
    expect(streakOf(dates, '2026-11-19')).toEqual({ currentWeeks: 0, bestWeeks: 2 }) // a full week missed
  })

  it('two outings in one week count once; no outings is zero', () => {
    expect(streakOf(['2026-11-02', '2026-11-05'], '2026-11-06')).toEqual({ currentWeeks: 1, bestWeeks: 1 })
    expect(streakOf([], '2026-11-06')).toEqual({ currentWeeks: 0, bestWeeks: 0 })
  })
})

describe('collectionStats (N3)', () => {
  const encs: Encounter[] = [
    enc({ siteId: 'L100001', place: 'Reedbed', time: '07:00', speciesId: 'european-robin', date: '2025-05-01' }),
    enc({ siteId: 'L100001', place: 'Reedbed', time: '07:10', speciesId: 'common-kingfisher', date: '2025-05-01' }),
    enc({ siteId: 'L100001', place: 'Reedbed', time: '07:00', speciesId: 'european-robin', date: '2026-10-05' }),
    enc({ siteId: null, place: 'Wood', speciesId: 'european-robin', date: '2026-10-12' }),
    enc({ siteId: null, place: '', speciesId: 'x-regulus-ignicapilla', name: 'Common Firecrest', sciName: 'Regulus ignicapilla', date: null }),
  ]
  const sites: Site[] = []
  for (let i = 0; i < 100; i++) sites.push(site(`L${i + 1}`, [rep('Erithacus rubecula'), ...(i === 0 ? [rep('Alcedo atthis')] : [])]))
  const rarity = buildRarity(region(sites))
  const ctx = { rarity, region: null }
  const reports = allFieldReports(encs, ctx)
  const bond = computeBond(encs)
  const stats = collectionStats(encs, reports, bond, rarity, '2026-10-14')

  it('totals', () => {
    expect(stats.totals).toEqual({ sightings: 5, species: 3, dexSpecies: 2, outings: 3, sites: 2 })
    expect(stats.sample).toBe(false)
  })

  it('most seen is by sightings, then name', () => {
    expect(stats.mostSeen.map((b) => [b.name, b.sightings])).toEqual([['Robin', 3], ['Common Firecrest', 1], ['Kingfisher', 1]])
  })

  it('top Bond uses the Bond points', () => {
    expect(stats.topBond[0]).toMatchObject({ key: 'european-robin', points: bond.get('european-robin')!.points })
    expect(stats.topBond.length).toBe(3)
  })

  it('coolest orders by rarity points, then fewest sightings', () => {
    // kingfisher: 1 of 100 sites = scarce (10); robin: common (1); firecrest: not reported (8)
    expect(stats.coolest.map((b) => [b.key, b.points, b.tier])).toEqual([
      ['common-kingfisher', 10, 'scarce'], ['x-regulus-ignicapilla', 8, 'unreported'], ['european-robin', 1, 'common'],
    ])
  })

  it('years: newest first, species that year, lifers and outings from the reports', () => {
    expect(stats.years).toEqual([
      { year: 2026, species: 1, lifers: 0, outings: 2 },
      { year: 2025, species: 2, lifers: 2, outings: 1 },
    ])
  })

  it('best outings are the highest totals, at most 5', () => {
    expect(stats.bestOutings[0].date).toBe('2025-05-01') // two lifers plus a first visit
    expect(stats.bestOutings.length).toBeLessThanOrEqual(5)
    const totals = stats.bestOutings.map((r) => r.points.total)
    expect([...totals].sort((a, b) => b - a)).toEqual(totals)
  })

  it('streak comes from the outings; sample use is flagged', () => {
    expect(stats.streak).toEqual({ currentWeeks: 2, bestWeeks: 2 }) // weeks of 5 and 12 Oct
    const withSample = collectionStats([enc({ source: 'sample' })], [], new Map(), rarity, '2026-10-14')
    expect(withSample.sample).toBe(true)
  })

  it('top lists are capped at 10', () => {
    const many: Encounter[] = []
    for (let i = 0; i < 15; i++) many.push(enc({ speciesId: `bird-${String(i).padStart(2, '0')}`, date: `2026-03-${String(i + 1).padStart(2, '0')}` }))
    const s = collectionStats(many, allFieldReports(many, ctx), computeBond(many), rarity, '2026-04-01')
    expect(s.mostSeen).toHaveLength(10)
    expect(s.topBond).toHaveLength(10)
    expect(s.coolest).toHaveLength(10)
    expect(s.totals.species).toBe(15)
  })

  it('works on an empty history', () => {
    const s = collectionStats([], [], new Map(), rarity, '2026-10-14')
    expect(s.totals).toEqual({ sightings: 0, species: 0, dexSpecies: 0, outings: 0, sites: 0 })
    expect(s.years).toEqual([])
    expect(s.streak).toEqual({ currentWeeks: 0, bestWeeks: 0 })
  })
})

describe('exploration (N3)', () => {
  it('visited sites come from logs and imports; demo and sample ids are ignored', () => {
    const v = visitedSiteIds([
      enc({ siteId: 'L100001', source: 'log' }),
      enc({ siteId: 'L100002', source: 'ebird' }),
      enc({ siteId: 'L100001' }),
      enc({ siteId: 'LDEMO01' }),
      enc({ siteId: 'L99000001', source: 'sample' }),
      enc({ siteId: null }),
    ])
    expect([...v].sort()).toEqual(['L100001', 'L100002'])
  })

  const r = region([site('L1'), site('L2'), site('L3'), site('L4'), site('L5'), site('L6'), site('L7'), site('L8')], {
    L1: { status: 'ok', s: 600, m: 1 },
    L2: { status: 'ok', s: 1800, m: 1 },
    L3: { status: 'unknown' },
    L4: { status: 'ok', s: 300, m: 1 },
    L5: { status: 'ok', s: 2400, m: 1 },
    L6: { status: 'ok', s: 1200, m: 1 },
    L7: { status: 'ok', s: 3000, m: 1 },
    // L8 missing entirely
  })

  it('share is explored over all sites in the region', () => {
    const x = exploration(r, new Set(['L1', 'L3', 'L999']), 's')
    expect(x.explored).toEqual(['L1', 'L3'])
    expect(x.total).toBe(8)
    expect(x.share).toBeCloseTo(2 / 8)
  })

  it('nearest unexplored: known drive times only, nearest first, at most five', () => {
    const x = exploration(r, new Set(['L1']), 's')
    expect(x.nearestUnexplored).toEqual([
      { siteId: 'L4', minutes: 5 }, { siteId: 'L6', minutes: 20 }, { siteId: 'L2', minutes: 30 }, { siteId: 'L5', minutes: 40 }, { siteId: 'L7', minutes: 50 },
    ])
    // unknown (L3) and missing (L8) drive times are skipped, never treated as 0
    expect(x.nearestUnexplored.some((s) => s.siteId === 'L3' || s.siteId === 'L8')).toBe(false)
  })

  it('explored sites are not suggested, and an unknown start point gives nothing nearby', () => {
    const x = exploration(r, new Set(['L4', 'L6']), 's')
    expect(x.nearestUnexplored.map((s) => s.siteId)).toEqual(['L1', 'L2', 'L5', 'L7'])
    expect(exploration(r, new Set(), 'nowhere').nearestUnexplored).toEqual([])
  })

  it('an empty region has zero share', () => {
    expect(exploration(region([]), new Set(['L1']), 's')).toEqual({ explored: [], total: 0, share: 0, nearestUnexplored: [] })
  })
})
