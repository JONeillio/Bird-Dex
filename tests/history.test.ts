// Synthetic data only: invented ids (LTEST…) and species codes, never real eBird data.
import { describe, expect, it } from 'vitest'
import { HISTORY_FILE, KEEP_DAYS, MAX_TIMES, bandCounts, countDays, daysAgo, daysMask, emptyHistory, historyStats, isPublishable, mergeHistory, parseHistory, withHistory } from '../pipeline/history'
import { RegionSchema, ReportSchema, type Report, type Site } from '../src/data/published-schema'

const report = (code: string, obsDate: string, obsTime: string | null = null, extra: Partial<Report> = {}): Report => ({
  speciesId: null, ebirdCode: code, name: code, sciName: `${code} sp`, obsDate, obsTime, count: null, checklistUrl: null, reviewed: false, ...extra,
})
const site = (id: string, reports: Report[]): Site => ({ id, name: id, point: [-2.3, 53.4], url: null, latestObsDate: null, speciesAllTime: null, access: 'unknown', reports })

describe('report history merge', () => {
  it('adds a new date once, and merging the same data twice changes nothing', () => {
    const sites = [site('LTEST1', [report('robin1', '2026-11-08', '07:30')])]
    const a = mergeHistory(null, sites, '2026-11-08')
    const b = mergeHistory(a, sites, '2026-11-08')
    expect(a.sites.LTEST1.robin1).toEqual({ d: ['2026-11-08'], t: ['07:30'] })
    expect(b).toEqual(a)
    expect(a.since).toBe('2026-11-08')
  })
  it('keeps dates newest first and times with them, and keeps `since` from the first run', () => {
    const h1 = mergeHistory(null, [site('LTEST1', [report('robin1', '2026-11-07', '16:10')])], '2026-11-07')
    const h2 = mergeHistory(h1, [site('LTEST1', [report('robin1', '2026-11-08', '07:30')])], '2026-11-08')
    expect(h2.sites.LTEST1.robin1).toEqual({ d: ['2026-11-08', '2026-11-07'], t: ['07:30', '16:10'] })
    expect(h2.since).toBe('2026-11-07')
  })
  it('puts a late-arriving older date behind the newer ones', () => {
    const h1 = mergeHistory(null, [site('LTEST1', [report('robin1', '2026-11-08', '07:30')])], '2026-11-08')
    const h2 = mergeHistory(h1, [site('LTEST1', [report('robin1', '2026-11-06', '12:00')])], '2026-11-08')
    expect(h2.sites.LTEST1.robin1).toEqual({ d: ['2026-11-08', '2026-11-06'], t: ['07:30', '12:00'] })
  })
  it('keeps at most 30 days and 20 times, and drops older dates', () => {
    let h = emptyHistory('2026-09-01')
    for (let i = 0; i < 45; i++) {
      const day = new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10)
      h = mergeHistory(h, [site('LTEST1', [report('robin1', day, '08:00')])], day)
    }
    const e = h.sites.LTEST1.robin1
    expect(e.d.length).toBe(KEEP_DAYS)
    expect(e.d[0]).toBe('2026-10-15')
    expect(e.d.at(-1)).toBe('2026-09-16') // 29 days before the newest
    expect(e.t.length).toBe(MAX_TIMES)
  })
  it('ignores unconfirmed records, future dates and records already too old', () => {
    const h = mergeHistory(null, [site('LTEST1', [
      report('rare1', '2026-11-08', '07:00', { unconfirmed: true }),
      report('odd1', '2026-12-25'),
      report('old1', '2026-08-01'),
    ])], '2026-11-08')
    expect(h.sites).toEqual({})
  })
  it('drops a site that is no longer listed, and never keeps a time without a date', () => {
    const h1 = mergeHistory(null, [site('LTEST1', [report('a1', '2026-11-08', '07:00')]), site('LTEST2', [report('b1', '2026-11-08', '08:00')])], '2026-11-08')
    const h2 = mergeHistory(h1, [site('LTEST2', [report('b1', '2026-11-08', '08:00')])], '2026-11-09')
    expect(Object.keys(h2.sites)).toEqual(['LTEST2'])
    expect(historyStats(h2)).toEqual({ sites: 1, pairs: 1 })
  })
  it('a site that appears twice (two regions) is merged once', () => {
    const h = mergeHistory(null, [site('LTEST1', [report('a1', '2026-11-08', '07:00')]), site('LTEST1', [report('b1', '2026-11-07', null)])], '2026-11-08')
    expect(Object.keys(h.sites.LTEST1).sort()).toEqual(['a1', 'b1'])
    expect(h.sites.LTEST1.b1.t).toEqual([])
  })
})

describe('days bitmask', () => {
  it('counts days back from the generated date, bit 0 = that day', () => {
    expect(daysMask(['2026-11-08'], '2026-11-08', 14)).toBe(1)
    expect(daysMask(['2026-11-08', '2026-11-07', '2026-11-05'], '2026-11-08', 14)).toBe(0b1011) // days 0, 1 and 3 back
    expect(daysMask(['2026-10-26'], '2026-11-08', 14)).toBe(1 << 13)
  })
  it('works across a month and a year boundary', () => {
    expect(daysAgo('2026-03-01', '2026-02-28')).toBe(1)
    expect(daysMask(['2026-02-27', '2026-03-01'], '2026-03-01', 14)).toBe(0b101)
    expect(daysMask(['2025-12-31', '2026-01-02'], '2026-01-02', 14)).toBe(0b101) // two days apart
  })
  it('leaves out days outside the window, and treats tomorrow (UTC slack) as today', () => {
    expect(daysMask(['2026-10-25'], '2026-11-08', 14)).toBe(0) // 14 days ago is outside bits 0-13
    expect(daysMask(['2026-11-09'], '2026-11-08', 14)).toBe(1)
    expect(daysMask(['2026-11-10'], '2026-11-08', 14)).toBe(0)
  })
  it('never exceeds 14 bits, even with a longer window', () => {
    expect(daysMask(['2026-10-01'], '2026-11-08', 40)).toBe(0)
    expect(daysMask(['2026-10-26'], '2026-11-08', 40)).toBeLessThanOrEqual(16383)
  })
  it('counts set days', () => {
    expect(countDays(0)).toBe(0)
    expect(countDays(0b1010101)).toBe(4)
    expect(countDays(16383)).toBe(14)
  })
})

describe('time bands', () => {
  it('counts times by part of the day and ignores nothing it cannot band', () => {
    expect(bandCounts(['05:30', '08:59', '09:00', '16:59', '17:00', '20:59', '21:00', '03:59'])).toEqual({ dawn: 2, day: 2, dusk: 2, night: 2 })
    expect(bandCounts([])).toEqual({ dawn: 0, day: 0, dusk: 0, night: 0 })
  })
})

describe('publishing the history', () => {
  it('adds days and bands to reports, leaves unconfirmed ones alone, and the result still validates', () => {
    const sites = [site('LTEST1', [report('robin1', '2026-11-08', '07:30'), report('rare1', '2026-11-08', null, { unconfirmed: true, notable: true })])]
    const h = mergeHistory(null, sites, '2026-11-08')
    const out = withHistory(sites, h, '2026-11-08', 14)
    expect(out[0].reports[0].days).toBe(1)
    expect(out[0].reports[0].bands).toEqual({ dawn: 1, day: 0, dusk: 0, night: 0 })
    expect(out[0].reports[1].days).toBeUndefined()
    out[0].reports.forEach((r) => expect(ReportSchema.safeParse(r).success).toBe(true))
  })
  it('omits bands when no time is known', () => {
    const sites = [site('LTEST1', [report('wren1', '2026-11-08', null)])]
    const out = withHistory(sites, mergeHistory(null, sites, '2026-11-08'), '2026-11-08', 14)
    expect(out[0].reports[0].days).toBe(1)
    expect(out[0].reports[0].bands).toBeUndefined()
  })
  it('the history file is never copied into the site', () => {
    expect(isPublishable(`.cache/bq-data/${HISTORY_FILE}`)).toBe(false)
    expect(isPublishable('.cache/bq-data/region/location-1.json')).toBe(true)
    expect(isPublishable('.cache/bq-data/index.json')).toBe(true)
  })
  it('a damaged history file is ignored, not trusted', () => {
    expect(parseHistory('not json')).toBeNull()
    expect(parseHistory('{"schema":2}')).toBeNull()
    expect(parseHistory(JSON.stringify(emptyHistory('2026-11-08')))).not.toBeNull()
  })
  it('region files with and without the new fields both validate', () => {
    const base = {
      schema: 1, regionId: 'r', generatedAt: '2026-11-08T10:00:00Z', isDemo: false, windowDays: 14,
      coverage: { hotspotsListed: 1, hotspotsActive: 1, reportsFetchedFor: 1, truncated: false, note: 'x' },
      sites: [site('LTEST1', [report('robin1', '2026-11-08', '07:30', { days: 3, bands: { dawn: 1, day: 0, dusk: 0, night: 0 } })])],
      drive: { computedAt: null, byStart: {} }, unmatchedSpecies: [],
    }
    expect(RegionSchema.safeParse(base).success).toBe(true)
    expect(RegionSchema.safeParse({ ...base, historySince: '2026-11-08' }).success).toBe(true)
    expect(RegionSchema.safeParse({ ...base, sites: [site('LTEST1', [report('robin1', '2026-11-08')])] }).success).toBe(true)
    expect(RegionSchema.safeParse({ ...base, sites: [site('LTEST1', [report('robin1', '2026-11-08', null, { days: 16384 })])] }).success).toBe(false)
  })
})
