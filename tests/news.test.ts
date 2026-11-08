// P8: Bird News and the sunrise/sunset formula. Synthetic region data only.
import { describe, expect, it } from 'vitest'
import { birdNews } from '../src/domain/news'
import { buildRarity } from '../src/domain/rarity'
import { minutesOfDay, sunTimes } from '../src/domain/sun'
import type { RegionData, Report, Site } from '../src/data/published-schema'

const rep = (speciesId: string | null, name: string, sci: string, obsDate: string, extra: Partial<Report> = {}): Report => ({
  speciesId, ebirdCode: speciesId ?? name.toLowerCase().replace(/\W/g, ''), name, sciName: sci, obsDate, obsTime: null, count: null, checklistUrl: null, reviewed: false, ...extra,
})
const site = (id: string, reports: Report[]): Site => ({ id, name: id, point: [0, 51], url: null, latestObsDate: null, speciesAllTime: null, access: 'unknown', reports })
type D = RegionData['drive']['byStart'][string]
const region = (sites: Site[], drive: D): RegionData => ({
  schema: 1, regionId: 'r', generatedAt: '2026-11-07T06:00:00Z', isDemo: true, windowDays: 14,
  coverage: { hotspotsListed: 0, hotspotsActive: 0, reportsFetchedFor: 0, truncated: false, note: '' },
  sites, drive: { computedAt: null, byStart: { s: drive } }, unmatchedSpecies: [],
})
const ok = (min: number) => ({ status: 'ok' as const, s: min * 60, m: min })

const ROBIN = ['european-robin', 'European Robin', 'Erithacus rubecula'] as const
const WREN = ['eurasian-wren', 'Eurasian Wren', 'Nannus troglodytes'] as const
const KING = ['common-kingfisher', 'Common Kingfisher', 'Alcedo atthis'] as const
const FIRE = [null, 'Common Firecrest', 'Regulus ignicapilla'] as const

// Sixty sites that all report robins (so robins are "common"), plus the interesting ones.
const filler = Array.from({ length: 60 }, (_, i) => site(`F${i}`, [rep(...ROBIN, '2026-11-05')]))
const near = site('NEAR', [rep(...WREN, '2026-11-06'), rep(...KING, '2026-11-06', { days: 0b111, bands: { dawn: 5, day: 1, dusk: 0, night: 0 } })])
const far = site('FAR', [rep(...KING, '2026-11-05', { days: 0b11111111 }), rep(...FIRE, '2026-11-06', { notable: true, unconfirmed: true })])
const lost = site('LOST', [rep(...ROBIN, '2026-11-06')])
const drive: D = { ...Object.fromEntries(filler.map((s) => [s.id, ok(15)])), NEAR: ok(20), FAR: ok(50), LOST: { status: 'unknown' } }
const r = region([...filler, near, far, lost], drive)
const rarity = buildRarity(r)
const base = { region: r, startId: 's', limitMin: 30, recorded: new Set<string>(), targets: [] as string[], rarity, lastSeenAt: null, now: new Date('2026-11-08T12:00:00Z') }

describe('birdNews', () => {
  it('counts new birds within the limit only, and counts places with unknown drive separately', () => {
    expect(birdNews(base).newToYou).toBe(3) // robin, wren, kingfisher (the firecrest is outside the Dex and too far)
    expect(birdNews({ ...base, recorded: new Set(['european-robin', 'eurasian-wren']) }).newToYou).toBe(1)
    expect(birdNews({ ...base, limitMin: 60 }).newToYou).toBe(3)
    expect(birdNews(base).unknownDrive).toBe(1)
    expect(birdNews({ ...base, limitMin: 10 }).newToYou).toBe(0)
  })

  it('lists rare and scarce birds within the limit, newest first, one per bird, flagging unconfirmed ones', () => {
    const inside = birdNews(base)
    expect(inside.rareScarce.map((s) => s.report.name)).toEqual(['Eurasian Wren']) // scarce: 1 site in 63. The kingfisher is at 2 sites (uncommon).
    const wide = birdNews({ ...base, limitMin: 60 })
    const fire = wide.rareScarce.find((s) => s.report.name === 'Common Firecrest')!
    expect(fire.report.unconfirmed).toBe(true)
    expect(wide.rareScarce.map((s) => s.report.name)).toEqual(['Eurasian Wren', 'Common Firecrest']) // same time stamp, so the nearer first
    expect(wide.rareScarce.every((s) => s.report.name !== 'European Robin')).toBe(true)
  })

  it('keeps at most five rare birds', () => {
    const many = Array.from({ length: 8 }, (_, i) => site(`R${i}`, [rep(null, `Rarity ${i}`, `Genus rarus${i}`, `2026-11-0${i + 1}`, { notable: true })]))
    const rr = region([...filler, ...many], { ...drive, ...Object.fromEntries(many.map((s) => [s.id, ok(10)])) })
    const news = birdNews({ ...base, region: rr, rarity: buildRarity(rr) })
    expect(news.rareScarce).toHaveLength(5)
    expect(news.rareScarce[0].report.name).toBe('Rarity 7')
  })

  it('finds each wanted bird at its most reliable place within the limit, with a time-of-day tip', () => {
    const n = birdNews({ ...base, limitMin: 60, targets: ['common-kingfisher'] })
    expect(n.targetsReported).toHaveLength(1)
    expect(n.targetsReported[0].site.id).toBe('FAR') // 8 days beats 3 days, even though it is further
    expect(n.targetsReported[0].tip).toBeNull() // no clear time of day at FAR
    const close = birdNews({ ...base, targets: ['common-kingfisher'] })
    expect(close.targetsReported[0].site.id).toBe('NEAR')
    expect(close.targetsReported[0].tip).toBe('Most Common Kingfisher reports here come at dawn')
  })

  it('leaves out wanted birds you already have, or that are not reported inside the limit', () => {
    expect(birdNews({ ...base, targets: ['common-kingfisher'], recorded: new Set(['common-kingfisher']) }).targetsReported).toEqual([])
    expect(birdNews({ ...base, limitMin: 10, targets: ['common-kingfisher'] }).targetsReported).toEqual([])
  })

  it('counts reports newer than the last look, and none the first time', () => {
    expect(birdNews(base).sinceLastLook).toBe(0)
    // In range: 60 robin reports dated 11-05 (no time), wren and kingfisher at NEAR dated 11-06. Reports without a time only count on a later day.
    expect(birdNews({ ...base, lastSeenAt: '2026-11-05T12:00:00Z' }).sinceLastLook).toBe(2)
    expect(birdNews({ ...base, lastSeenAt: '2026-11-04T12:00:00Z' }).sinceLastLook).toBe(62)
    expect(birdNews({ ...base, lastSeenAt: '2026-11-07T12:00:00Z' }).sinceLastLook).toBe(0)
  })

  it('compares a report that has a time with the exact moment of the last look', () => {
    const timed = region([site('T', [rep(...WREN, '2026-11-06', { obsTime: '09:30' })])], { T: ok(5) })
    const o = { ...base, region: timed, rarity: buildRarity(timed) }
    expect(birdNews({ ...o, lastSeenAt: '2026-11-06T09:00:00Z' }).sinceLastLook).toBe(1)
    expect(birdNews({ ...o, lastSeenAt: '2026-11-06T10:00:00Z' }).sinceLastLook).toBe(0)
  })

  it('has the data generation time', () => {
    expect(birdNews(base).generatedAt).toBe('2026-11-07T06:00:00Z')
  })
})

// Reference values: London sunrise and sunset on the winter and summer solstices, as widely published by almanacs
// (HM Nautical Almanac Office / timeanddate.com): 21 Dec 08:04 and 15:53 GMT, 21 Jun 04:43 and 21:21 BST.
// These were recalled, not fetched (the sandbox had no web access when this was written): re-check against a published almanac.
describe('sunTimes', () => {
  const LONDON: [number, number] = [-0.1276, 51.5072]
  const MANCHESTER: [number, number] = [-2.2426, 53.4808]
  const near = (got: string | null, want: string, tol = 2) => expect(Math.abs(minutesOfDay(got!) - minutesOfDay(want))).toBeLessThanOrEqual(tol)

  it('matches the published London solstice times to within 2 minutes', () => {
    const dec = sunTimes(LONDON, '2026-12-21')
    near(dec.sunrise, '08:04')
    near(dec.sunset, '15:53')
    const jun = sunTimes(LONDON, '2026-06-21')
    near(jun.sunrise, '04:43')
    near(jun.sunset, '21:21')
  })

  it('shows local clock time: British Summer Time in summer, GMT in winter', () => {
    expect(minutesOfDay(sunTimes(LONDON, '2026-07-01').sunrise!)).toBeLessThan(5 * 60) // about 04:50 BST, not 03:50 GMT
    expect(minutesOfDay(sunTimes(LONDON, '2026-07-01').sunset!)).toBeGreaterThan(21 * 60)
  })

  it('Manchester is later than London (further west) and has longer summer and shorter winter days (further north)', () => {
    const len = (s: { sunrise: string | null; sunset: string | null }) => minutesOfDay(s.sunset!) - minutesOfDay(s.sunrise!)
    const [lj, mj, ld, md] = [sunTimes(LONDON, '2026-06-21'), sunTimes(MANCHESTER, '2026-06-21'), sunTimes(LONDON, '2026-12-21'), sunTimes(MANCHESTER, '2026-12-21')]
    expect(minutesOfDay(md.sunset!)).toBeLessThan(minutesOfDay(ld.sunset!) + 1) // a touch earlier at 53.5 N in winter once longitude is allowed for
    expect(len(mj)).toBeGreaterThan(len(lj))
    expect(len(md)).toBeLessThan(len(ld))
    expect(minutesOfDay(sunTimes(MANCHESTER, '2026-03-20').sunset!)).toBeGreaterThan(minutesOfDay(sunTimes(LONDON, '2026-03-20').sunset!)) // west is later
  })

  it('days are about twelve hours at the equinox and null in polar night or midnight sun', () => {
    const e = sunTimes(MANCHESTER, '2026-03-20')
    expect(Math.abs(minutesOfDay(e.sunset!) - minutesOfDay(e.sunrise!) - 12 * 60 - 10)).toBeLessThanOrEqual(15)
    expect(sunTimes([25, 78], '2026-12-21', { timeZone: 'UTC' })).toEqual({ sunrise: null, sunset: null })
    expect(sunTimes([25, 78], '2026-06-21', { timeZone: 'UTC' })).toEqual({ sunrise: null, sunset: null })
  })

  it('gives null for a date it cannot read', () => {
    expect(sunTimes(LONDON, 'tomorrow')).toEqual({ sunrise: null, sunset: null })
  })
})
