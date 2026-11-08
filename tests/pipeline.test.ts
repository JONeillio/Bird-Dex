// Synthetic fixtures only: invented ids (LTEST…, STEST…), never real eBird data.
import { describe, expect, it } from 'vitest'
import { dexIdFor } from '../src/domain/taxon'
import { cleanHotspot, rankHotspots, splitObsDt, toDrive, toReports, toSite, unmatched } from '../pipeline/build'
import { SiteSchema } from '../src/data/published-schema'

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
