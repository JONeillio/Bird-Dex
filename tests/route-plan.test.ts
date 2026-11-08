import { describe, expect, it } from 'vitest'
import { planDay, wantedBirds } from '../src/domain/routePlan'
import type { RegionData, Report, Site } from '../src/data/published-schema'

const rep = (speciesId: string | null, code = `x${speciesId}`): Report => ({
  speciesId, ebirdCode: code, name: speciesId ?? 'other', sciName: 'Fakeus fakeus', obsDate: '2026-11-01', obsTime: null, count: null, checklistUrl: null, reviewed: false,
})
const site = (id: string, birds: Array<string | null>): Site => ({
  id, name: id, point: [-2.3, 53.4], url: null, latestObsDate: null, speciesAllTime: null, access: 'unknown', reports: birds.map((b) => rep(b)),
})
type Entry = RegionData['drive']['byStart'][string][string]
const ok = (minutes: number): Entry => ({ status: 'ok', s: minutes * 60, m: minutes })

// a: 10 min from the start, b: 10 min, c: 30 min. a-b 5 min apart, a-c and b-c 15.
const base = (over: Partial<RegionData> = {}, sites?: Site[]): RegionData => ({
  schema: 1, regionId: 'r', generatedAt: '2026-11-07T06:00:00Z', isDemo: true, windowDays: 14,
  coverage: { hotspotsListed: 0, hotspotsActive: 0, reportsFetchedFor: 0, truncated: false, note: '' },
  sites: sites ?? [site('a', ['r1', 'r2', 'r3']), site('b', ['r4', 'r5']), site('c', ['kingfisher'])],
  drive: { computedAt: null, byStart: { s: { a: ok(10), b: ok(10), c: ok(30) } } },
  unmatchedSpecies: [],
  between: { ids: ['a', 'b', 'c'], s: [[0, 300, 900], [300, 0, 900], [900, 900, 0]] },
  ...over,
})
const o = { startId: 's', recorded: new Set<string>(), wanted: 'new' as const, budgetMin: 120 }

describe('planDay', () => {
  it('chains two sites to cover more than the best single site, and counts the drive home', () => {
    const p = planDay(base(), o)
    expect(p.stops.map((s) => s.site.id)).toEqual(['a', 'b'])
    expect(p.stops[0].arriveMin).toBe(10)
    expect(p.stops[1].arriveMin).toBe(10 + 40 + 5)
    expect(p.stops.flatMap((s) => s.birds)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5'])
    expect(p.returnMin).toBe(10)
    expect(p.totalMin).toBe(55 + 40 + 10)
    expect(p.uncovered).toEqual(['kingfisher'])
  })

  it('never goes over the budget (the drive home included)', () => {
    const p = planDay(base(), { ...o, budgetMin: 90 })
    expect(p.stops.map((s) => s.site.id)).toEqual(['a'])
    expect(p.totalMin).toBe(60)
    for (const budgetMin of [30, 60, 90, 105, 120, 200]) {
      const q = planDay(base(), { ...o, budgetMin })
      expect(q.totalMin).toBeLessThanOrEqual(budgetMin)
    }
    expect(planDay(base(), { ...o, budgetMin: 105 }).stops).toHaveLength(2)
    expect(planDay(base(), { ...o, budgetMin: 104 }).stops).toHaveLength(1)
  })

  it('skips sites whose drive time is unknown, never treating them as 0', () => {
    const unknownStart = base({ drive: { computedAt: null, byStart: { s: { a: { status: 'unknown' }, b: ok(10), c: ok(30) } } } })
    expect(planDay(unknownStart, o).stops.map((s) => s.site.id)).not.toContain('a')
    const unknownLeg = base({ between: { ids: ['a', 'b', 'c'], s: [[0, null, null], [null, 0, 900], [null, 900, 0]] } })
    expect(planDay(unknownLeg, o).stops.map((s) => s.site.id)).toEqual(['a'])
    const missing = base({ drive: { computedAt: null, byStart: { s: { a: ok(10), b: ok(10) } } } })
    expect(planDay(missing, o).stops.map((s) => s.site.id)).not.toContain('c')
  })

  it('puts the wanted birds first: a target only at a far site still gets planned', () => {
    const p = planDay(base(), { ...o, wanted: ['kingfisher'] })
    expect(p.stops.map((s) => s.site.id)).toEqual(['c'])
    expect(p.stops[0].birds).toEqual(['kingfisher'])
    expect(p.uncovered).toEqual([])
    expect(p.totalMin).toBe(30 + 40 + 30)
  })

  it('"new" leaves out birds you have recorded', () => {
    const p = planDay(base(), { ...o, recorded: new Set(['r1', 'r2', 'r3']) })
    expect(p.stops[0].site.id).toBe('b')
    expect(wantedBirds(base(), 'new', new Set(['r1']))).toEqual(new Set(['r2', 'r3', 'r4', 'r5', 'kingfisher']))
  })

  it('returns an empty plan when nothing is reachable, nothing is wanted or there is no site-to-site data', () => {
    const none = planDay(base(), { ...o, budgetMin: 40 })
    expect(none).toEqual({ stops: [], totalMin: 0, returnMin: 0, uncovered: ['kingfisher', 'r1', 'r2', 'r3', 'r4', 'r5'] })
    expect(planDay(base({ between: undefined }), o).stops).toEqual([])
    expect(planDay(base(), { ...o, wanted: [] }).stops).toEqual([])
    expect(planDay(base(), { ...o, startId: 'nowhere' }).stops).toEqual([])
    expect(planDay(base(), { ...o, recorded: new Set(['r1', 'r2', 'r3', 'r4', 'r5', 'kingfisher']) }).stops).toEqual([])
  })

  it('respects maxStops and stopMin', () => {
    expect(planDay(base(), { ...o, maxStops: 1 }).stops).toHaveLength(1)
    expect(planDay(base(), { ...o, maxStops: 0 }).stops).toHaveLength(0)
    expect(planDay(base(), { ...o, budgetMin: 70 }).stops).toHaveLength(1)
    expect(planDay(base(), { ...o, budgetMin: 70, stopMin: 10 }).stops).toHaveLength(2)
  })

  it('does not repeat a bird or a site', () => {
    const dup = base({}, [site('a', ['r1', 'r2']), site('b', ['r2', 'r3']), site('c', ['r1'])])
    const p = planDay(dup, o)
    const all = p.stops.flatMap((s) => s.birds)
    expect(new Set(all).size).toBe(all.length)
    expect(new Set(p.stops.map((s) => s.site.id)).size).toBe(p.stops.length)
    expect(p.stops.map((s) => s.site.id)).not.toContain('c')
  })

  it('breaks ties by more birds, then shorter drive, then site id; the same input gives the same plan', () => {
    const twins = base({}, [site('a', ['r1']), site('b', ['r2']), site('c', [])])
    expect(planDay(twins, { ...o, maxStops: 1 }).stops[0].site.id).toBe('a')
    expect(planDay(base(), o)).toEqual(planDay(base(), o))
  })

  it('handles birds outside the Dex by their eBird code', () => {
    const r = base({}, [{ ...site('a', []), reports: [rep(null, 'wilsni1')] }, site('b', ['r4']), site('c', [])])
    expect(planDay(r, { ...o, wanted: ['ebird:wilsni1'] }).stops.map((s) => s.site.id)).toEqual(['a'])
    // "new" only looks for Starter Dex birds
    expect(planDay(r, o).stops.map((s) => s.site.id)).toEqual(['b'])
  })
})
