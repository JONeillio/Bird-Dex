// P7: how often a bird turns up at a place, and Find a bird sorted by it. Synthetic fixtures only.
import { describe, expect, it } from 'vitest'
import { bestBand, daysReported, reliabilityLabel, strip } from '../src/domain/reliability'
import { whereSeen } from '../src/domain/findBird'
import type { RegionData, Report, Site } from '../src/data/published-schema'

describe('daysReported', () => {
  it('counts the set bits, and is null without history', () => {
    expect(daysReported(undefined)).toBeNull()
    expect(daysReported(0)).toBe(0)
    expect(daysReported(0b1)).toBe(1)
    expect(daysReported(0b10110101)).toBe(5)
    expect(daysReported(16383)).toBe(14)
  })
})

describe('reliabilityLabel', () => {
  it('uses the four bands from the spec', () => {
    expect([1, 2, 4, 5, 8, 9, 14].map((n) => reliabilityLabel(n))).toEqual(['once', 'now and then', 'now and then', 'often', 'often', 'most days', 'most days'])
    expect(reliabilityLabel(0)).toBeNull()
  })
  it('scales for a shorter window but keeps "once" as once', () => {
    expect(reliabilityLabel(1, 7)).toBe('once')
    expect(reliabilityLabel(5, 7)).toBe('most days') // 5 of 7 is about 10 of 14
    expect(reliabilityLabel(2, 7)).toBe('now and then') // about 4 of 14
  })
})

describe('bestBand', () => {
  it('needs a single clear winner with at least half the reports and at least three of them', () => {
    expect(bestBand({ dawn: 6, day: 1, dusk: 1, night: 0 })).toBe('dawn')
    expect(bestBand({ dawn: 2, day: 1, dusk: 0, night: 0 })).toBeNull() // only 3 reports in all, top has 2
    expect(bestBand({ dawn: 3, day: 0, dusk: 0, night: 0 })).toBe('dawn')
    expect(bestBand({ dawn: 3, day: 3, dusk: 0, night: 0 })).toBeNull() // a tie
    expect(bestBand({ dawn: 3, day: 3, dusk: 3, night: 3 })).toBeNull()
    expect(bestBand({ dawn: 4, day: 3, dusk: 3, night: 3 })).toBeNull() // under half
    expect(bestBand(undefined)).toBeNull()
  })
})

describe('strip', () => {
  it('is oldest first, with the most recent day last', () => {
    const s = strip(0b101) // today and two days ago
    expect(s).toHaveLength(14)
    expect(s[13]).toBe(true)
    expect(s[12]).toBe(false)
    expect(s[11]).toBe(true)
    expect(s.filter(Boolean)).toHaveLength(2)
  })
  it('is all false with no history, and shorter for a shorter window', () => {
    expect(strip(undefined).every((c) => !c)).toBe(true)
    expect(strip(0b11, 7)).toEqual([false, false, false, false, false, true, true])
  })
})

const rep = (name: string, obsDate: string, extra: Partial<Report> = {}): Report => ({
  speciesId: 'grey-wagtail', ebirdCode: 'grywag', name, sciName: 'Motacilla cinerea', obsDate, obsTime: null, count: null, checklistUrl: null, reviewed: false, ...extra,
})
const site = (id: string, reports: Report[]): Site => ({ id, name: id, point: [0, 51], url: null, latestObsDate: null, speciesAllTime: null, access: 'unknown', reports })
const region = (sites: Site[]): RegionData => ({
  schema: 1, regionId: 'r', generatedAt: '2026-11-07T06:00:00Z', isDemo: true, windowDays: 14,
  coverage: { hotspotsListed: 0, hotspotsActive: 0, reportsFetchedFor: 0, truncated: false, note: '' },
  sites, drive: { computedAt: null, byStart: { s: { A: { status: 'ok', s: 1800, m: 1 }, B: { status: 'ok', s: 600, m: 1 }, C: { status: 'ok', s: 1200, m: 1 } } } }, unmatchedSpecies: [],
})

describe('whereSeen with history', () => {
  it('puts the places it is reported on most days first, then newest, then nearest', () => {
    const r = region([
      site('A', [rep('Grey Wagtail', '2026-11-05', { days: 0b11111111 })]), // 8 days
      site('B', [rep('Grey Wagtail', '2026-11-06', { days: 0b11 })]), // 2 days, newest, nearer
      site('C', [rep('Grey Wagtail', '2026-11-06', { days: 0b11 })]), // 2 days, newest, further than B
    ])
    const got = whereSeen(r, 's', 'grey-wagtail')
    expect(got.map((x) => x.site.id)).toEqual(['A', 'B', 'C'])
    expect(got.map((x) => x.days)).toEqual([8, 2, 2])
  })
  it('carries the best time of day when it is clear', () => {
    const r = region([site('A', [rep('Grey Wagtail', '2026-11-05', { days: 3, bands: { dawn: 5, day: 0, dusk: 0, night: 0 } })])])
    expect(whereSeen(r, 's', 'grey-wagtail')[0].bestBand).toBe('dawn')
  })
  it('keeps the old order (newest, then nearest) when nothing has history', () => {
    const r = region([site('A', [rep('Grey Wagtail', '2026-11-05')]), site('B', [rep('Grey Wagtail', '2026-11-06')]), site('C', [rep('Grey Wagtail', '2026-11-06')])])
    const got = whereSeen(r, 's', 'grey-wagtail')
    expect(got.map((x) => x.site.id)).toEqual(['B', 'C', 'A'])
    expect(got.every((x) => x.days === null)).toBe(true)
  })
  it('a place with no history sorts after one with history when some do have it', () => {
    const r = region([site('A', [rep('Grey Wagtail', '2026-11-06')]), site('B', [rep('Grey Wagtail', '2026-11-05', { days: 1 })])])
    expect(whereSeen(r, 's', 'grey-wagtail').map((x) => x.site.id)).toEqual(['B', 'A'])
  })
})
