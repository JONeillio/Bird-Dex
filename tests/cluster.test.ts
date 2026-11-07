import { describe, expect, it } from 'vitest'
import { clusterByOverlap } from '../src/domain/cluster'
import { fullDesignation, shortSiteName } from '../src/domain/siteName'
import { recentBirds, reportedCount, uniqueNewCount, type SiteView } from '../src/domain/ranking'
import type { Report, Site } from '../src/data/published-schema'

const it_ = (id: string, x: number, y: number) => ({ id, x, y })

describe('clusterByOverlap', () => {
  it('leaves well separated markers alone', () => {
    const c = clusterByOverlap([it_('a', 0, 0), it_('b', 100, 0), it_('c', 0, 100)])
    expect(c.map((g) => g.ids)).toEqual([['a'], ['b'], ['c']])
  })

  it('groups markers that would overlap and keeps members best-first', () => {
    const c = clusterByOverlap([it_('best', 100, 100), it_('far', 400, 400), it_('near', 112, 108)])
    expect(c.map((g) => g.ids)).toEqual([['best', 'near'], ['far']])
    expect(c[0].x).toBeCloseTo(106)
    expect(c[0].y).toBeCloseTo(104)
  })

  it('collapses a chain of overlapping markers into one group', () => {
    const chain = Array.from({ length: 4 }, (_, i) => it_(`s${i}`, i * 25, 0))
    const c = clusterByOverlap(chain)
    expect(c).toHaveLength(1)
    expect(c[0].ids).toEqual(['s0', 's1', 's2', 's3'])
  })

  it('keeps two groups apart once their wider markers no longer overlap', () => {
    const row = Array.from({ length: 12 }, (_, i) => it_(`s${i}`, i * 25, 0))
    const c = clusterByOverlap(row)
    expect(c.length).toBeGreaterThan(1)
    for (let i = 0; i < c.length; i++)
      for (let j = i + 1; j < c.length; j++) expect(Math.abs(c[i].x - c[j].x)).toBeGreaterThanOrEqual(((c[i].ids.length > 1 ? 92 : 32) + (c[j].ids.length > 1 ? 92 : 32)) / 2)
  })

  it('treats a "5 spots" marker as wider than a single pin and merges a neighbour it would cover', () => {
    // Two overlapping pins form a group centred at x=10. A third pin 50px away does not overlap a single pin,
    // but it would sit under the wider group marker, so it joins.
    const c = clusterByOverlap([it_('a', 0, 0), it_('b', 20, 0), it_('c', 60, 0)])
    expect(c).toHaveLength(1)
  })

  it('uses a larger footprint for an item that is bigger than an ordinary pin (the selected marker)', () => {
    const plain = clusterByOverlap([it_('a', 0, 0), it_('b', 40, 0)])
    expect(plain).toHaveLength(2)
    const withSelected = clusterByOverlap([{ id: 'a', x: 0, y: 0, w: 64, h: 76 }, it_('b', 40, 0)])
    expect(withSelected).toHaveLength(1)
  })

  it('stacks identical positions and adapts to density: spreading the points apart (zooming in) splits them', () => {
    const tight = clusterByOverlap([it_('a', 50, 50), it_('b', 50, 50), it_('c', 50, 50)])
    expect(tight).toHaveLength(1)
    const zoomed = clusterByOverlap([it_('a', 50, 50), it_('b', 250, 50), it_('c', 50, 250)])
    expect(zoomed).toHaveLength(3)
  })

  it('is deterministic and handles empty input', () => {
    const pts = [it_('a', 0, 0), it_('b', 10, 5), it_('c', 300, 300), it_('d', 305, 310)]
    expect(clusterByOverlap(pts)).toEqual(clusterByOverlap([...pts]))
    expect(clusterByOverlap([])).toEqual([])
  })
})

describe('shortSiteName', () => {
  it.each([
    ['Rainham Marshes RSPB Reserve', 'Rainham Marshes'],
    ['RSPB Rainham Marshes', 'Rainham Marshes'],
    ['Pennington Flash CP (Lancashire)', 'Pennington Flash'],
    ['Carr Mill Dam, St. Helens', 'Carr Mill Dam'],
    ['Dunham Massey Local Nature Reserve', 'Dunham Massey'],
    ['WWT Martin Mere', 'Martin Mere'],
    ['Sale Water Park', 'Sale Water Park'],
  ])('%s -> %s', (full, short) => expect(shortSiteName(full)).toBe(short))

  it('never strips a name down to nothing', () => {
    expect(shortSiteName('RSPB Reserve')).toBe('RSPB Reserve')
    expect(shortSiteName('CP')).toBe('CP')
  })

  it('caps very long names at a word boundary', () => {
    const s = shortSiteName('Mersey Valley Chorlton Water Park Wildlife Area And Meadows')
    expect(s.length).toBeLessThanOrEqual(29)
    expect(s.endsWith('…')).toBe(true)
  })

  it('offers the full name for the details only when it says more', () => {
    expect(fullDesignation('Rainham Marshes RSPB Reserve')).toBe('Rainham Marshes RSPB Reserve')
    expect(fullDesignation('Sale Water Park')).toBeNull()
  })
})

const rep = (speciesId: string | null, obsDate: string): Report => ({
  speciesId, ebirdCode: `x${speciesId}${obsDate}`, name: speciesId ?? 'other', sciName: 'Fakeus fakeus', obsDate, obsTime: null, count: null, checklistUrl: null, reviewed: false,
})
const site = (id: string, reports: Report[]): Site => ({ id, name: id, point: [-2.3, 53.4], url: null, latestObsDate: null, speciesAllTime: null, access: 'unknown', reports })
const view = (s: Site, newIds: string[]): SiteView => ({ site: s, minutes: 10, newIds, newest: null, lure: null })

describe('counts and the collection strip', () => {
  it('orders the strip new-to-you first, then newest first, one entry per species, Dex birds only', () => {
    const s = site('a', [rep('robin', '2026-11-06'), rep('heron', '2026-11-02'), rep('wren', '2026-11-05'), rep(null, '2026-11-07'), rep('robin', '2026-11-01')])
    const chips = recentBirds(s, new Set(['robin']))
    expect(chips.map((c) => c.speciesId)).toEqual(['wren', 'heron', 'robin'])
    expect(chips.map((c) => c.isNew)).toEqual([true, true, false])
  })

  it('counts distinct species per site, ignoring birds outside the Starter Dex', () => {
    expect(reportedCount(site('a', [rep('robin', '2026-11-06'), rep('robin', '2026-11-05'), rep(null, '2026-11-06'), rep('wren', '2026-11-06')]))).toBe(2)
  })

  it('removes duplicates when totalling species across sites', () => {
    const a = view(site('a', []), ['robin', 'wren', 'heron'])
    const b = view(site('b', []), ['wren', 'heron', 'kestrel'])
    expect(uniqueNewCount([a, b])).toBe(4) // not 6
    expect(uniqueNewCount([])).toBe(0)
  })
})
