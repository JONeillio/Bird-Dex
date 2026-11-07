import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { ageLabel, chooseLure, daysAgo, driveMinutes, filterSites, rankSites, scarcity, type SiteView } from '../src/domain/ranking'
import { IndexSchema, RegionSchema, type RegionData, type Report, type Site } from '../src/data/published-schema'

const rep = (speciesId: string | null, obsDate: string): Report => ({
  speciesId, ebirdCode: `x${speciesId}`, name: speciesId ?? 'other', sciName: 'Fakeus fakeus', obsDate, obsTime: null, count: null, checklistUrl: null, reviewed: false,
})
const site = (id: string, reports: Report[]): Site => ({
  id, name: id, point: [-2.3, 53.4], url: null, latestObsDate: null, speciesAllTime: null, access: 'unknown', reports,
})
const region = (sites: Site[], drive: RegionData['drive']['byStart'][string]): RegionData => ({
  schema: 1, regionId: 'r', generatedAt: '2026-11-07T06:00:00Z', isDemo: true, windowDays: 14,
  coverage: { hotspotsListed: 0, hotspotsActive: 0, reportsFetchedFor: 0, truncated: false, note: '' },
  sites, drive: { computedAt: null, byStart: { s: drive } }, unmatchedSpecies: [],
})
const opts = { startId: 's', limitMin: 60, recorded: new Set<string>(), targets: [], newOnly: true, focusSpeciesId: null }

describe('drive filter', () => {
  it('rounds seconds up to whole minutes and never turns unknown into 0', () => {
    expect(driveMinutes({ status: 'ok', s: 61, m: 1 })).toBe(2)
    expect(driveMinutes({ status: 'ok', s: 0, m: 0 })).toBe(1)
    expect(driveMinutes({ status: 'unknown' })).toBeNull()
    expect(driveMinutes(undefined)).toBeNull()
  })
  it('keeps the limit boundary, excludes over-limit, counts unknown separately', () => {
    const r = region([site('a', [rep('robin', '2026-11-01')]), site('b', [rep('robin', '2026-11-01')]), site('c', [rep('robin', '2026-11-01')]), site('d', [rep('robin', '2026-11-01')])], {
      a: { status: 'ok', s: 3600, m: 1 }, b: { status: 'ok', s: 3601, m: 1 }, c: { status: 'unknown' },
    })
    const f = filterSites(r, opts)
    expect(f.shown.map((v) => v.site.id)).toEqual(['a'])
    expect(f.unknownDrive).toBe(2)
  })
  it('new-only hides sites with nothing new, unless a species is in focus', () => {
    const r = region([site('a', [rep('robin', '2026-11-01')])], { a: { status: 'ok', s: 60, m: 1 } })
    expect(filterSites(r, { ...opts, recorded: new Set(['robin']) }).shown).toHaveLength(0)
    expect(filterSites(r, { ...opts, recorded: new Set(['robin']), focusSpeciesId: 'robin' }).shown).toHaveLength(1)
    expect(filterSites(r, { ...opts, focusSpeciesId: 'heron' }).shown).toHaveLength(0)
  })
})

describe('quest ranking', () => {
  const v = (id: string, n: number, newest: string, minutes: number): SiteView => ({
    site: site(id, []), minutes, newIds: Array.from({ length: n }, (_, i) => `s${i}`), newest, lure: null,
  })
  it('orders by new birds, then newest report, then shortest drive', () => {
    const out = rankSites([v('a', 2, '2026-11-01', 10), v('b', 3, '2026-10-30', 50), v('c', 2, '2026-11-03', 40), v('d', 2, '2026-11-03', 20)])
    expect(out.map((x) => x.site.id)).toEqual(['b', 'd', 'c', 'a'])
  })
  it('puts sites with a target first', () => {
    const t = { ...v('t', 1, '2026-10-01', 80), site: site('t', [rep('kingfisher', '2026-10-01')]) }
    expect(rankSites([v('a', 5, '2026-11-01', 10), t], ['kingfisher'])[0].site.id).toBe('t')
  })
  it('lure: target first, else the scarcest unrecorded bird', () => {
    const r = region([site('a', [rep('robin', '2026-11-05'), rep('kingfisher', '2026-11-01')]), site('b', [rep('robin', '2026-11-02')])], {})
    const sc = scarcity(r)
    expect(chooseLure(r.sites[0], new Set(), [], sc)?.speciesId).toBe('kingfisher')
    expect(chooseLure(r.sites[0], new Set(), ['robin'], sc)?.speciesId).toBe('robin')
    expect(chooseLure(r.sites[0], new Set(['kingfisher']), [], sc)?.speciesId).toBe('robin')
  })
})

describe('labels', () => {
  const now = new Date(2026, 10, 7, 12)
  it('says today, yesterday, n days ago', () => {
    expect(daysAgo('2026-11-07', now)).toBe('today')
    expect(daysAgo('2026-11-06', now)).toBe('yesterday')
    expect(daysAgo('2026-11-01', now)).toBe('6 days ago')
  })
  it('ages timestamps', () => {
    expect(ageLabel(new Date(now.getTime() - 3 * 3600_000).toISOString(), now)).toBe('3 h ago')
  })
})

describe('demo data', () => {
  it('validates, is labelled demo, uses fake ids and UK [lng, lat] points', () => {
    const idx = IndexSchema.parse(JSON.parse(readFileSync('public/demo/data/index.json', 'utf8')))
    expect(idx.isDemo).toBe(true)
    for (const ref of idx.regions) {
      const r = RegionSchema.parse(JSON.parse(readFileSync(`public/demo/data/${ref.file}`, 'utf8')))
      expect(r.isDemo).toBe(true)
      for (const s of r.sites) {
        expect(s.id).toMatch(/^LDEMO\d+$/)
        expect(s.point[0]).toBeGreaterThan(-9)
        expect(s.point[0]).toBeLessThan(2)
        expect(s.point[1]).toBeGreaterThan(49)
        expect(s.point[1]).toBeLessThan(61)
      }
    }
  })
})
