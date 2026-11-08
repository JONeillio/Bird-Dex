// Synthetic fixtures only: invented ids (LTEST…, STEST…), never real eBird data.
import { describe, expect, it } from 'vitest'
import { dexIdFor } from '../src/domain/taxon'
import { cleanHotspot, pickBetweenSites, rankHotspots, splitObsDt, toBetween, toDrive, toReports, toSite, unmatched } from '../pipeline/build'
import { RegionSchema, SiteSchema } from '../src/data/published-schema'

const dex = new Map([['Erithacus rubecula', 'european-robin'], ['Motacilla alba', 'pied-wagtail']])

describe('pipeline transforms', () => {
  it('splits eBird dates without inventing a time', () => {
    expect(splitObsDt('2026-11-05 08:10')).toEqual({ date: '2026-11-05', time: '08:10' })
    expect(splitObsDt('2026-11-05')).toEqual({ date: '2026-11-05', time: null })
    expect(splitObsDt(undefined)).toBeNull()
  })
  it('converts lat/lng fields to [lng, lat] and drops bad rows', () => {
    expect(cleanHotspot({ locId: 'L1', locName: 'Test Marsh', lat: 53.4, lng: -2.3 })?.point).toEqual([-2.3, 53.4])
    expect(cleanHotspot({ locId: 'L1', locName: 'x', lat: 'nope', lng: -2.3 })).toBeNull()
  })
  it('ranks hotspots by species then recency and caps them', () => {
    const hs = [
      { id: 'a', name: 'a', point: [0, 51] as [number, number], latestObsDate: '2026-11-01', speciesAllTime: 50 },
      { id: 'b', name: 'b', point: [0, 51] as [number, number], latestObsDate: '2026-11-05', speciesAllTime: 120 },
      { id: 'c', name: 'c', point: [0, 51] as [number, number], latestObsDate: '2026-11-06', speciesAllTime: 50 },
    ]
    expect(rankHotspots(hs, 2).map((h) => h.id)).toEqual(['b', 'c'])
  })
  it('keeps half the quota for the best local sites so far-off famous reserves do not crowd them out', () => {
    const at = (id: string, lng: number, n: number) => ({ id, name: id, point: [lng, 51.5] as [number, number], latestObsDate: '2026-11-01', speciesAllTime: n })
    const hs = [at('far1', 1.5, 300), at('far2', 1.6, 290), at('far3', 1.7, 280), at('near1', 0.0, 100), at('near2', 0.01, 90), at('near3', 0.02, 80)]
    const ids = rankHotspots(hs, 4, { centre: [0, 51.5], km: 10 }).map((h) => h.id)
    expect(ids.filter((i) => i.startsWith('near'))).toEqual(['near1', 'near2'])
    expect(ids).toHaveLength(4)
    expect(rankHotspots(hs, 4).map((h) => h.id)).toEqual(['far1', 'far2', 'far3', 'near1'])
  })
  it('joins by scientific name, falls back to the binomial, skips non-species and invalid records', () => {
    const r = toReports(
      [
        { speciesCode: 'eurrob1', comName: 'European Robin', sciName: 'Erithacus rubecula', obsDt: '2026-11-04 09:00', howMany: 2, subId: 'S000000001', obsValid: true, userDisplayName: 'Should Never Appear' } as never,
        { speciesCode: 'whiwag3', comName: 'Pied Wagtail', sciName: 'Motacilla alba yarrellii', obsDt: '2026-11-03' },
        { speciesCode: 'gull1', comName: 'gull sp.', sciName: 'Larus sp.', obsDt: '2026-11-03' },
        { speciesCode: 'mallar3', comName: 'Mallard (Domestic type)', sciName: 'Anas platyrhynchos', obsDt: '2026-11-03' },
        { speciesCode: 'bad1', comName: 'Odd', sciName: 'Oddus oddus', obsDt: '2026-11-03', obsValid: false },
        { speciesCode: 'litegr', comName: 'Little Egret', sciName: 'Egretta garzetta', obsDt: '2026-11-02', howMany: 'X' },
      ],
      dex,
    )
    expect(r.map((x) => x.speciesId)).toEqual(['european-robin', 'pied-wagtail', null])
    expect(r[0].checklistUrl).toBe('https://ebird.org/checklist/S000000001')
    expect(r[2].count).toBeNull()
    expect(JSON.stringify(r)).not.toContain('Should Never Appear')
    expect(dexIdFor('Nope nope', dex)).toBeNull()
  })
  it('builds a valid site and counts unmatched species', () => {
    const h = cleanHotspot({ locId: 'L123', locName: 'Test Reserve', lat: 51.5, lng: 0.1, latestObsDt: '2026-11-06 10:00', numSpeciesAllTime: 90 })!
    const s = toSite(h, toReports([{ speciesCode: 'litegr', comName: 'Little Egret', sciName: 'Egretta garzetta', obsDt: '2026-11-02' }], dex))
    expect(SiteSchema.parse(s).url).toBe('https://ebird.org/hotspot/L123')
    expect(unmatched([s])).toEqual([{ sciName: 'Egretta garzetta', name: 'Little Egret', sites: 1 }])
  })
  it('treats null or missing drive times as unknown, never 0', () => {
    expect(toDrive(['a', 'b', 'c'], [600.4, null], [5000, null])).toEqual({
      a: { status: 'ok', s: 600, m: 5000 }, b: { status: 'unknown' }, c: { status: 'unknown' },
    })
  })
})

describe('pipeline config', () => {
  it('has valid public start points in [lng, lat] and a file per region', async () => {
    const { readFileSync } = await import('node:fs')
    const { RegionRefSchema } = await import('../src/data/published-schema')
    const cfg = JSON.parse(readFileSync('pipeline/config/regions.json', 'utf8')) as { regions: unknown[] }
    for (const r of cfg.regions) {
      const ref = RegionRefSchema.parse(r)
      expect(ref.file).toMatch(/^region\/[a-z0-9-]+\.json$/)
      expect(ref.centre[1]).toBeGreaterThan(49)
    }
  })
})

describe('site-to-site matrix (F1)', () => {
  const rep = (speciesId: string | null, code: string) => ({
    speciesId, ebirdCode: code, name: code, sciName: 'Fakeus fakeus', obsDate: '2026-11-06', obsTime: null, count: null, checklistUrl: null, reviewed: false,
  })
  const site = (id: string, species: (string | null)[]) => ({
    id, name: id, point: [-2.3, 53.4] as [number, number], url: null, latestObsDate: null, speciesAllTime: null, access: 'unknown' as const,
    reports: species.map((s, i) => rep(s, `${id}-${i}`)),
  })
  const region = (sites: ReturnType<typeof site>[], between?: unknown) => ({
    schema: 1 as const, regionId: 'r', generatedAt: '2026-11-07T06:00:00Z', isDemo: false, windowDays: 14,
    coverage: { hotspotsListed: 0, hotspotsActive: 0, reportsFetchedFor: 0, truncated: false, note: '' },
    sites, drive: { computedAt: null, byStart: {} }, unmatchedSpecies: [], ...(between === undefined ? {} : { between }),
  })

  it('picks the sites with the most distinct Starter Dex species, ties by id, at most max', () => {
    const sites = [site('L3', ['a', 'b']), site('L1', ['a', 'b']), site('L2', ['a', 'b', 'c']), site('L4', [null, null, null, 'a']), site('L5', ['a', 'a'])]
    expect(pickBetweenSites(sites, 3).map((s) => s.id)).toEqual(['L2', 'L1', 'L3'])
    expect(pickBetweenSites(sites).map((s) => s.id)).toEqual(['L2', 'L1', 'L3', 'L4', 'L5'])
    // outside-Dex reports (null) are not counted
    expect(pickBetweenSites([site('L9', [null, null, null]), site('L8', ['a'])], 1).map((s) => s.id)).toEqual(['L8'])
  })

  it('rounds seconds, keeps the diagonal at 0, and turns null, missing or odd values into unknown', () => {
    const b = toBetween(['L1', 'L2', 'L3'], [
      [0, 600.4, null],
      [610.6, 0],
      [Number.NaN, -5, 0],
    ])
    expect(b).toEqual({
      ids: ['L1', 'L2', 'L3'],
      s: [[0, 600, null], [611, 0, null], [null, null, 0]],
    })
    // no matrix at all: everything unknown except the diagonal
    expect(toBetween(['L1', 'L2'], undefined).s).toEqual([[0, null], [null, 0]])
  })

  it('a region with a valid between parses; one without still parses', () => {
    const sites = [site('L1', ['a']), site('L2', ['a']), site('L3', ['a'])]
    expect(RegionSchema.safeParse(region(sites)).success).toBe(true)
    expect(RegionSchema.safeParse(region(sites, toBetween(['L1', 'L2'], [[0, 300], [320, 0]]))).success).toBe(true)
  })

  it('rejects a matrix that is not square, has unknown or repeated ids, or holds fractions or negatives', () => {
    const sites = [site('L1', ['a']), site('L2', ['a'])]
    const bad = (between: unknown) => RegionSchema.safeParse(region(sites, between)).success
    expect(bad({ ids: ['L1', 'L2'], s: [[0, 1]] })).toBe(false)
    expect(bad({ ids: ['L1', 'L2'], s: [[0, 1], [1]] })).toBe(false)
    expect(bad({ ids: ['L1', 'LX'], s: [[0, 1], [1, 0]] })).toBe(false)
    expect(bad({ ids: ['L1', 'L1'], s: [[0, 1], [1, 0]] })).toBe(false)
    expect(bad({ ids: ['L1', 'L2'], s: [[0, 1.5], [1, 0]] })).toBe(false)
    expect(bad({ ids: ['L1', 'L2'], s: [[0, -1], [1, 0]] })).toBe(false)
    expect(bad({ ids: ['L1', 'L2'], s: [[0, 1], [1, 0]] })).toBe(true)
  })
})
