// Synthetic fixtures only: invented ids (LTEST…, STEST…), never real eBird data.
import { describe, expect, it } from 'vitest'
import { birdIndex, birdKey, limitFor, nameForKey, rarities, searchBirds, whereSeen } from '../src/domain/findBird'
import { filterSites } from '../src/domain/ranking'
import { mergeNotable } from '../pipeline/build'
import { RegionSchema, type RegionData, type Report, type Site } from '../src/data/published-schema'

const rep = (speciesId: string | null, code: string, name: string, obsDate: string, extra: Partial<Report> = {}): Report => ({
  speciesId, ebirdCode: code, name, sciName: `${name} sci`, obsDate, obsTime: null, count: null, checklistUrl: null, reviewed: false, ...extra,
})
const site = (id: string, reports: Report[]): Site => ({
  id, name: id, point: [0.17, 51.47], url: null, latestObsDate: null, speciesAllTime: null, access: 'unknown', reports,
})
const region = (sites: Site[], drive: RegionData['drive']['byStart'][string]): RegionData => ({
  schema: 1, regionId: 'r', generatedAt: '2026-11-07T06:00:00Z', isDemo: true, windowDays: 14,
  coverage: { hotspotsListed: 0, hotspotsActive: 0, reportsFetchedFor: 0, truncated: false, note: '' },
  sites, drive: { computedAt: null, byStart: { s: drive } }, unmatchedSpecies: [],
})

const r = region(
  [
    site('LTEST1', [rep('grey-wagtail', 'grywag', 'Grey Wagtail', '2026-11-05'), rep(null, 'firecr1', 'Firecrest', '2026-11-01')]),
    site('LTEST2', [rep('grey-wagtail', 'grywag', 'Grey Wagtail', '2026-11-06'), rep(null, 'firecr1', 'Firecrest', '2026-11-06', { notable: true, unconfirmed: true })]),
    site('LTEST3', [rep(null, 'firecr1', 'Firecrest', '2026-11-06')]),
  ],
  { LTEST1: { status: 'ok', s: 600, m: 1 }, LTEST2: { status: 'ok', s: 4000, m: 1 }, LTEST3: { status: 'unknown' } },
)

describe('find a bird', () => {
  it('keys Dex birds by id and other birds by eBird code', () => {
    expect(birdKey({ speciesId: 'grey-wagtail', ebirdCode: 'grywag' })).toBe('grey-wagtail')
    expect(birdKey({ speciesId: null, ebirdCode: 'firecr1' })).toBe('ebird:firecr1')
  })
  it('indexes every bird once with site count, latest date, nearest known drive and rarity', () => {
    const fc = birdIndex(r, 's').find((h) => h.key === 'ebird:firecr1')!
    expect(fc).toMatchObject({ sites: 3, latest: '2026-11-06', nearestMin: 10, notable: true })
  })
  it('matches word starts in any order of names, case-insensitively', () => {
    const idx = birdIndex(r, 's')
    expect(searchBirds(idx, 'FIRE').map((h) => h.key)).toEqual(['ebird:firecr1'])
    expect(searchBirds(idx, 'gr wag').map((h) => h.key)).toEqual(['grey-wagtail'])
    expect(searchBirds(idx, 'wagtail').map((h) => h.key)).toEqual(['grey-wagtail'])
    expect(searchBirds(idx, 'agtail')).toEqual([])
    expect(searchBirds(idx, '  ')).toEqual([])
  })
  it('lists where a bird was seen, newest first, then nearest, unknown drive last', () => {
    expect(whereSeen(r, 's', 'ebird:firecr1').map((x) => [x.site.id, x.minutes])).toEqual([
      ['LTEST2', 67],
      ['LTEST3', null],
      ['LTEST1', 10],
    ])
  })
  it('lists only flagged rarities', () => {
    expect(rarities(r, 's').map((x) => x.site.id)).toEqual(['LTEST2'])
  })
  it('finds a name for a key and the smallest limit chip that fits', () => {
    expect(nameForKey(r, 'ebird:firecr1')).toBe('Firecrest')
    expect(nameForKey(r, 'ebird:nope')).toBeNull()
    expect([limitFor(10), limitFor(31), limitFor(90), limitFor(91), limitFor(null)]).toEqual([30, 60, 90, null, null])
  })
  it('the map can focus on a bird outside the Dex and counts sites beyond the limit', () => {
    const f = filterSites(r, { startId: 's', limitMin: 60, recorded: new Set(), targets: [], newOnly: true, focusSpeciesId: 'ebird:firecr1' })
    expect(f.shown.map((v) => v.site.id)).toEqual(['LTEST1'])
    expect(f.shown[0].lure?.ebirdCode).toBe('firecr1')
    expect(f.beyondLimit).toBe(1)
    const wide = filterSites(r, { startId: 's', limitMin: 90, recorded: new Set(), targets: [], newOnly: true, focusSpeciesId: 'ebird:firecr1' })
    expect(wide.shown.map((v) => v.site.id)).toEqual(['LTEST2', 'LTEST1']) // newest report of that bird first
    expect(f.unknownDrive).toBe(1)
  })
})

describe('rarities from eBird notable records', () => {
  const dex = new Map([['Regulus ignicapilla', 'firecrest']])
  const base = [site('LTEST1', [rep(null, 'gloibi', 'Glossy Ibis', '2026-11-04')])]
  const raw = [
    // At a listed site, newer than the ordinary record and still awaiting review.
    { speciesCode: 'gloibi', comName: 'Glossy Ibis', sciName: 'Plegadis falcinellus', obsDt: '2026-11-06 10:00', obsValid: false, obsReviewed: false, locId: 'LTEST1', locName: 'Test Marsh', lat: 51.5, lng: 0.2, locationPrivate: false, subId: 'S900000001' },
    // At a hotspot we don't list: added as a new site.
    { speciesCode: 'firecr1', comName: 'Firecrest', sciName: 'Regulus ignicapilla', obsDt: '2026-11-05', obsValid: true, locId: 'LTEST9', locName: 'Test Wood', lat: 51.4, lng: 0.1, locationPrivate: false },
    // A private location (could be a garden): never published.
    { speciesCode: 'waxwin', comName: 'Waxwing', sciName: 'Bombycilla garrulus', obsDt: '2026-11-06', obsValid: true, locId: 'LTEST7', locName: 'Someone’s garden', lat: 51.4, lng: 0.1, locationPrivate: true },
  ]
  const out = mergeNotable(base, raw, dex, 30)

  it('marks rarities at listed sites, keeping unconfirmed records labelled', () => {
    const ibis = out.sites[0].reports.find((x) => x.ebirdCode === 'gloibi')!
    expect(ibis).toMatchObject({ obsDate: '2026-11-06', notable: true, unconfirmed: true, checklistUrl: 'https://ebird.org/checklist/S900000001' })
  })
  it('adds public hotspots with rarities as [lng, lat] sites and skips private ones', () => {
    expect(out.added).toBe(1)
    expect(out.skippedPrivate).toBe(1)
    const wood = out.sites.find((s) => s.id === 'LTEST9')!
    expect(wood.point).toEqual([0.1, 51.4])
    expect(wood.reports[0]).toMatchObject({ speciesId: 'firecrest', notable: true, unconfirmed: false })
    expect(out.sites.some((s) => s.id === 'LTEST7')).toBe(false)
    expect(JSON.stringify(out.sites)).not.toContain('garden')
  })
  it('keeps the older ordinary record as confirmed when it is the newer one', () => {
    const o = mergeNotable([site('LTEST1', [rep(null, 'gloibi', 'Glossy Ibis', '2026-11-06')])], [{ ...raw[0], obsDt: '2026-11-03' }], dex, 30)
    expect(o.sites[0].reports[0]).toMatchObject({ obsDate: '2026-11-06', notable: true, unconfirmed: false })
  })
  it('respects the extra-site cap and the published schema', () => {
    expect(mergeNotable(base, raw, dex, 0).added).toBe(0)
    expect(() => RegionSchema.parse(region(out.sites, {}))).not.toThrow()
  })
})
